using Api.Data;
using Api.Dtos;
using Api.Models;
using Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Controllers;

[ApiController]
[Route("api/jobs")]
[Authorize]
public class JobsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ExecutionService _execs;

    public JobsController(AppDbContext db, ExecutionService execs)
    {
        _db = db;
        _execs = execs;
    }

    private Guid Uid => JwtService.GetUserId(User);

    [HttpGet]
    public async Task<ActionResult> List([FromQuery] string? search, [FromQuery] string? status,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        page = Math.Clamp(page, 1, 100);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var q = _db.Jobs.Where(j => j.UserId == Uid);
        if (!string.IsNullOrWhiteSpace(search))
            q = q.Where(j => EF.Functions.ILike(j.Name, $"%{search.Trim()}%") || (j.Description != null && EF.Functions.ILike(j.Description, $"%{search.Trim()}%")));
        if (status == "active") q = q.Where(j => j.Enabled);
        if (status == "paused") q = q.Where(j => !j.Enabled);

        var total = await q.CountAsync();
        var jobs = await q.OrderByDescending(j => j.UpdatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        var ids = jobs.Select(j => j.Id).ToList();
        var stats = await _db.Executions.Where(e => ids.Contains(e.JobId))
            .GroupBy(e => e.JobId)
            .Select(g => new { JobId = g.Key, Total = g.Count(), Failed = g.Count(e => e.Status == ExecutionStatus.Failed) })
            .ToDictionaryAsync(x => x.JobId);
        var lastStatus = await _db.Executions.Where(e => ids.Contains(e.JobId))
            .GroupBy(e => e.JobId)
            .Select(g => new { JobId = g.Key, Last = g.OrderByDescending(e => e.CreatedAt).FirstOrDefault() })
            .ToDictionaryAsync(x => x.JobId);

        var items = jobs.Select(j =>
        {
            stats.TryGetValue(j.Id, out var s);
            lastStatus.TryGetValue(j.Id, out var l);
            var totalE = s?.Total ?? 0;
            var failed = s?.Failed ?? 0;
            double? rate = totalE == 0 ? null : Math.Round((totalE - failed) * 100.0 / totalE, 1);
            return ToResponse(j, l?.Last?.Status, totalE, failed, rate);
        });
        return Ok(new { items, total, page, pageSize });
    }

    [HttpPost]
    public async Task<ActionResult<JobResponse>> Create(CreateJobRequest req)
    {
        var (ok, err) = JobValidator.ValidateCreate(req);
        if (!ok) return BadRequest(new { error = err });
        if (!Enum.TryParse<ScheduleMode>(req.ScheduleMode, true, out var mode)) mode = ScheduleMode.Manual;

        var job = new Job
        {
            UserId = Uid,
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            Url = req.Url.Trim(),
            Method = (req.Method ?? "GET").ToUpperInvariant(),
            HeadersJson = req.HeadersJson,
            Body = req.Body,
            ScheduleMode = mode,
            IntervalSeconds = mode == ScheduleMode.Interval ? req.IntervalSeconds : null,
            Enabled = req.Enabled,
            MaxRetries = req.MaxRetries,
            TimeoutSeconds = req.TimeoutSeconds,
            NotificationUrl = string.IsNullOrWhiteSpace(req.NotificationUrl) ? null : req.NotificationUrl.Trim(),
            NotifyOn = JobValidator.NormalizeNotifyOn(req.NotifyOn),
            NextRunAt = mode == ScheduleMode.Interval ? DateTime.UtcNow + TimeSpan.FromSeconds(req.IntervalSeconds ?? 3600) : null,
        };
        _db.Jobs.Add(job);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = job.Id }, ToResponse(job, null, 0, 0, null));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<JobResponse>> Get(Guid id)
    {
        var job = await _db.Jobs.FirstOrDefaultAsync(j => j.Id == id && j.UserId == Uid);
        if (job is null) return NotFound(new { error = "Job not found." });
        var total = await _db.Executions.CountAsync(e => e.JobId == id);
        var failed = await _db.Executions.CountAsync(e => e.JobId == id && e.Status == ExecutionStatus.Failed);
        var last = await _db.Executions.Where(e => e.JobId == id).OrderByDescending(e => e.CreatedAt).FirstOrDefaultAsync();
        double? rate = total == 0 ? null : Math.Round((total - failed) * 100.0 / total, 1);
        return Ok(ToResponse(job, last?.Status, total, failed, rate));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<JobResponse>> Update(Guid id, UpdateJobRequest req)
    {
        var (ok, err) = JobValidator.ValidateUpdate(req);
        if (!ok) return BadRequest(new { error = err });
        var job = await _db.Jobs.FirstOrDefaultAsync(j => j.Id == id && j.UserId == Uid);
        if (job is null) return NotFound(new { error = "Job not found." });

        // Optimistic concurrency: client may send RowVersion (base64 of uint LE).
        if (!string.IsNullOrWhiteSpace(req.RowVersion))
        {
            try
            {
                var bytes = Convert.FromBase64String(req.RowVersion);
                var clientV = BitConverter.ToUInt32(bytes, 0);
                if (clientV != job.RowVersion)
                    return Conflict(new { error = "Job was modified by another request. Reload and try again." });
            }
            catch { /* ignore malformed token, fall through to last-write-wins */ }
        }

        if (!Enum.TryParse<ScheduleMode>(req.ScheduleMode, true, out var mode)) mode = ScheduleMode.Manual;
        job.Name = req.Name.Trim();
        job.Description = req.Description?.Trim();
        job.Url = req.Url.Trim();
        job.Method = (req.Method ?? "GET").ToUpperInvariant();
        job.HeadersJson = req.HeadersJson;
        job.Body = req.Body;
        job.ScheduleMode = mode;
        job.IntervalSeconds = mode == ScheduleMode.Interval ? req.IntervalSeconds : null;
        job.Enabled = req.Enabled;
        job.MaxRetries = req.MaxRetries;
        job.TimeoutSeconds = req.TimeoutSeconds;
        job.NotificationUrl = string.IsNullOrWhiteSpace(req.NotificationUrl) ? null : req.NotificationUrl.Trim();
        job.NotifyOn = JobValidator.NormalizeNotifyOn(req.NotifyOn);
        job.UpdatedAt = DateTime.UtcNow;
        if (mode == ScheduleMode.Interval && job.NextRunAt is null)
            job.NextRunAt = DateTime.UtcNow + TimeSpan.FromSeconds(job.IntervalSeconds ?? 3600);
        if (mode == ScheduleMode.Manual) job.NextRunAt = null;

        try { await _db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { error = "Job was modified concurrently. Reload and try again." });
        }
        return Ok(ToResponse(job, null, 0, 0, null));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var job = await _db.Jobs.FirstOrDefaultAsync(j => j.Id == id && j.UserId == Uid);
        if (job is null) return NotFound(new { error = "Job not found." });
        _db.Jobs.Remove(job);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/run")]
    public async Task<ActionResult> RunNow(Guid id)
    {
        var job = await _db.Jobs.FirstOrDefaultAsync(j => j.Id == id && j.UserId == Uid);
        if (job is null) return NotFound(new { error = "Job not found." });
        var key = Request.Headers["Idempotency-Key"].FirstOrDefault();
        var (exec, created) = await _execs.CreateExecutionAsync(job, "manual", key);
        var summary = ExecutionService.ToSummary(exec, job.Name);
        if (!created) return Ok(new { execution = summary, deduplicated = true });
        return StatusCode(201, new { execution = summary, deduplicated = false });
    }

    [HttpGet("{id:guid}/executions")]
    public async Task<ActionResult> Executions(Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? status = null)
    {
        var job = await _db.Jobs.FirstOrDefaultAsync(j => j.Id == id && j.UserId == Uid);
        if (job is null) return NotFound(new { error = "Job not found." });
        page = Math.Clamp(page, 1, 100); pageSize = Math.Clamp(pageSize, 1, 100);
        var q = _db.Executions.Where(e => e.JobId == id);
        if (Enum.TryParse<ExecutionStatus>(status, true, out var st)) q = q.Where(e => e.Status == st);
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(e => e.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new
        {
            items = items.Select(e => ExecutionService.ToSummary(e, job.Name)),
            total, page, pageSize
        });
    }

    private static JobResponse ToResponse(Job j, ExecutionStatus? last, int total, int failed, double? rate)
    {
        var rv = Convert.ToBase64String(BitConverter.GetBytes(j.RowVersion));
        return new(j.Id, j.Name, j.Description, j.Type, j.Url, j.Method, j.HeadersJson, j.Body,
            j.ScheduleMode.ToString(), j.IntervalSeconds, j.Enabled, j.MaxRetries, j.TimeoutSeconds,
            j.NotificationUrl, j.NotifyOn,
            j.LastRunAt, j.NextRunAt, j.CreatedAt, j.UpdatedAt, rv, last, total, failed, rate);
    }
}
