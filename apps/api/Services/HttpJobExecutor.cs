using System.Diagnostics;
using System.Text;
using Api.Models;

namespace Api.Services;

public record JobOutcome(bool Success, int? StatusCode, string? BodySnippet, string? Error, long DurationMs);

public class HttpJobExecutor
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<HttpJobExecutor> _log;
    private static readonly HashSet<string> BlockedHosts = new(StringComparer.OrdinalIgnoreCase)
    {
        "169.254.169.254", "metadata.google.internal"
    };

    public HttpJobExecutor(IHttpClientFactory httpFactory, ILogger<HttpJobExecutor> log)
    {
        _httpFactory = httpFactory;
        _log = log;
    }

    public async Task<JobOutcome> ExecuteAsync(Job job, Guid executionId, CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            if (!Uri.TryCreate(job.Url, UriKind.Absolute, out var uri) ||
                (uri.Scheme != "http" && uri.Scheme != "https"))
                return new(false, null, null, $"Invalid URL: {job.Url}", sw.ElapsedMilliseconds);

            if (BlockedHosts.Contains(uri.Host))
                return new(false, null, null, "Blocked host (cloud metadata protection).", sw.ElapsedMilliseconds);

            var client = _httpFactory.CreateClient("job-runner");
            client.Timeout = TimeSpan.FromSeconds(Math.Clamp(job.TimeoutSeconds, 2, 120));

            using var req = new HttpRequestMessage(new HttpMethod(job.Method.ToUpperInvariant()), uri);
            req.Headers.TryAddWithoutValidation("X-Job-Execution-Id", executionId.ToString());
            req.Headers.TryAddWithoutValidation("User-Agent", "Enrichly-JobRunner/1.0");

            foreach (var kv in JobValidator.ParseHeaders(job.HeadersJson))
            {
                if (kv.Key.Equals("Authorization", StringComparison.OrdinalIgnoreCase))
                    _log.LogDebug("Execution {Exec}: forwarding Authorization header (value redacted)", executionId);
                if (!req.Headers.TryAddWithoutValidation(kv.Key, kv.Value))
                    _log.LogWarning("Execution {Exec}: dropping invalid header {Key}", executionId, kv.Key);
            }

            if (!string.IsNullOrWhiteSpace(job.Body) && req.Method != HttpMethod.Get && req.Method != HttpMethod.Head)
                req.Content = new StringContent(job.Body, Encoding.UTF8, "application/json");

            using var res = await client.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);
            var body = await res.Content.ReadAsStringAsync(ct);
            sw.Stop();
            var snippet = body.Length > 4000 ? body[..4000] : body;
            if ((int)res.StatusCode is >= 200 and < 300)
                return new(true, (int)res.StatusCode, snippet, null, sw.ElapsedMilliseconds);
            return new(false, (int)res.StatusCode, snippet, $"HTTP {(int)res.StatusCode} {res.ReasonPhrase}", sw.ElapsedMilliseconds);
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            sw.Stop();
            return new(false, null, null, $"Timeout after {job.TimeoutSeconds}s: {ex.Message}", sw.ElapsedMilliseconds);
        }
        catch (HttpRequestException ex)
        {
            sw.Stop();
            return new(false, null, null, $"Request failed: {ex.Message}", sw.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            sw.Stop();
            _log.LogError(ex, "Execution {Exec}: unexpected executor error", executionId);
            return new(false, null, null, $"Unexpected error: {ex.Message}", sw.ElapsedMilliseconds);
        }
    }
}
