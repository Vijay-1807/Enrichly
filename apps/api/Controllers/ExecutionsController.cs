using Api.Data;
using Api.Dtos;
using Api.Models;
using Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Controllers;

[ApiController]
[Route("api/executions")]
[Authorize]
public class ExecutionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ExecutionService _execs;

    public ExecutionsController(AppDbContext db, ExecutionService execs)
    {
        _db = db;
        _execs = execs;
    }

    private Guid Uid => JwtService.GetUserId(User);

    private async Task<Execution?> OwnedAsync(Guid id)
        => await _db.Executions.Include(e => e.Job)
            .FirstOrDefaultAsync(e => e.Id == id && e.Job != null && e.Job.UserId == Uid);

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ExecutionDetail>> Get(Guid id)
    {
        var e = await OwnedAsync(id);
        if (e is null) return NotFound(new { error = "Execution not found." });
        var attempts = await _db.ExecutionAttempts.Where(a => a.ExecutionId == id)
            .OrderBy(a => a.AttemptNumber).ToListAsync();
        var logs = await _db.JobLogs.Where(l => l.ExecutionId == id)
            .OrderBy(l => l.CreatedAt).Take(200).ToListAsync();
        return Ok(new ExecutionDetail(
            e.Id, e.JobId, e.Job!.Name, e.Status.ToString(), e.Attempt,
            e.WorkerId, e.ResponseStatus, e.DurationMs, e.ErrorMessage,
            e.Trigger, e.ParentExecutionId, e.StartedAt, e.CompletedAt, e.NextRetryAt, e.CreatedAt,
            attempts.Select(a => new AttemptDto(a.AttemptNumber, a.Status.ToString(), a.StartedAt, a.CompletedAt,
                a.ResponseStatus, ExecutionService.Truncate(a.ResponseBody, 2000), a.DurationMs, a.ErrorMessage)).ToList(),
            logs.Select(l => new LogDto(l.Level, l.Message, l.CreatedAt)).ToList()));
    }

    [HttpPost("{id:guid}/retry")]
    public async Task<ActionResult> Retry(Guid id)
    {
        var e = await OwnedAsync(id);
        if (e is null) return NotFound(new { error = "Execution not found." });
        try
        {
            var next = await _execs.RetryAsync(e);
            return StatusCode(201, new { executionId = next.Id });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<ActionResult> Cancel(Guid id)
    {
        var e = await OwnedAsync(id);
        if (e is null) return NotFound(new { error = "Execution not found." });
        var ok = await _execs.CancelAsync(e);
        if (!ok) return BadRequest(new { error = "Execution is already finished." });
        return Ok(new { status = "Cancelled" });
    }
}
