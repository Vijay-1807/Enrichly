using Api.Models;

namespace Api.Tests;

public class ExecutionStateMachineTests
{
    [Theory]
    [InlineData(ExecutionStatus.Queued, ExecutionStatus.Running, true)]
    [InlineData(ExecutionStatus.Queued, ExecutionStatus.Cancelled, true)]
    [InlineData(ExecutionStatus.Queued, ExecutionStatus.Success, false)]
    [InlineData(ExecutionStatus.Running, ExecutionStatus.Success, true)]
    [InlineData(ExecutionStatus.Running, ExecutionStatus.Failed, true)]
    [InlineData(ExecutionStatus.Running, ExecutionStatus.Queued, true)] // retry / stale recovery
    [InlineData(ExecutionStatus.Running, ExecutionStatus.Cancelled, true)]
    [InlineData(ExecutionStatus.Success, ExecutionStatus.Queued, false)]
    [InlineData(ExecutionStatus.Failed, ExecutionStatus.Running, false)]
    [InlineData(ExecutionStatus.Cancelled, ExecutionStatus.Queued, false)]
    public void Transitions_AreEnforced(ExecutionStatus from, ExecutionStatus to, bool allowed)
        => Assert.Equal(allowed, ExecutionTransitions.CanTransition(from, to));

    [Fact]
    public void InvalidTransition_Throws()
        => Assert.Throws<InvalidOperationException>(() =>
            ExecutionTransitions.EnsureValid(ExecutionStatus.Success, ExecutionStatus.Running));
}
