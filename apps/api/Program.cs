using System.Text;
using System.Text.Json.Serialization;
using Api.Data;
using Api.Middleware;
using Api.Services;
using Api.Workers;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ---------- Config: env vars override appsettings (12-factor, deploy-friendly) ----------
builder.Configuration.AddEnvironmentVariables();
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
var connectionString = !string.IsNullOrWhiteSpace(databaseUrl)
    ? ConvertDatabaseUrl(databaseUrl)
    : builder.Configuration.GetConnectionString("Default")
      ?? "Host=localhost;Port=5432;Database=enrichly_jobs;Username=postgres;Password=postgres";

var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? builder.Configuration["JWT_SECRET"];
if (string.IsNullOrWhiteSpace(jwtSecret))
{
    jwtSecret = "dev-only-secret-change-me-please-32-chars-minimum!!";
    Console.WriteLine("WARNING: using dev JWT secret. Set JWT_SECRET in production.");
}
builder.Configuration["JWT_SECRET"] = jwtSecret;

var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL")
    ?? builder.Configuration["FRONTEND_URL"]
    ?? "http://localhost:3000";

// ---------- Services ----------
builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    o.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(opt => opt.UseNpgsql(connectionString));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["JWT_ISSUER"] ?? "enrichly-jobs",
            ValidAudience = builder.Configuration["JWT_AUDIENCE"] ?? "enrichly-jobs",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.FromMinutes(2),
        };
        // SignalR browser clients send the JWT as ?access_token (WebSockets can't set headers).
        o.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var token = ctx.Request.Query["access_token"].FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(token) && ctx.Request.Path.StartsWithSegments("/hubs"))
                    ctx.Token = token;
                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddSignalR();

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(frontendUrl.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
     .AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

builder.Services.AddHttpClient("job-runner");
builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<ExecutionService>();
builder.Services.AddScoped<HttpJobExecutor>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddHostedService<JobWorker>();
builder.Services.AddHostedService<JobScheduler>();

var app = builder.Build();

// ---------- Migrate on boot (simple + reliable for assignment scope) ----------
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var log = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    for (var i = 0; i < 10; i++)
    {
        try
        {
            if (args.Contains("--no-migrate")) break;
            await db.Database.MigrateAsync();
            log.LogInformation("Database migrated.");
            break;
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "DB migrate attempt {I} failed, retrying...", i + 1);
            await Task.Delay(TimeSpan.FromSeconds(3));
            if (i == 9) throw;
        }
    }
    // ---------- Seed demo user (so reviewers can log in immediately) ----------
    try
    {
        const string demoEmail = "demo@enrichly.dev";
        if (!await db.Users.AnyAsync(u => u.Email == demoEmail))
        {
            db.Users.Add(new Api.Models.User
            {
                Email = demoEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
            });
            await db.SaveChangesAsync();
            log.LogInformation("Seeded demo user {Email} / password123", demoEmail);
        }
    }
    catch (Exception ex)
    {
        scope.ServiceProvider.GetRequiredService<ILogger<Program>>()
            .LogWarning(ex, "Demo seed failed (non-fatal).");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<ExceptionMiddleware>();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<Api.Hubs.ExecutionHub>("/hubs/executions");

app.Run();

static string ConvertDatabaseUrl(string url)
{
    // Support postgres://user:pass@host:port/db and postgresql://...
    try
    {
        var uri = new Uri(url);
        var userInfo = uri.UserInfo.Split(':', 2);
        var cs = new Npgsql.NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = uri.AbsolutePath.TrimStart('/'),
            Username = Uri.UnescapeDataString(userInfo.ElementAtOrDefault(0) ?? "postgres"),
            Password = Uri.UnescapeDataString(userInfo.ElementAtOrDefault(1) ?? ""),
            SslMode = Npgsql.SslMode.Require,
        };
        // Local docker URLs (localhost) should not force SSL.
        if (uri.Host is "localhost" or "127.0.0.1" or "db" or "postgres")
        {
            cs.SslMode = Npgsql.SslMode.Prefer;
        }
        // Preserve query params like ?sslmode=disable
        if (!string.IsNullOrEmpty(uri.Query))
        {
            foreach (var part in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var kv = part.Split('=', 2);
                if (kv.Length == 2 && kv[0].Equals("sslmode", StringComparison.OrdinalIgnoreCase)
                    && kv[1].Equals("disable", StringComparison.OrdinalIgnoreCase))
                    cs.SslMode = Npgsql.SslMode.Disable;
            }
        }
        return cs.ToString();
    }
    catch { return url; } // already a connection string
}

// Exposed for integration tests.
public partial class Program { }
