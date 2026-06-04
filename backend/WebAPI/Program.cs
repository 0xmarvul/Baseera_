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

// Rate Limiter — protects the login endpoint from brute-force attempts.
// Policy "login": 5 requests / 60 seconds per remote IP, no queue.
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
            "{\"success\":false,\"message\":\"Too many login attempts. Try again in a minute.\",\"data\":null}",
            cancellationToken: token);
    };

    options.AddPolicy("login", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromSeconds(60),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
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
app.UseCors("AllowAll");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
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
