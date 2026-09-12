using System.ComponentModel.DataAnnotations;

namespace Api.Models;

public class Job
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User? User { get; set; }

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Description { get; set; }

    /// <summary>Job type. MVP supports "http". Reserved for future types.</summary>
    [MaxLength(50)]
    public string Type { get; set; } = "http";

    [Required, MaxLength(2000)]
    public string Url { get; set; } = string.Empty;

    [MaxLength(10)]
    public string Method { get; set; } = "GET";

    /// <summary>JSON object string, e.g. {"Authorization":"Bearer ..."}. Stored as text.</summary>
    public string? HeadersJson { get; set; }

    public string? Body { get; set; }

    public ScheduleMode ScheduleMode { get; set; } = ScheduleMode.Manual;

    /// <summary>Interval in seconds when ScheduleMode == Interval.</summary>
    public int? IntervalSeconds { get; set; }

    public bool Enabled { get; set; } = true;

    /// <summary>Max retries after the first attempt. 0 = no retry.</summary>
    [Range(0, 10)]
    public int MaxRetries { get; set; } = 3;

    [Range(2, 120)]
    public int TimeoutSeconds { get; set; } = 30;

    public DateTime? LastRunAt { get; set; }
    public DateTime? NextRunAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Optimistic concurrency token (maps to Postgres xmin).</summary>
    [Timestamp]
    public uint RowVersion { get; set; }

    public ICollection<Execution> Executions { get; set; } = new List<Execution>();
}
