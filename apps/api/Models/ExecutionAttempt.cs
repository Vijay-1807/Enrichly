namespace Api.Models;

public class ExecutionAttempt
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ExecutionId { get; set; }
    public Execution? Execution { get; set; }

    public int AttemptNumber { get; set; }
    public ExecutionStatus Status { get; set; } = ExecutionStatus.Running;
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public int? ResponseStatus { get; set; }
    public string? ResponseBody { get; set; }
    public long? DurationMs { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
