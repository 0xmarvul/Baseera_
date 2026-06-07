using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace WebAPI.Middleware;

/// <summary>
/// Authorises scanner-to-API callback endpoints with a shared API key.
/// The key is provided via the <c>X-Scanner-Api-Key</c> header and must
/// match <c>Scanner:ApiKey</c> in configuration.
///
/// These endpoints (vulnerability callback, scan-status update) used to be
/// <c>[AllowAnonymous]</c>, which meant any anonymous caller could inject
/// fabricated vulnerabilities into any scan or mark scans Completed/Failed.
/// Closing that hole.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
public sealed class RequireScannerApiKeyAttribute : Attribute, IAsyncActionFilter
{
    private const string HeaderName = "X-Scanner-Api-Key";

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var configuredKey = context.HttpContext.RequestServices
            .GetRequiredService<IConfiguration>()["Scanner:ApiKey"];

        // Fail closed: if the key isn't configured, the endpoint is denied.
        // Better to surface "scanner integration broken" than to silently
        // fall back to AllowAnonymous behaviour.
        if (string.IsNullOrWhiteSpace(configuredKey))
        {
            context.Result = new ObjectResult(new { success = false, message = "Scanner API key not configured on server" })
            {
                StatusCode = StatusCodes.Status503ServiceUnavailable
            };
            return;
        }

        if (!context.HttpContext.Request.Headers.TryGetValue(HeaderName, out var provided)
            || !CryptographicEquals(provided.ToString(), configuredKey))
        {
            context.Result = new UnauthorizedObjectResult(new { success = false, message = "Invalid or missing scanner API key" });
            return;
        }

        await next();
    }

    // Constant-time comparison so request timing can't be used to brute the key.
    private static bool CryptographicEquals(string a, string b)
    {
        if (a.Length != b.Length) return false;
        var result = 0;
        for (var i = 0; i < a.Length; i++) result |= a[i] ^ b[i];
        return result == 0;
    }
}
