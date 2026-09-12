using Api.Data;
using Api.Models;
using Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Api.Workers;

/// <summary>
/// Creates executions for due interval jobs. Uses row locking so two
/// scheduler replicas never double-schedule the same occurrence.
/// </summary>
public class JobScheduler : BackgroundService
{
    private readonly IServiceProvider _sp;
    private readonly ILogger<JobScheduler> _log;
    private readonly TimeSpan _interval;

    public JobScheduler(IServiceProvider sp, ILogger<JobScheduler> log, IConfiguration config)
    {
        _sp = sp;
        _log = log;
        _interval = TimeSpan.FromSeconds(config.GetValue("Scheduler:IntervalSeconds", 15));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(8), stoppingToken).ContinueWith(_ => { });
        _log.LogInformation("Scheduler started (every {S}s)", _interval.TotalSeconds);
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await ScheduleDueAsync(stoppingToken); }
            catch (OperationCanceledException) { break; }
            catch (Exception ex) { _log.LogError(ex, "Scheduler error"); }
            await Task.Delay(_interval, stoppingToken).ContinueWith(_ => { });
        }
    }

    private async Task ScheduleDueAsync(CancellationToken ct)
    {
        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var due = await db.Jobs.FromSqlRaw(
            @"SELECT ""Id"", ""UserId"", ""Name"", ""Description"", ""Type"", ""Url"", ""Method"", ""HeadersJson"", ""Body"", ""ScheduleMode"", ""IntervalSeconds"", ""Enabled"", ""MaxRetries"", ""TimeoutSeconds"", ""LastRunAt"", ""NextRunAt"", ""CreatedAt"", ""UpdatedAt"", ""xmin"" FROM ""jobs"" WHERE ""Enabled"" = TRUE AND ""ScheduleMode"" = 'Interval' AND (""NextRunAt"" IS NULL OR ""NextRunAt"" <= NOW()) FOR UPDATE SKIP LOCKED")
            .ToListAsync(ct);

        if (due.Count == 0) { await tx.RollbackAsync(ct); return; }

        var now = DateTime.UtcNow;
        foreach (var job in due)
        {
            if (job.IntervalSeconds is null or < 60) continue;
            var exec = new Execution
            {
                JobId = job.Id,
                Status = ExecutionStatus.Queued,
                Trigger = "schedule",
            };
            db.Executions.Add(exec);
            db.JobLogs.Add(new JobLog { ExecutionId = exec.Id, Level = "info", Message = "Scheduled run created." });
            job.LastRunAt = now;
            job.NextRunAt = now + TimeSpan.FromSeconds(job.IntervalSeconds.Value);
            _log.LogInformation("Scheduler: job {Job} ({Name}) scheduled, next at {Next}", job.Id, job.Name, job.NextRunAt);
        }
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }
}
