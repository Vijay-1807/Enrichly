using System.Net;
using System.Text.Json;

namespace Api.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _log;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> log)
    {
        _next = next;
        _log = log;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        try { await _next(ctx); }
        catch (UnauthorizedAccessException ex)
        {
            _log.LogWarning(ex, "Unauthorized");
            await Write(ctx, HttpStatusCode.Unauthorized, ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            await Write(ctx, HttpStatusCode.NotFound, ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            await Write(ctx, HttpStatusCode.Conflict, ex.Message);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Unhandled error {Method} {Path}", ctx.Request.Method, ctx.Request.Path);
            await Write(ctx, HttpStatusCode.InternalServerError, "Something went wrong.");
        }
    }

    private static Task Write(HttpContext ctx, HttpStatusCode code, string message)
    {
        ctx.Response.StatusCode = (int)code;
        ctx.Response.ContentType = "application/json";
        return ctx.Response.WriteAsync(JsonSerializer.Serialize(new { error = message }));
    }
}
