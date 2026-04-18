using System.Diagnostics;

namespace WebAPI.Middleware;

public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        
        var request = context.Request;
        _logger.LogInformation(
            "Incoming Request: {Method} {Path} from {IP}",
            request.Method,
            request.Path,
            context.Connection.RemoteIpAddress
        );

        await _next(context);

        stopwatch.Stop();

        _logger.LogInformation(
            "Completed Request: {Method} {Path} - Status: {StatusCode} - Duration: {Duration}ms",
            request.Method,
            request.Path,
            context.Response.StatusCode,
            stopwatch.ElapsedMilliseconds
        );
    }
}
