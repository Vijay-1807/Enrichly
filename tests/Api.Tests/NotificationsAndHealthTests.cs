using Api.Hubs;
using Api.Models;
using Api.Services;

namespace Api.Tests;

public class NotificationsAndHealthTests
{
    private static Job JobWith(string notifyOn, string? url = "https://example.com/hook")
        => new() { UserId = Guid.NewGuid(), Name = "j", Url = "https://example.com", Method = "GET", NotifyOn = notifyOn, NotificationUrl = url };

    [Theory]
    [InlineData("None", "Failed", false)]
    [InlineData("None", "Success", false)]
    [InlineData("Failed", "Failed", true)]
    [InlineData("Failed", "Success", false)]
    [InlineData("Success", "Failed", false)]
    [InlineData("Success", "Success", true)]
    [InlineData("All", "Failed", true)]
    [InlineData("All", "Success", true)]
    public void ShouldNotify_Matrix(string notifyOn, string terminal, bool expected)
    {
        var status = Enum.Parse<ExecutionStatus>(terminal);
        Assert.Equal(expected, NotificationService.ShouldNotify(JobWith(notifyOn), status));
    }

    [Fact]
    public void ShouldNotify_RequiresUrl()
    {
        var job = JobWith("All", null);
        Assert.False(NotificationService.ShouldNotify(job, ExecutionStatus.Failed));
    }

    [Fact]
    public void BuildPayload_ContainsEvidence()
    {
        var job = JobWith("All");
        var exec = new Execution { Id = Guid.NewGuid(), JobId = job.Id, Status = ExecutionStatus.Failed, Attempt = 3, Trigger = "manual", ResponseStatus = 500, DurationMs = 120, ErrorMessage = "boom" };
        var json = System.Text.Json.JsonSerializer.Serialize(NotificationService.BuildPayload(job, exec));
        Assert.Contains("job.failed", json);
        Assert.Contains(exec.Id.ToString(), json);
        Assert.Contains("boom", json);
    }

    [Theory]
    [InlineData(10, true)]
    [InlineData(60, true)]
    [InlineData(61, false)]
    [InlineData(3600, false)]
    public void IsWorkerAlive_Window(int secondsAgo, bool expected)
    {
        var now = DateTime.UtcNow;
        Assert.Equal(expected, ExecutionHubEvents.IsWorkerAlive(now - TimeSpan.FromSeconds(secondsAgo), now, TimeSpan.FromSeconds(60)));
    }

    [Fact]
    public void NormalizeNotifyOn_FallsBackToNone()
    {
        Assert.Equal("None", JobValidator.NormalizeNotifyOn(null));
        Assert.Equal("None", JobValidator.NormalizeNotifyOn("bogus"));
        Assert.Equal("Failed", JobValidator.NormalizeNotifyOn("Failed"));
    }
}
