using System.ComponentModel.DataAnnotations;
using Api.Models;

namespace Api.Dtos;

// ---------- Auth ----------
public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(8)] string Password);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

public record AuthResponse(Guid Id, string Email, string Token);

// ---------- Jobs ----------
public record CreateJobRequest(
    [Required, MaxLength(200)] string Name,
    [MaxLength(2000)] string? Description,
    [Required, Url] string Url,
    string Method,
    string? HeadersJson,
    string? Body,
    string ScheduleMode,
    int? IntervalSeconds,
    bool Enabled,
    [Range(0, 10)] int MaxRetries,
    [Range(2, 120)] int TimeoutSeconds,
    string? NotificationUrl,
    string NotifyOn);

public record UpdateJobRequest(
    [Required, MaxLength(200)] string Name,
    [MaxLength(2000)] string? Description,
    [Required, Url] string Url,
    string Method,
    string? HeadersJson,
    string? Body,
    string ScheduleMode,
    int? IntervalSeconds,
    bool Enabled,
    [Range(0, 10)] int MaxRetries,
    [Range(2, 120)] int TimeoutSeconds,
    string? RowVersion,
    string? NotificationUrl,
    string NotifyOn);

public record JobResponse(
    Guid Id, string Name, string? Description, string Type, string Url, string Method,
    string? HeadersJson, string? Body, string ScheduleMode, int? IntervalSeconds,
    bool Enabled, int MaxRetries, int TimeoutSeconds,
    string? NotificationUrl, string NotifyOn,
    DateTime? LastRunAt, DateTime? NextRunAt,
    DateTime CreatedAt, DateTime UpdatedAt, string? RowVersion,
    ExecutionStatus? LastStatus, int TotalExecutions, int FailedExecutions, double? SuccessRate);

// ---------- Executions ----------
public record ExecutionSummary(
    Guid Id, Guid JobId, string JobName, string Status, int Attempt,
    string? WorkerId, int? ResponseStatus, long? DurationMs, string? ErrorMessage,
    string Trigger, DateTime? StartedAt, DateTime? CompletedAt, DateTime CreatedAt);

public record AttemptDto(
    int AttemptNumber, string Status, DateTime StartedAt, DateTime? CompletedAt,
    int? ResponseStatus, string? ResponseBody, long? DurationMs, string? ErrorMessage);

public record LogDto(string Level, string Message, DateTime CreatedAt);

public record ExecutionDetail(
    Guid Id, Guid JobId, string JobName, string Status, int Attempt,
    string? WorkerId, int? ResponseStatus, long? DurationMs, string? ErrorMessage,
    string Trigger, Guid? ParentExecutionId,
    DateTime? StartedAt, DateTime? CompletedAt, DateTime? NextRetryAt, DateTime CreatedAt,
    List<AttemptDto> Attempts, List<LogDto> Logs);

public record DashboardStats(
    int TotalJobs, int ActiveJobs, int RunningExecutions, int FailedLast24h,
    double SuccessRateLast24h, int ExecutionsLast24h,
    List<ExecutionSummary> RecentExecutions);
