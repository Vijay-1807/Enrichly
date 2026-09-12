using Api.Data;
using Api.Hubs;
using Api.Models;
using Api.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Api.Workers;

/// <summary>
/// Competing-consumer worker. Multiple replicas can run: the atomic
/// SELECT ... FOR UPDATE SKIP LOCKED claim guarantees one worker owns an execution.
/// PostgreSQL is the source of truth; no Redis needed at this scale (see ENGINEERING.md).
/// </summary>
public class JobWorker : BackgroundService
{
    private readonly IServiceProvider _sp;
    private readonly ILogger<JobWorker> _log;
    private readonly string _workerId;
    private readonly TimeSpan _pollInterval;
    private readonly TimeSpan _staleTimeout;

    public JobWorker(IServiceProvider sp, ILogger<JobWorker> log, IConfiguration config)
    {
        _sp = sp;
        _log = log;
        _workerId = $"{Environment.MachineName}:{Guid.NewGuid().ToString("N")[..8]}";
        _pollInterval = TimeSpan.FromSeconds(config.GetValue("Worker:PollIntervalSeconds", 2));
        _staleTimeout = TimeSpan.FromSeconds(config.GetValue("Worker:StaleTimeoutSeconds", 120));
        _log.LogInformation("Worker {WorkerId} initialized (poll {Poll}s, stale {Stale}s)",
            _workerId, _pollInterval.TotalSeconds, _staleTimeout.TotalSeconds);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Small startup delay so migrations + API boot first.
        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken).ContinueWith(_ => { });
        _log.LogInformation("Worker {WorkerId} started", _workerId);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await HeartbeatAsync(stoppingToken);
                await RecoverStaleAsync(stoppingToken);
                var claimedId = await TryClaimOneAsync(stoppingToken);
                if (claimedId is null)
                {
                    await Task.Delay(_pollInterval, stoppingToken);
                    continue;
                }
                await ProcessAsync(claimedId.Value, stoppingToken);
            }
            catch (OperationCanceledException) { break; }
            catch (Exception ex)
            {
                _log.LogError(ex, "Worker {WorkerId}: loop error", _workerId);
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken).ContinueWith(_ => { });
            }
        }
        await UnregisterAsync();
        _log.LogInformation("Worker {WorkerId} stopped", _workerId);
    }

    /// <summary>Upsert this worker's liveness row; prune rows unseen for 10+ minutes.</summary>
    private async Task HeartbeatAsync(CancellationToken ct)
    {
        try
        {
            using var scope = _sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var row = await db.WorkerHeartbeats.FindAsync(new object[] { _workerId }, ct);
            if (row is null)
            {
                db.WorkerHeartbeats.Add(new WorkerHeartbeat { WorkerId = _workerId, StartedAt = DateTime.UtcNow, LastSeenAt = DateTime.UtcNow });
            }
            else row.LastSeenAt = DateTime.UtcNow;
            var cutoff = DateTime.UtcNow - TimeSpan.FromMinutes(10);
            await db.WorkerHeartbeats.Where(w => w.LastSeenAt < cutoff).ExecuteDeleteAsync(ct);
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _log.LogDebug(ex, "Worker {WorkerId}: heartbeat write failed (non-fatal)", _workerId);
        }
    }

    private async Task UnregisterAsync()
    {
        try
        {
            using var scope = _sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.WorkerHeartbeats.Where(w => w.WorkerId == _workerId).ExecuteDeleteAsync();
            await db.SaveChangesAsync();
        }
        catch { /* shutting down; best effort */ }
    }

    private async Task RecoverStaleAsync(CancellationToken ct)
    {
        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var cutoff = DateTime.UtcNow - _staleTimeout;
        var stale = await db.Executions
            .Where(e => e.Status == ExecutionStatus.Running && e.HeartbeatAt != null && e.HeartbeatAt < cutoff)
            .ToListAsync(ct);
        foreach (var e in stale)
        {
            _log.LogWarning("Worker {W}: recovering stale execution {Exec} (worker {Old}, heartbeat {Hb})",
                _workerId, e.Id, e.WorkerId, e.HeartbeatAt);
            e.Status = ExecutionStatus.Queued; // Running -> Queued is a legal retry/recovery transition
            e.WorkerId = null;
            e.LockedAt = null;
            e.HeartbeatAt = null;
            e.NextRetryAt = null;
            db.JobLogs.Add(new JobLog { ExecutionId = e.Id, Level = "warn", Message = $"Stale worker recovery (previous worker {e.WorkerId ?? "?"}). Requeued." });
        }
        if (stale.Count > 0) await db.SaveChangesAsync(ct);
    }

    /// <summary>Atomically claim one queued execution. Returns null when queue is empty.</summary>
    private async Task<Guid?> TryClaimOneAsync(CancellationToken ct)
    {
        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var candidate = await db.Executions.FromSqlRaw(
            @"SELECT ""Id"", ""JobId"", ""Status"", ""Attempt"", ""WorkerId"", ""LockedAt"", ""HeartbeatAt"", ""StartedAt"", ""CompletedAt"", ""NextRetryAt"", ""ResponseStatus"", ""DurationMs"", ""ErrorMessage"", ""Trigger"", ""ParentExecutionId"", ""IdempotencyKey"", ""CreatedAt"" FROM ""executions"" WHERE ""Status"" = 'Queued' AND (""NextRetryAt"" IS NULL OR ""NextRetryAt"" <= NOW()) ORDER BY ""CreatedAt"" LIMIT 1 FOR UPDATE SKIP LOCKED")
            .FirstOrDefaultAsync(ct);

        if (candidate is null)
        {
            await tx.RollbackAsync(ct);
            return null;
        }

        candidate.Status = ExecutionStatus.Running;
        candidate.Attempt += 1;
        candidate.WorkerId = _workerId;
        candidate.LockedAt = DateTime.UtcNow;
        candidate.HeartbeatAt = DateTime.UtcNow;
        candidate.StartedAt ??= DateTime.UtcNow;
        candidate.NextRetryAt = null;
        db.JobLogs.Add(new JobLog
        {
            ExecutionId = candidate.Id,
            Level = "info",
            Message = $"Claimed by {_workerId} (attempt {candidate.Attempt})."
        });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        _log.LogInformation("Worker {W}: claimed execution {Exec} (attempt {A})", _workerId, candidate.Id, candidate.Attempt);
        return candidate.Id;
    }

    private async Task ProcessAsync(Guid executionId, CancellationToken ct)
    {
        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var executor = scope.ServiceProvider.GetRequiredService<HttpJobExecutor>();

        var exec = await db.Executions.Include(e => e.Job).FirstOrDefaultAsync(e => e.Id == executionId, ct);
        if (exec is null || exec.Job is null) return;
        var job = exec.Job;
        var attemptNo = exec.Attempt;

        var attempt = new ExecutionAttempt
        {
            ExecutionId = exec.Id,
            AttemptNumber = attemptNo,
            Status = ExecutionStatus.Running,
            StartedAt = DateTime.UtcNow,
        };
        db.ExecutionAttempts.Add(attempt);
        await db.SaveChangesAsync(ct);

        JobOutcome outcome;
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(ct);
        linked.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(job.TimeoutSeconds + 5, 5, 130)));
        try
        {
            outcome = await executor.ExecuteAsync(job, exec.Id, linked.Token);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            outcome = new(false, null, null, "Execution timed out.", 0);
        }

        // Re-read: user may have cancelled while we were running.
        await db.Entry(exec).ReloadAsync(ct);
        if (exec.Status == ExecutionStatus.Cancelled)
        {
            attempt.Status = ExecutionStatus.Cancelled;
            attempt.CompletedAt = DateTime.UtcNow;
            attempt.ErrorMessage = "Cancelled by user during run.";
            db.JobLogs.Add(new JobLog { ExecutionId = exec.Id, Level = "warn", Message = "Run finished after cancel; keeping Cancelled." });
            await db.SaveChangesAsync(ct);
            await BroadcastAsync(exec, ct);
            return;
        }

        attempt.CompletedAt = DateTime.UtcNow;
        attempt.ResponseStatus = outcome.StatusCode;
        attempt.ResponseBody = outcome.BodySnippet;
        attempt.DurationMs = outcome.DurationMs;
        attempt.ErrorMessage = outcome.Error;

        exec.HeartbeatAt = DateTime.UtcNow;
        exec.DurationMs = outcome.DurationMs;
        exec.ResponseStatus = outcome.StatusCode;

        if (outcome.Success)
        {
            attempt.Status = ExecutionStatus.Success;
            exec.Status = ExecutionStatus.Success;
            exec.CompletedAt = DateTime.UtcNow;
            exec.ErrorMessage = null;
            job.LastRunAt = DateTime.UtcNow;
            db.JobLogs.Add(new JobLog
            {
                ExecutionId = exec.Id,
                Level = "info",
                Message = $"Attempt {attemptNo} succeeded (HTTP {outcome.StatusCode}) in {outcome.DurationMs}ms."
            });
            _log.LogInformation("Worker {W}: execution {Exec} SUCCESS in {Ms}ms", _workerId, exec.Id, outcome.DurationMs);
        }
        else
        {
            attempt.Status = ExecutionStatus.Failed;
            exec.ErrorMessage = ExecutionService.Truncate(outcome.Error, 1000);
            if (RetryPolicy.ShouldRetry(attemptNo, job.MaxRetries))
            {
                var next = RetryPolicy.GetNextRetryAtUtc(attemptNo);
                exec.Status = ExecutionStatus.Queued; // Running -> Queued (retry)
                exec.NextRetryAt = next;
                exec.WorkerId = null;
                db.JobLogs.Add(new JobLog
                {
                    ExecutionId = exec.Id,
                    Level = "warn",
                    Message = $"Attempt {attemptNo} failed: {outcome.Error} Next retry at {next:O}."
                });
                _log.LogWarning("Worker {W}: execution {Exec} failed (attempt {A}), retry at {Next}: {Err}",
                    _workerId, exec.Id, attemptNo, next, outcome.Error);
            }
            else
            {
                exec.Status = ExecutionStatus.Failed;
                exec.CompletedAt = DateTime.UtcNow;
                db.JobLogs.Add(new JobLog
                {
                    ExecutionId = exec.Id,
                    Level = "error",
                    Message = $"Attempt {attemptNo} failed (final): {outcome.Error}"
                });
                _log.LogWarning("Worker {W}: execution {Exec} FAILED finally after {A} attempts: {Err}",
                    _workerId, exec.Id, attemptNo, outcome.Error);
            }
        }
        await db.SaveChangesAsync(ct);

        // Processed-count for the health UI (separate save so execution finality is never blocked).
        try
        {
            var hb = await db.WorkerHeartbeats.FindAsync(new object[] { _workerId }, ct);
            if (hb is not null) { hb.ProcessedCount++; await db.SaveChangesAsync(ct); }
        }
        catch (Exception ex) { _log.LogDebug(ex, "Processed-count bump failed (non-fatal)"); }

        await BroadcastAsync(exec, ct);

        // Webhook notification on terminal state (never fails the execution).
        if (exec.Status is ExecutionStatus.Success or ExecutionStatus.Failed
            && NotificationService.ShouldNotify(job, exec.Status))
        {
            await NotifyAsync(db, job, exec, ct);
        }
    }

    private async Task BroadcastAsync(Execution exec, CancellationToken ct)
    {
        try
        {
            using var scope = _sp.CreateScope();
            var hub = scope.ServiceProvider.GetRequiredService<IHubContext<ExecutionHub>>();
            var payload = ExecutionHubEvents.Payload(exec.Id, exec.JobId, exec.Status.ToString(), exec.Attempt);
            var userId = exec.Job?.UserId;
            if (userId.HasValue)
                await hub.Clients.Group(ExecutionHubEvents.UserGroup(userId.Value)).SendAsync("executionUpdated", payload, ct);
            await hub.Clients.Group($"execution:{exec.Id}").SendAsync("executionUpdated", payload, ct);
        }
        catch (Exception ex)
        {
            _log.LogDebug(ex, "Broadcast failed for execution {Exec} (non-fatal)", exec.Id);
        }
    }

    private async Task NotifyAsync(AppDbContext db, Job job, Execution exec, CancellationToken ct)
    {
        try
        {
            using var scope = _sp.CreateScope();
            var notifier = scope.ServiceProvider.GetRequiredService<NotificationService>();
            var (ok, error) = await notifier.SendAsync(job, exec, ct);
            db.JobLogs.Add(new JobLog
            {
                ExecutionId = exec.Id,
                Level = ok ? "info" : "warn",
                Message = ok ? $"Notification delivered to {job.NotificationUrl}." : $"Notification failed: {error}",
            });
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Notify step failed for execution {Exec} (non-fatal)", exec.Id);
        }
    }
}
