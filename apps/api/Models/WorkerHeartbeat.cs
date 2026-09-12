namespace Api.Models;

/// <summary>
/// One row per live worker process. Workers upsert their heartbeat regularly;
/// rows older than the liveness window are shown as stale/offline.
/// </summary>
public class WorkerHeartbeat
{
    public string WorkerId { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;
    public string Version { get; set; } = "1.0.0";
    public long ProcessedCount { get; set; }
}
