using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Serilog;
using System.Threading.RateLimiting;
using WebAPI.Extensions;
using WebAPI.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
try
{
    Log.Logger = new LoggerConfiguration()
        .WriteTo.Console()
        .WriteTo.File(
            path: "Logs/log-.txt",
            rollingInterval: RollingInterval.Day
        )
        .CreateLogger();

    builder.Host.UseSerilog();
}
catch
{
    // If Serilog fails, continue without it
    Console.WriteLine("Serilog initialization failed, using default logging");
}

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerDocumentation();
builder.Services.AddHttpClient();

// Database
builder.Services.AddDatabaseConfiguration(builder.Configuration);

// Application Services
builder.Services.AddApplicationServices();

// Authentication
builder.Services.AddJwtAuthentication(builder.Configuration);

// Validators
builder.Services.AddValidators();

// CORS
builder.Services.AddCorsPolicy(builder.Configuration);

// Rate Limiter — protects abuse-prone endpoints from brute-force, signup spam,
// email-bombing, and AI-quota drain. Each policy is a fixed window keyed by
// remote IP, no queue (excess requests get a 429 immediately).
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.ContentType = "application/json";
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter = ((int)retryAfter.TotalSeconds).ToString();
        }
        await context.HttpContext.Response.WriteAsync(
            "{\"success\":false,\"message\":\"Too many requests. Please slow down and try again in a minute.\",\"data\":null}",
            cancellationToken: token);
    };

    // Helper to keep the per-policy code below short.
    static RateLimitPartition<string> ByIp(HttpContext ctx, int permits, int seconds) =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permits,
                Window = TimeSpan.FromSeconds(seconds),
                QueueLimit = 0,
                AutoReplenishment = true
            });

    // Login: 5 / 60s — tight, brute-force protection.
    options.AddPolicy("login", ctx => ByIp(ctx, 5, 60));

    // Register: 3 / 5min — signup spam protection. Real signups are rare.
    options.AddPolicy("register", ctx => ByIp(ctx, 3, 300));

    // Forgot-password: 3 / 15min — email-bombing protection. Real users
    // don't request resets more than a few times a day.
    options.AddPolicy("forgot-password", ctx => ByIp(ctx, 3, 900));

    // Chat: 30 / 60s — AI quota / cold-start protection. Genuine users
    // don't fire 30 questions in a minute; bots do.
    options.AddPolicy("chat", ctx => ByIp(ctx, 30, 60));
});

var app = builder.Build();

// Middleware
app.UseMiddleware<ErrorHandlingMiddleware>();

if (builder.Configuration.GetValue<bool>("EnableRequestLogging", true))
{
    app.UseMiddleware<RequestLoggingMiddleware>();
}

// Swagger
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Static Files for Reports
app.UseStaticFiles();

app.UseHttpsRedirection();
app.UseCors("BaseeraCors");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Public health endpoint. Hosting platforms (Monster, Render, Railway,
// UptimeRobot) ping this to know the service is alive. Returns 200 OK
// with a tiny JSON body. No auth, no rate limit, intentionally cheap.
app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    timestamp = DateTime.UtcNow,
    service = "Baseera API"
}));

app.MapControllers();

try
{
    Log.Information("Security Scanner API started successfully");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
