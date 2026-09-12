using System.Text.Json;
using Api.Dtos;

namespace Api.Services;

public static class JobValidator
{
    private static readonly HashSet<string> Verbs = new(StringComparer.OrdinalIgnoreCase)
        { "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS" };

    public static (bool Ok, string? Error) ValidateCreate(CreateJobRequest r)
    {
        if (!Verbs.Contains(r.Method ?? "GET")) return (false, "Method must be a valid HTTP verb.");
        if (!Uri.TryCreate(r.Url, UriKind.Absolute, out var u) || (u.Scheme != "http" && u.Scheme != "https"))
            return (false, "Url must be an absolute http(s) URL.");
        if (!Enum.TryParse<Models.ScheduleMode>(r.ScheduleMode, true, out var mode))
            return (false, "ScheduleMode must be Manual or Interval.");
        if (mode == Models.ScheduleMode.Interval && (r.IntervalSeconds is null || r.IntervalSeconds < 60))
            return (false, "IntervalSeconds must be >= 60 for interval jobs.");
        if (r.HeadersJson is not null && !IsJsonObject(r.HeadersJson, out var hErr))
            return (false, $"HeadersJson must be a JSON object. {hErr}");
        if ((string.Equals(r.Method, "GET", StringComparison.OrdinalIgnoreCase) || string.Equals(r.Method, "HEAD", StringComparison.OrdinalIgnoreCase)) && !string.IsNullOrWhiteSpace(r.Body))
            return (false, "GET/HEAD requests should not have a body.");
        var notifyOn = string.IsNullOrWhiteSpace(r.NotifyOn) ? "None" : r.NotifyOn.Trim();
        if (notifyOn is not ("None" or "Failed" or "Success" or "All"))
            return (false, "NotifyOn must be None, Failed, Success, or All.");
        if (!string.IsNullOrWhiteSpace(r.NotificationUrl))
        {
            if (!Uri.TryCreate(r.NotificationUrl.Trim(), UriKind.Absolute, out var nu) || (nu.Scheme != "http" && nu.Scheme != "https"))
                return (false, "NotificationUrl must be an absolute http(s) URL.");
            if (notifyOn == "None")
                return (false, "NotifyOn must be Failed, Success, or All when NotificationUrl is set.");
        }
        return (true, null);
    }

    public static (bool Ok, string? Error) ValidateUpdate(UpdateJobRequest r)
        => ValidateCreate(new CreateJobRequest(r.Name, r.Description, r.Url, r.Method, r.HeadersJson, r.Body, r.ScheduleMode, r.IntervalSeconds, r.Enabled, r.MaxRetries, r.TimeoutSeconds, r.NotificationUrl, r.NotifyOn));

    public static string NormalizeNotifyOn(string? v)
        => v?.Trim() is "Failed" or "Success" or "All" ? v.Trim() : "None";

    private static bool IsJsonObject(string s, out string? err)
    {
        err = null;
        if (string.IsNullOrWhiteSpace(s)) return true;
        try
        {
            using var doc = JsonDocument.Parse(s);
            if (doc.RootElement.ValueKind != JsonValueKind.Object) { err = "Not an object."; return false; }
            return true;
        }
        catch (Exception ex) { err = ex.Message; return false; }
    }

    public static Dictionary<string, string> ParseHeaders(string? json)
    {
        var out_ = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(json)) return out_;
        try
        {
            var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
            if (dict is null) return out_;
            foreach (var kv in dict) out_[kv.Key] = kv.Value?.ToString() ?? string.Empty;
        }
        catch { /* validated earlier; be lenient at runtime */ }
        return out_;
    }
}
