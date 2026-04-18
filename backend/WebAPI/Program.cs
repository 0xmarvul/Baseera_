using Microsoft.EntityFrameworkCore;
using Serilog;
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
