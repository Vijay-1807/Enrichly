using Api.Data;
using Api.Dtos;
using Api.Models;
using Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;
    public DashboardController(AppDbContext db) => _db = db;
    private Guid Uid => JwtService.GetUserId(User);

    [HttpGet("stats")]
    public async Task<ActionResult<DashboardStats>> Stats()
    {
        var since = DateTime.UtcNow - TimeSpan.FromHours(24);
        var myJobIds = _db.Jobs.Where(j => j.UserId == Uid).Select(j => j.Id);

        var totalJobs = await _db.Jobs.CountAsync(j => j.UserId == Uid);
        var activeJobs = await _db.Jobs.CountAsync(j => j.UserId == Uid && j.Enabled);
        var running = await _db.Executions.CountAsync(e => myJobIds.Contains(e.JobId) && e.Status == ExecutionStatus.Running);
        var last24 = await _db.Executions.Where(e => myJobIds.Contains(e.JobId) && e.CreatedAt >= since).ToListAsync();
        var failed24 = last24.Count(e => e.Status == ExecutionStatus.Failed);
        var successRate = last24.Count == 0 ? 100.0
            : Math.Round(last24.Count(e => e.Status == ExecutionStatus.Success) * 100.0 / last24.Count, 1);

        var recent = await (from e in _db.Executions
                            join j in _db.Jobs on e.JobId equals j.Id
                            where j.UserId == Uid
                            orderby e.CreatedAt descending
                            select new { e, j.Name }).Take(10).ToListAsync();

        return Ok(new DashboardStats(totalJobs, activeJobs, running, failed24, successRate, last24.Count,
            recent.Select(x => ExecutionService.ToSummary(x.e, x.Name)).ToList()));
    }
}
