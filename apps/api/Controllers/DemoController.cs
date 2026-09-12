using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

/// <summary>
/// Built-in demo endpoints so reviewers can create jobs without external dependencies:
/// /api/demo/echo (200), /api/demo/flaky (fails ~50%), /api/demo/fail (500), /api/demo/slow?ms=3000
/// </summary>
[ApiController]
[Route("api/demo")]
public class DemoController : ControllerBase
{
    private static int _flakyCount = 0;

    [HttpGet("echo")]
    [HttpPost("echo")]
    [HttpPut("echo")]
    [HttpPatch("echo")]
    public ActionResult Echo() => Ok(new { ok = true, time = DateTime.UtcNow, echo = "hello from enrichly demo" });

    [HttpGet("fail")]
    [HttpPost("fail")]
    public ActionResult Fail() => StatusCode(500, new { ok = false, error = "Intentional failure for testing retries." });

    [HttpGet("flaky")]
    [HttpPost("flaky")]
    public ActionResult Flaky()
    {
        var n = Interlocked.Increment(ref _flakyCount);
        if (n % 2 == 1) return StatusCode(503, new { ok = false, attempt = n, error = "Flaky endpoint failed (odd attempts fail)." });
        return Ok(new { ok = true, attempt = n });
    }

    [HttpGet("slow")]
    public async Task<ActionResult> Slow([FromQuery] int ms = 3000)
    {
        ms = Math.Clamp(ms, 100, 25000);
        await Task.Delay(ms);
        return Ok(new { ok = true, sleptMs = ms });
    }
}
