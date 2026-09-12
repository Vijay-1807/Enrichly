using Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Api.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _db;
    public HealthController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult> Get()
    {
        var dbOk = false;
        string? dbError = null;
        try { await _db.Database.ExecuteSqlRawAsync("SELECT 1"); dbOk = true; }
        catch (Exception ex) { dbError = ex.Message; }
        return Ok(new
        {
            status = dbOk ? "healthy" : "degraded",
            time = DateTime.UtcNow,
            version = "1.0.0",
            database = dbOk ? "up" : $"down: {dbError}",
            worker = "running",
        });
    }
}
