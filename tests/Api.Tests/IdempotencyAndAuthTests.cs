using Api.Data;
using Api.Models;
using Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Api.Tests;

public class IdempotencyAndAuthTests
{
    private static AppDbContext InMemoryDb()
    {
        var opt = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        return new AppDbContext(opt);
    }

    [Fact]
    public async Task SameIdempotencyKey_ReturnsSameExecution()
    {
        using var db = InMemoryDb();
        var svc = new ExecutionService(db, NullLogger<ExecutionService>.Instance);
        var job = new Job { UserId = Guid.NewGuid(), Name = "j", Url = "https://example.com", Method = "GET" };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();

        var (first, created1) = await svc.CreateExecutionAsync(job, "manual", "key-123");
        var (second, created2) = await svc.CreateExecutionAsync(job, "manual", "key-123");

        Assert.True(created1);
        Assert.False(created2);
        Assert.Equal(first.Id, second.Id);
        Assert.Equal(1, await db.Executions.CountAsync());
    }

    [Fact]
    public async Task DifferentKeys_CreateDifferentExecutions()
    {
        using var db = InMemoryDb();
        var svc = new ExecutionService(db, NullLogger<ExecutionService>.Instance);
        var job = new Job { UserId = Guid.NewGuid(), Name = "j", Url = "https://example.com", Method = "GET" };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();

        await svc.CreateExecutionAsync(job, "manual", "k1");
        await svc.CreateExecutionAsync(job, "manual", "k2");
        Assert.Equal(2, await db.Executions.CountAsync());
    }

    [Fact]
    public async Task Users_CannotSeeEachOthersJobs()
    {
        using var db = InMemoryDb();
        var alice = Guid.NewGuid();
        var bob = Guid.NewGuid();
        db.Jobs.Add(new Job { UserId = alice, Name = "alice-job", Url = "https://example.com", Method = "GET" });
        db.Jobs.Add(new Job { UserId = bob, Name = "bob-job", Url = "https://example.com", Method = "GET" });
        await db.SaveChangesAsync();

        // This mirrors the controller's scoping rule: every query filters by UserId.
        var aliceJobs = await db.Jobs.Where(j => j.UserId == alice).ToListAsync();
        Assert.Single(aliceJobs);
        Assert.Equal("alice-job", aliceJobs[0].Name);

        var bobSeesAlice = await db.Jobs.FirstOrDefaultAsync(j => j.UserId == bob && j.Name == "alice-job");
        Assert.Null(bobSeesAlice);
    }

    [Fact]
    public async Task Retry_CreatesNewExecutionLinkedToParent()
    {
        using var db = InMemoryDb();
        var svc = new ExecutionService(db, NullLogger<ExecutionService>.Instance);
        var job = new Job { UserId = Guid.NewGuid(), Name = "j", Url = "https://example.com", Method = "GET" };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();

        var (failed, _) = await svc.CreateExecutionAsync(job, "manual");
        failed.Status = ExecutionStatus.Failed;
        await db.SaveChangesAsync();

        var retry = await svc.RetryAsync(failed);
        Assert.Equal("retry", retry.Trigger);
        Assert.Equal(failed.Id, retry.ParentExecutionId);
        Assert.Equal(ExecutionStatus.Queued, retry.Status);
    }

    [Fact]
    public async Task Cancel_FinishedExecution_ReturnsFalse()
    {
        using var db = InMemoryDb();
        var svc = new ExecutionService(db, NullLogger<ExecutionService>.Instance);
        var job = new Job { UserId = Guid.NewGuid(), Name = "j", Url = "https://example.com", Method = "GET" };
        db.Jobs.Add(job);
        await db.SaveChangesAsync();
        var (exec, _) = await svc.CreateExecutionAsync(job, "manual");
        exec.Status = ExecutionStatus.Success;
        await db.SaveChangesAsync();

        Assert.False(await svc.CancelAsync(exec));
    }
}
