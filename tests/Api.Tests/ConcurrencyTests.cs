using Api.Data;
using Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Api.Tests;

/// <summary>
/// Documents the atomic-claim guarantee. Runs against real PostgreSQL when
/// TEST_DATABASE_URL is set; otherwise skipped (CI without docker).
/// Proves: two workers racing on one QUEUED row -> exactly one wins.
/// </summary>
public class ConcurrencyTests
{
    [Fact]
    public async Task TwoWorkers_CannotClaimSameExecution()
    {
        var cs = Environment.GetEnvironmentVariable("TEST_DATABASE_URL");
        if (string.IsNullOrWhiteSpace(cs))
            return; // skip: needs real Postgres FOR UPDATE SKIP LOCKED semantics

        var opts = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(cs).Options;
        using var setup = new AppDbContext(opts);
        await setup.Database.EnsureCreatedAsync();
        var job = new Job { UserId = Guid.NewGuid(), Name = "race", Url = "https://example.com", Method = "GET" };
        setup.Jobs.Add(job);
        var exec = new Execution { JobId = job.Id, Status = ExecutionStatus.Queued };
        setup.Executions.Add(exec);
        await setup.SaveChangesAsync();

        async Task<Guid?> ClaimAsync(string worker)
        {
            using var db = new AppDbContext(opts);
            await using var tx = await db.Database.BeginTransactionAsync();
            var c = await db.Executions.FromSqlRaw(
                @"SELECT ""Id"", ""JobId"", ""Status"", ""Attempt"", ""WorkerId"", ""LockedAt"", ""HeartbeatAt"", ""StartedAt"", ""CompletedAt"", ""NextRetryAt"", ""ResponseStatus"", ""DurationMs"", ""ErrorMessage"", ""Trigger"", ""ParentExecutionId"", ""IdempotencyKey"", ""CreatedAt"" FROM ""executions"" WHERE ""Id"" = {0} AND ""Status"" = 'Queued' FOR UPDATE SKIP LOCKED", exec.Id)
                .FirstOrDefaultAsync();
            if (c is null) { await tx.RollbackAsync(); return null; }
            await Task.Delay(100); // widen the race window
            c.Status = ExecutionStatus.Running;
            c.WorkerId = worker;
            await db.SaveChangesAsync();
            await tx.CommitAsync();
            return c.Id;
        }

        var t1 = ClaimAsync("w1");
        var t2 = ClaimAsync("w2");
        var results = await Task.WhenAll(t1, t2);
        var wins = results.Count(r => r is not null);
        Assert.Equal(1, wins);

        using var verify = new AppDbContext(opts);
        var final = await verify.Executions.FindAsync(exec.Id);
        Assert.Equal(ExecutionStatus.Running, final!.Status);

        // cleanup
        verify.Jobs.Remove(job);
        await verify.SaveChangesAsync();
    }
}
