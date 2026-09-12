using Api.Data;
using Api.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Controllers;

/// <summary>System / worker health: which workers are alive, since when, and how much they've done.</summary>
[ApiController]
[Route("api/workers")]
[Authorize]
public class WorkersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public WorkersController(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    [HttpGet("health")]
    public async Task<ActionResult> Health()
    {
        var window = TimeSpan.FromSeconds(_config.GetValue("Worker:LivenessWindowSeconds", 60));
        var now = DateTime.UtcNow;
        var rows = await _db.WorkerHeartbeats.OrderByDescending(w => w.LastSeenAt).Take(20).ToListAsync();
        return Ok(new
        {
            livenessWindowSeconds = (int)window.TotalSeconds,
            workers = rows.Select(w => new
            {
                workerId = w.WorkerId,
                alive = ExecutionHubEvents.IsWorkerAlive(w.LastSeenAt, now, window),
                startedAt = w.StartedAt,
                lastSeenAt = w.LastSeenAt,
                secondsSinceSeen = Math.Max(0, (int)(now - w.LastSeenAt).TotalSeconds),
                version = w.Version,
                processedCount = w.ProcessedCount,
            }),
        });
    }
}
