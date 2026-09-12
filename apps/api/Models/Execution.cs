namespace Api.Models;

public class Execution
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid JobId { get; set; }
    public Job? Job { get; set; }

    public ExecutionStatus Status { get; set; } = ExecutionStatus.Queued;

    /// <summary>1-based attempt counter (incremented on each claim).</summary>
    public int Attempt { get; set; } = 0;

    public string? WorkerId { get; set; }
    public DateTime? LockedAt { get; set; }
    public DateTime? HeartbeatAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? NextRetryAt { get; set; }

    public int? ResponseStatus { get; set; }
    public long? DurationMs { get; set; }
    public string? ErrorMessage { get; set; }

    /// <summary>How the execution was created: manual, schedule, retry.</summary>
    public string Trigger { get; set; } = "manual";
    public Guid? ParentExecutionId { get; set; }

    /// <summary>Client-provided idempotency key for Run Now. Unique per job.</summary>
    public string? IdempotencyKey { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ExecutionAttempt> Attempts { get; set; } = new List<ExecutionAttempt>();
    public ICollection<JobLog> Logs { get; set; } = new List<JobLog>();
}
