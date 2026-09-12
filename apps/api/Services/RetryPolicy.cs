namespace Api.Services;

/// <summary>
/// Exponential backoff for retries. Pure + unit-tested.
/// delay = baseDelay * 2^(attempt-1), capped at maxDelay.
/// attempt is 1-based (the attempt that just failed).
/// </summary>
public static class RetryPolicy
{
    public static TimeSpan GetDelay(int failedAttempt, TimeSpan? baseDelay = null, TimeSpan? maxDelay = null)
    {
        var @base = baseDelay ?? TimeSpan.FromSeconds(5);
        var max = maxDelay ?? TimeSpan.FromMinutes(5);
        if (failedAttempt < 1) failedAttempt = 1;
        var multiplier = Math.Pow(2, failedAttempt - 1);
        var delay = TimeSpan.FromMilliseconds(@base.TotalMilliseconds * multiplier);
        return delay > max ? max : delay;
    }

    public static DateTime GetNextRetryAtUtc(int failedAttempt, DateTime? nowUtc = null)
        => (nowUtc ?? DateTime.UtcNow) + GetDelay(failedAttempt);

    public static bool ShouldRetry(int failedAttempt, int maxRetries)
        => failedAttempt <= maxRetries;
    // failedAttempt=1 with maxRetries=3 => retry (attempt 2 next). attempt is completed count.
}
