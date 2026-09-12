using Api.Dtos;
using Api.Services;

namespace Api.Tests;

public class JobValidatorTests
{
    [Fact]
    public void Rejects_BadUrl()
    {
        var r = new CreateJobRequest("n", null, "not-a-url", "GET", null, null, "Manual", null, true, 3, 30);
        var (ok, err) = JobValidator.ValidateCreate(r);
        Assert.False(ok);
        Assert.Contains("Url", err);
    }

    [Fact]
    public void Rejects_BadMethod()
    {
        var r = new CreateJobRequest("n", null, "https://example.com", "BREW", null, null, "Manual", null, true, 3, 30);
        var (ok, _) = JobValidator.ValidateCreate(r);
        Assert.False(ok);
    }

    [Fact]
    public void Rejects_ShortInterval()
    {
        var r = new CreateJobRequest("n", null, "https://example.com", "GET", null, null, "Interval", 10, true, 3, 30);
        var (ok, err) = JobValidator.ValidateCreate(r);
        Assert.False(ok);
        Assert.Contains("IntervalSeconds", err);
    }

    [Fact]
    public void Rejects_BadHeadersJson()
    {
        var r = new CreateJobRequest("n", null, "https://example.com", "GET", "{bad", null, "Manual", null, true, 3, 30);
        var (ok, _) = JobValidator.ValidateCreate(r);
        Assert.False(ok);
    }

    [Fact]
    public void Accepts_ValidJob()
    {
        var r = new CreateJobRequest("Sync", "desc", "https://example.com/hook", "POST",
            "{\"X-Api-Key\":\"abc\"}", "{\"a\":1}", "Interval", 3600, true, 3, 30);
        var (ok, _) = JobValidator.ValidateCreate(r);
        Assert.True(ok);
    }
}
