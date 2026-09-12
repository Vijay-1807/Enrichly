using System.Text;
using System.Text.Json;
using Api.Models;

namespace Api.Services;

/// <summary>
/// Webhook notifications: when an execution reaches a terminal state the worker
/// POSTs a JSON payload to the job's NotificationUrl (if configured + matching NotifyOn).
/// Failures to deliver never fail the execution — they are logged.
/// </summary>
public class NotificationService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<NotificationService> _log;

    public NotificationService(IHttpClientFactory httpFactory, ILogger<NotificationService> log)
    {
        _httpFactory = httpFactory;
        _log = log;
    }

    public static bool ShouldNotify(Job job, ExecutionStatus terminal)
        => !string.IsNullOrWhiteSpace(job.NotificationUrl) && job.NotifyOn switch
        {
            "All" => terminal is ExecutionStatus.Success or ExecutionStatus.Failed,
            "Failed" => terminal == ExecutionStatus.Failed,
            "Success" => terminal == ExecutionStatus.Success,
            _ => false,
        };

    public static object BuildPayload(Job job, Execution exec) => new
    {
        @event = $"job.{exec.Status.ToString().ToLowerInvariant()}",
        jobId = job.Id,
        jobName = job.Name,
        executionId = exec.Id,
        status = exec.Status.ToString(),
        attempt = exec.Attempt,
        trigger = exec.Trigger,
        responseStatus = exec.ResponseStatus,
        durationMs = exec.DurationMs,
        error = exec.ErrorMessage,
        at = DateTime.UtcNow,
    };

    public async Task<(bool Delivered, string? Error)> SendAsync(Job job, Execution exec, CancellationToken ct = default)
    {
        try
        {
            if (!Uri.TryCreate(job.NotificationUrl, UriKind.Absolute, out var uri) ||
                (uri.Scheme != "http" && uri.Scheme != "https"))
                return (false, $"Invalid NotificationUrl: {job.NotificationUrl}");

            var client = _httpFactory.CreateClient("job-runner");
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(10));
            var json = JsonSerializer.Serialize(BuildPayload(job, exec));
            using var res = await client.PostAsync(uri, new StringContent(json, Encoding.UTF8, "application/json"), cts.Token);
            if (res.IsSuccessStatusCode) return (true, null);
            return (false, $"Notification endpoint returned HTTP {(int)res.StatusCode}");
        }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Notification delivery failed for execution {Exec}", exec.Id);
            return (false, $"Notification delivery failed: {ex.Message}");
        }
    }
}
