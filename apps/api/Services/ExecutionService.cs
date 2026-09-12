using Api.Data;
using Api.Dtos;
using Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Api.Services;

public class ExecutionService
{
    private readonly AppDbContext _db;
    private readonly ILogger<ExecutionService> _log;

    public ExecutionService(AppDbContext db, ILogger<ExecutionService> log)
    {
        _db = db;
        _log = log;
    }

    public async Task<(Execution Exec, bool Created)> CreateExecutionAsync(
        Job job, string trigger, string? idempotencyKey = null,
        Guid? parentExecutionId = null, CancellationToken ct = default)
    {
        idempotencyKey = string.IsNullOrWhiteSpace(idempotencyKey) ? null : idempotencyKey.Trim();

        if (idempotencyKey is not null)
        {
            var existing = await _db.Executions
                .FirstOrDefaultAsync(e => e.JobId == job.Id && e.IdempotencyKey == idempotencyKey, ct);
            if (existing is not null) return (existing, false);
        }

        var exec = new Execution
        {
            JobId = job.Id,
            Status = ExecutionStatus.Queued,
            Attempt = 0,
            Trigger = trigger,
            ParentExecutionId = parentExecutionId,
            IdempotencyKey = idempotencyKey,
        };
        _db.Executions.Add(exec);
        _db.JobLogs.Add(new JobLog
        {
            ExecutionId = exec.Id,
            Level = "info",
            Message = $"Execution created via {trigger}."
        });
        try
        {
            await _db.SaveChangesAsync(ct);
            job.LastRunAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return (exec, true);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex) && idempotencyKey is not null)
        {
            // Lost a race with another identical request: return the winner.
            _db.ChangeTracker.Clear();
            var winner = await _db.Executions
                .FirstAsync(e => e.JobId == job.Id && e.IdempotencyKey == idempotencyKey, ct);
            _log.LogInformation("Idempotent replay: job {JobId} key {Key} -> execution {ExecId}",
                job.Id, idempotencyKey, winner.Id);
            return (winner, false);
        }
    }

    public async Task<Execution> RetryAsync(Execution failed, CancellationToken ct = default)
    {
        if (failed.Status is not (ExecutionStatus.Failed or ExecutionStatus.Cancelled))
            throw new InvalidOperationException("Only failed or cancelled executions can be retried.");
        var job = await _db.Jobs.FirstAsync(j => j.Id == failed.JobId, ct);
        var (exec, _) = await CreateExecutionAsync(job, "retry", parentExecutionId: failed.Id, ct: ct);
        _log.LogInformation("Retry: execution {Old} -> {New} for job {JobId}", failed.Id, exec.Id, job.Id);
        return exec;
    }

    public async Task<bool> CancelAsync(Execution exec, CancellationToken ct = default)
    {
        if (exec.Status is ExecutionStatus.Success or ExecutionStatus.Failed or ExecutionStatus.Cancelled)
            return false;
        var from = exec.Status;
        ExecutionTransitions.EnsureValid(from, ExecutionStatus.Cancelled);
        exec.Status = ExecutionStatus.Cancelled;
        exec.CompletedAt = DateTime.UtcNow;
        exec.ErrorMessage = "Cancelled by user.";
        _db.JobLogs.Add(new JobLog { ExecutionId = exec.Id, Level = "warn", Message = "Cancelled by user." });
        await _db.SaveChangesAsync(ct);
        return true;
    }

    private static bool IsUniqueViolation(DbUpdateException ex)
        => ex.InnerException != null &&
           (ex.InnerException.Message.Contains("duplicate key", StringComparison.OrdinalIgnoreCase)
            || ex.InnerException.Message.Contains("unique", StringComparison.OrdinalIgnoreCase)
            || ex.InnerException.Message.Contains("23505"));

    public static ExecutionSummary ToSummary(Execution e, string jobName) => new(
        e.Id, e.JobId, jobName, e.Status.ToString(), e.Attempt,
        e.WorkerId, e.ResponseStatus, e.DurationMs, Truncate(e.ErrorMessage, 300),
        e.Trigger, e.StartedAt, e.CompletedAt, e.CreatedAt);

    public static string? Truncate(string? s, int max)
        => s is null ? null : (s.Length <= max ? s : s[..max] + "…");
}
