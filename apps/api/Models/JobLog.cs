namespace Api.Models;

public class JobLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ExecutionId { get; set; }
    public Execution? Execution { get; set; }

    public string Level { get; set; } = "info";
    public string Message { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
