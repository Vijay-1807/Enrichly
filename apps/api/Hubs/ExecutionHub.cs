using System.Security.Claims;
using Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Api.Hubs;

/// <summary>
/// Real-time execution updates. Authenticated clients join their private user
/// group; the API/workers push `executionUpdated` events there. The web UI uses
/// these for instant refresh and keeps HTTP polling as a fallback.
/// </summary>
[Authorize]
public class ExecutionHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var uid = Context.User?.FindFirst("uid")?.Value;
        if (!string.IsNullOrWhiteSpace(uid))
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{uid}");
        await base.OnConnectedAsync();
    }

    /// <summary>Join a single execution's group for granular updates.</summary>
    public Task WatchExecution(string executionId)
        => Groups.AddToGroupAsync(Context.ConnectionId, $"execution:{executionId}");

    public Task UnwatchExecution(string executionId)
        => Groups.RemoveFromGroupAsync(Context.ConnectionId, $"execution:{executionId}");
}

public static class ExecutionHubEvents
{
    public static string UserGroup(Guid userId) => $"user:{userId}";

    public static object Payload(Guid executionId, Guid jobId, string status, int attempt) => new
    {
        executionId, jobId, status, attempt, at = DateTime.UtcNow,
    };

    /// <summary>Alive = heartbeat within the liveness window. Pure + tested.</summary>
    public static bool IsWorkerAlive(DateTime lastSeenUtc, DateTime nowUtc, TimeSpan window)
        => nowUtc - lastSeenUtc <= window;
}
