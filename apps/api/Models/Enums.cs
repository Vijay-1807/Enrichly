namespace Api.Models;

public enum ExecutionStatus
{
    Queued,
    Running,
    Success,
    Failed,
    Cancelled
}

public enum ScheduleMode
{
    Manual,
    Interval
}

public static class ExecutionTransitions
{
    private static readonly Dictionary<ExecutionStatus, HashSet<ExecutionStatus>> Allowed = new()
    {
        [ExecutionStatus.Queued] = new() { ExecutionStatus.Running, ExecutionStatus.Cancelled },
        [ExecutionStatus.Running] = new() { ExecutionStatus.Success, ExecutionStatus.Failed, ExecutionStatus.Queued, ExecutionStatus.Cancelled },
        // Queued-from-Running is used for retries + stale recovery.
        [ExecutionStatus.Success] = new(),
        [ExecutionStatus.Failed] = new(),
        [ExecutionStatus.Cancelled] = new(),
    };

    public static bool CanTransition(ExecutionStatus from, ExecutionStatus to)
        => Allowed.TryGetValue(from, out var set) && set.Contains(to);

    public static void EnsureValid(ExecutionStatus from, ExecutionStatus to)
    {
        if (!CanTransition(from, to))
            throw new InvalidOperationException($"Invalid execution transition: {from} -> {to}");
    }
}
