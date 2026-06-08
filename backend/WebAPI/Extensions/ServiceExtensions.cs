using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using FluentValidation;
using FluentValidation.AspNetCore;
using Core.Interfaces;
using Application.Interfaces;
using Application.Services;
using Infrastructure.Data;
using Infrastructure.Repositories;
using Infrastructure.Services;

namespace WebAPI.Extensions;

public static class ServiceExtensions
{
    public static IServiceCollection AddDatabaseConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<SecurityScannerDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("DefaultConnection"),
                b => b.MigrationsAssembly("Infrastructure")
            )
        );

        return services;
    }

    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Repositories
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IScanRepository, ScanRepository>();
        services.AddScoped<IVulnerabilityRepository, VulnerabilityRepository>();
        services.AddScoped<IReportRepository, ReportRepository>();
        services.AddScoped<IPasswordResetTokenRepository, PasswordResetTokenRepository>();
        services.AddScoped<IEmailVerificationTokenRepository, EmailVerificationTokenRepository>();
        services.AddScoped(typeof(IRepository<>), typeof(GenericRepository<>));

        // Services
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IScansService, ScansService>();
        services.AddScoped<IReportsService, ReportsService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IEmailSender, SmtpEmailSender>();

        return services;
    }

    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var jwtSettings = configuration.GetSection("Jwt");
        var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey is not configured");
        var issuer = jwtSettings["Issuer"] ?? throw new InvalidOperationException("JWT Issuer is not configured");
        var audience = jwtSettings["Audience"] ?? throw new InvalidOperationException("JWT Audience is not configured");

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
                // Validate issuer/audience so a token signed with the same
                // secret but meant for a different service can't be replayed
                // against this API. Defense in depth alongside secret rotation.
                ValidateIssuer = true,
                ValidIssuer = issuer,
                ValidateAudience = true,
                ValidAudience = audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };
        });

        return services;
    }

    public static IServiceCollection AddSwaggerDocumentation(this IServiceCollection services)
    {
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Security Scanner API",
                Version = "v1",
                Description = "API for Web Security Vulnerability Scanner",
                Contact = new OpenApiContact
                {
                    Name = "Security Scanner Team",
                    Email = "support@securityscanner.com"
                }
            });

            c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token",
                Name = "Authorization",
                In = ParameterLocation.Header,
                Type = SecuritySchemeType.ApiKey,
                Scheme = "Bearer"
            });

            c.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
                    Array.Empty<string>()
                }
            });
        });

        return services;
    }

    public static IServiceCollection AddValidators(this IServiceCollection services)
    {
        services.AddFluentValidationAutoValidation();
        services.AddFluentValidationClientsideAdapters();
        services.AddValidatorsFromAssemblyContaining<Application.Validators.RegisterValidator>();

        return services;
    }

    public static IServiceCollection AddCorsPolicy(this IServiceCollection services, IConfiguration configuration)
    {
        // Origins come from configuration so the same code works for localhost
        // dev and for production behind a real domain. The list lives in
        // appsettings.Development.json locally and in Cors__AllowedOrigins__N
        // environment variables on the hosting service.
        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();

        if (allowedOrigins.Length == 0)
        {
            // Fail loudly at startup instead of silently breaking every browser request.
            Console.WriteLine(
                "[CORS] WARNING: Cors:AllowedOrigins is empty. Browser requests from " +
                "your frontend will be blocked. Set the values in appsettings.Development.json " +
                "(local) or as environment variables (production).");
        }

        services.AddCors(options =>
        {
            options.AddPolicy("BaseeraCors", builder =>
            {
                builder.SetIsOriginAllowed(origin =>
                       {
                           // Exact-match the configured allowlist (Vercel URL etc).
                           if (allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
                               return true;

                           // Allow every Chrome / Firefox / Edge extension origin.
                           // Extension IDs are random per install and we want our own
                           // extension + future user-installed forks to work without
                           // re-deploying. The scanner endpoints they call are already
                           // protected by JWT auth or X-Scanner-Api-Key, so opening
                           // the extension origin to CORS doesn't bypass auth.
                           if (origin.StartsWith("chrome-extension://", StringComparison.OrdinalIgnoreCase))
                               return true;
                           if (origin.StartsWith("moz-extension://", StringComparison.OrdinalIgnoreCase))
                               return true;

                           return false;
                       })
                       .AllowAnyMethod()
                       .AllowAnyHeader()
                       .AllowCredentials();
            });
        });

        return services;
    }
}
