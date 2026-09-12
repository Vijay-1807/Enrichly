using Api.Services;

namespace Api.Tests;

public class RetryPolicyTests
{
    [Fact]
    public void Backoff_DoublesEachAttempt()
    {
        var baseDelay = TimeSpan.FromSeconds(5);
        Assert.Equal(TimeSpan.FromSeconds(5), RetryPolicy.GetDelay(1, baseDelay));
        Assert.Equal(TimeSpan.FromSeconds(10), RetryPolicy.GetDelay(2, baseDelay));
        Assert.Equal(TimeSpan.FromSeconds(20), RetryPolicy.GetDelay(3, baseDelay));
        Assert.Equal(TimeSpan.FromSeconds(40), RetryPolicy.GetDelay(4, baseDelay));
    }

    [Fact]
    public void Backoff_IsCapped()
    {
        var delay = RetryPolicy.GetDelay(20, TimeSpan.FromSeconds(5), TimeSpan.FromMinutes(5));
        Assert.Equal(TimeSpan.FromMinutes(5), delay);
    }

    [Theory]
    [InlineData(1, 3, true)]
    [InlineData(3, 3, true)]
    [InlineData(4, 3, false)]
    [InlineData(1, 0, false)]
    public void ShouldRetry_RespectsMaxRetries(int failedAttempt, int maxRetries, bool expected)
        => Assert.Equal(expected, RetryPolicy.ShouldRetry(failedAttempt, maxRetries));

    [Fact]
    public void NextRetryAt_IsInFuture()
    {
        var now = DateTime.UtcNow;
        var next = RetryPolicy.GetNextRetryAtUtc(1, now);
        Assert.True(next > now);
        Assert.Equal(now + TimeSpan.FromSeconds(5), next, TimeSpan.FromMilliseconds(50));
    }
}
