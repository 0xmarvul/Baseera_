using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Application.Validators;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Core.Entities;
using Core.Interfaces;

namespace Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;
    private readonly IEmailSender _emailSender;
    private readonly IPasswordResetTokenRepository _tokenRepository;
    private readonly IEmailVerificationTokenRepository _verificationTokenRepository;
    private readonly ILogger<AuthService>? _logger;

    public AuthService(IUserRepository userRepository, IConfiguration configuration,
        IEmailSender emailSender, IPasswordResetTokenRepository tokenRepository,
        IEmailVerificationTokenRepository verificationTokenRepository,
        ILogger<AuthService>? logger = null)
    {
        _userRepository = userRepository;
        _configuration = configuration;
        _emailSender = emailSender;
        _tokenRepository = tokenRepository;
        _verificationTokenRepository = verificationTokenRepository;
        _logger = logger;
    }

    // Sends an email without making the caller wait. Used for verification +
    // password-reset notifications so the HTTP response returns immediately
    // (~1s instead of 2-4s including SMTP round-trip). The DB write that
    // matters has already happened; the email is just a notification.
    //
    // Why fire-and-forget is safe here:
    //   - The user record / token row is ALREADY committed when we get here.
    //   - If Gmail rejects the email, we log it (Serilog -> Logs/log-*.txt)
    //     so the operator can see failures. The user still has the in-app
    //     'Resend verification email' button as a recovery path.
    //   - The Task is intentionally not awaited; we swallow exceptions so a
    //     crashed Task doesn't take the whole process down (would crash if
    //     ASPNETCORE_NO_THROW_FOR_UNOBSERVED_TASK_EXCEPTIONS isn't set).
    private void SendEmailInBackground(string toEmail, string subject, string htmlBody, string context)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                await _emailSender.SendAsync(toEmail, subject, htmlBody);
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex,
                    "Background email failed. Context={Context}, To={ToEmail}, Subject={Subject}",
                    context, toEmail, subject);
            }
        });
    }

    public async Task<string> RegisterAsync(string email, string username, string firstName, string lastName, string password,
        string? phoneNumber = null, string? gender = null, DateTime? dateOfBirth = null, string? country = null, string? bio = null)
    {
        if (await _userRepository.EmailExistsAsync(email))
            throw new InvalidOperationException("Email already exists");

        var existingByUsername = await _userRepository.GetByUsernameAsync(username);
        if (existingByUsername != null)
            throw new InvalidOperationException("Username is already taken");

        if (dateOfBirth.HasValue)
        {
            var today = DateTime.UtcNow.Date;
            var dob = dateOfBirth.Value.Date;

            if (dob > today)
                throw new ArgumentException("Date of birth cannot be in the future");

            var age = today.Year - dob.Year;
            if (dob.Date > today.AddYears(-age)) age--;

            if (age < 15)
                throw new ArgumentException("You must be at least 15 years old to register");

            if (age > 120)
                throw new ArgumentException("Please enter a valid date of birth");
        }

        var user = new User
        {
            Email = email,
            Username = username,
            FirstName = firstName,
            LastName = lastName,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            PhoneNumber = phoneNumber,
            Gender = gender,
            DateOfBirth = dateOfBirth,
            Country = country,
            Bio = bio,
            CreatedAt = DateTime.UtcNow,
            IsEmailVerified = false
        };

        await _userRepository.AddAsync(user);

        var rawToken = GenerateSecureToken();
        var tokenHash = Sha256Hex(rawToken);
        var now = DateTime.UtcNow;

        var verificationToken = new EmailVerificationToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            CreatedAtUtc = now,
            ExpiresAtUtc = now.AddHours(24)
        };

        await _verificationTokenRepository.AddAsync(verificationToken);
        await _verificationTokenRepository.SaveChangesAsync();

        var frontendBase = _configuration["Frontend:BaseUrl"] ?? "http://localhost:5173";
        var verifyLink = $"{frontendBase}/verify-email?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(rawToken)}";

        var htmlBody = EmailTemplate.Build(
            heading: "Welcome to Baseera",
            greetingName: firstName,
            body: "Confirm your email address to activate your Baseera account and start scanning websites for security issues.",
            buttonLabel: "Verify Email Address",
            buttonUrl: verifyLink,
            footnote: "This link expires in 24 hours. If you did not create this account, you can safely ignore this email."
        );

        // Fire-and-forget — user shouldn't wait 1-3s for SMTP. See SendEmailInBackground.
        SendEmailInBackground(email, "Verify your email – Baseera", htmlBody, "register-verification");

        return "Registration successful. Please check your email to verify your account.";
    }

    public async Task<string> LoginAsync(string email, string password)
    {
        var user = await _userRepository.GetByEmailAsync(email);
        
        if (user == null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid credentials");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("Account is inactive");

        if (!user.IsEmailVerified)
            throw new UnauthorizedAccessException("Please verify your email before logging in.");

        return GenerateJwtToken(user);
    }

    public Task<bool> ValidateTokenAsync(string token)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_configuration["Jwt:SecretKey"] ?? "");

            tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                // Mirror the JwtBearer config in ServiceExtensions.AddJwtAuthentication:
                // validate issuer + audience so tokens minted for other services
                // can't be replayed here even if the same secret is reused.
                ValidateIssuer = true,
                ValidIssuer = _configuration["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = _configuration["Jwt:Audience"],
                ClockSkew = TimeSpan.Zero
            }, out SecurityToken validatedToken);

            return Task.FromResult(true);
        }
        catch
        {
            return Task.FromResult(false);
        }
    }

    public async Task ChangePasswordAsync(int userId, string currentPassword, string newPassword)
    {
        if (string.IsNullOrEmpty(currentPassword))
            throw new ArgumentException("Current password is required.");

        if (!PasswordPolicy.IsValid(newPassword))
            throw new ArgumentException(PasswordPolicy.ErrorMessage);

        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
            throw new UnauthorizedAccessException("User not found");

        // Verify the caller actually knows the current password. Without this
        // check, a stolen / hijacked JWT alone is enough to take over an
        // account (rotate password, lock the real owner out). Equivalent to
        // requiring re-authentication before a security-sensitive change.
        if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
            throw new UnauthorizedAccessException("Current password is incorrect.");

        // Reject if the new password matches the current one. Otherwise the
        // operation looks successful but nothing actually changed, which is
        // confusing and arguably weakens security (user thinks they rotated
        // but didn't).
        if (BCrypt.Net.BCrypt.Verify(newPassword, user.PasswordHash))
            throw new ArgumentException("New password must be different from your current password.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(user);
    }

    public async Task ForgotPasswordAsync(string email, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(email))
            return;

        var user = await _userRepository.GetByEmailAsync(email);
        if (user == null)
            return; // Do not reveal whether email exists

        var rawToken = GenerateSecureToken();
        var tokenHash = Sha256Hex(rawToken);

        var ttlMinutes = int.TryParse(_configuration["PasswordReset:TokenTtlMinutes"], out var ttl) ? ttl : 15;
        var now = DateTime.UtcNow;

        await _tokenRepository.InvalidateAllActiveForUserAsync(user.Id, now, ct);

        var resetToken = new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            CreatedAtUtc = now,
            ExpiresAtUtc = now.AddMinutes(ttlMinutes)
        };

        await _tokenRepository.AddAsync(resetToken, ct);
        await _tokenRepository.SaveChangesAsync(ct);

        var frontendBase = _configuration["Frontend:BaseUrl"] ?? "http://localhost:5173";
        var resetLink = $"{frontendBase}/reset-password?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(rawToken)}";

        var htmlBody = EmailTemplate.Build(
            heading: "Reset your password",
            greetingName: user.FirstName,
            body: "We received a request to reset the password for your Baseera account. Click the button below to choose a new password.",
            buttonLabel: "Reset Password",
            buttonUrl: resetLink,
            footnote: $"This link expires in {ttlMinutes} minutes. If you did not request a password reset, you can safely ignore this email — your password will not change."
        );

        // Fire-and-forget — user shouldn't wait 1-3s for SMTP. See SendEmailInBackground.
        SendEmailInBackground(email, "Reset your password – Baseera", htmlBody, "forgot-password");
    }

    public async Task ResetPasswordAsync(string email, string token, string newPassword, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(newPassword))
            throw new UnauthorizedAccessException("Invalid request");

        if (!PasswordPolicy.IsValid(newPassword))
            throw new ArgumentException(PasswordPolicy.ErrorMessage);

        var user = await _userRepository.GetByEmailAsync(email);
        if (user == null)
            throw new UnauthorizedAccessException("Invalid or expired reset token");

        var tokenHash = Sha256Hex(token);
        var now = DateTime.UtcNow;
        var resetToken = await _tokenRepository.GetValidTokenAsync(user.Id, tokenHash, now, ct);

        if (resetToken == null)
            throw new UnauthorizedAccessException("Invalid or expired reset token");

        // Same protection as ChangePasswordAsync: reject reuse so the operation
        // is meaningful. If the user forgot their password but typed the
        // current one (rare but possible after a memory jog), we want to tell
        // them rather than silently no-op.
        if (BCrypt.Net.BCrypt.Verify(newPassword, user.PasswordHash))
            throw new ArgumentException("New password must be different from your current password.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(user);

        resetToken.UsedAtUtc = now;
        await _tokenRepository.SaveChangesAsync(ct);
    }

    public async Task VerifyEmailAsync(string email, string token, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(token))
            throw new UnauthorizedAccessException("Invalid request");

        var user = await _userRepository.GetByEmailAsync(email);
        if (user == null)
            throw new UnauthorizedAccessException("Invalid or expired verification token");

        if (user.IsEmailVerified)
            throw new InvalidOperationException("This email has already been verified. Please proceed to login.");

        var tokenHash = Sha256Hex(token);
        var now = DateTime.UtcNow;
        var verificationToken = await _verificationTokenRepository.GetValidTokenAsync(user.Id, tokenHash, now, ct);

        if (verificationToken == null)
            throw new UnauthorizedAccessException("Invalid or expired verification token");

        user.IsEmailVerified = true;
        user.UpdatedAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(user);

        verificationToken.UsedAtUtc = now;
        await _verificationTokenRepository.SaveChangesAsync(ct);
    }

    public async Task ResendVerificationEmailAsync(string email, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(email))
            return;

        var user = await _userRepository.GetByEmailAsync(email);
        if (user == null || user.IsEmailVerified)
            return; // Do not reveal whether email exists or is already verified

        var rawToken = GenerateSecureToken();
        var tokenHash = Sha256Hex(rawToken);
        var now = DateTime.UtcNow;

        await _verificationTokenRepository.InvalidateAllActiveForUserAsync(user.Id, now, ct);

        var verificationToken = new EmailVerificationToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            CreatedAtUtc = now,
            ExpiresAtUtc = now.AddHours(24)
        };

        await _verificationTokenRepository.AddAsync(verificationToken, ct);
        await _verificationTokenRepository.SaveChangesAsync(ct);

        var frontendBase = _configuration["Frontend:BaseUrl"] ?? "http://localhost:5173";
        var verifyLink = $"{frontendBase}/verify-email?email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(rawToken)}";

        var htmlBody = EmailTemplate.Build(
            heading: "Verify your email",
            greetingName: user.FirstName,
            body: "Here is a fresh verification link for your Baseera account. Click the button below to confirm your email address.",
            buttonLabel: "Verify Email Address",
            buttonUrl: verifyLink,
            footnote: "This link expires in 24 hours. If you did not request this, you can safely ignore the email."
        );

        // Fire-and-forget — user shouldn't wait 1-3s for SMTP. See SendEmailInBackground.
        SendEmailInBackground(email, "Verify your email – Baseera", htmlBody, "resend-verification");
    }

    private static string GenerateSecureToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }

    // ── Verified email change ──────────────────────────────────────────
    // Step 1: user (authenticated) requests a new email. We validate it,
    // stash it as PendingEmail with a hashed token, and email a confirmation
    // link to the NEW address. The account's real Email is not touched yet.
    public async Task RequestEmailChangeAsync(int userId, string newEmail, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(newEmail))
            throw new InvalidOperationException("Please enter a new email address.");
        newEmail = newEmail.Trim();
        if (!Regex.IsMatch(newEmail, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
            throw new InvalidOperationException("Please enter a valid email address.");

        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
            throw new InvalidOperationException("User not found.");
        if (string.Equals(newEmail, user.Email, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("That is already your email address.");

        var existing = await _userRepository.GetByEmailAsync(newEmail);
        if (existing != null && existing.Id != userId)
            throw new InvalidOperationException("That email address is already in use.");

        var rawToken = GenerateSecureToken();
        var now = DateTime.UtcNow;
        user.PendingEmail = newEmail;
        user.EmailChangeTokenHash = Sha256Hex(rawToken);
        user.EmailChangeTokenExpiresAtUtc = now.AddHours(24);
        user.UpdatedAt = now;
        await _userRepository.UpdateAsync(user);

        var frontendBase = _configuration["Frontend:BaseUrl"] ?? "http://localhost:5173";
        var link = $"{frontendBase}/confirm-email-change?token={Uri.EscapeDataString(rawToken)}";
        var htmlBody = EmailTemplate.Build(
            heading: "Confirm your new email",
            greetingName: user.FirstName,
            body: $"You asked to change your Baseera email to {newEmail}. Confirm below to make the change. Until you confirm, your current email stays active.",
            buttonLabel: "Confirm new email",
            buttonUrl: link,
            footnote: "This link expires in 24 hours. If you did not request this, you can ignore this email and your address will not change."
        );

        // Fire-and-forget SMTP, same pattern as verification/reset emails.
        SendEmailInBackground(newEmail, "Confirm your new email – Baseera", htmlBody, "email-change");
    }

    // Step 2: the confirmation link is opened. If the token is valid and not
    // expired, swap the account's email to the pending one and clear the
    // pending state. An expired/invalid token is a no-op error.
    public async Task ConfirmEmailChangeAsync(string token, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(token))
            throw new UnauthorizedAccessException("This confirmation link is invalid.");

        var tokenHash = Sha256Hex(token.Trim());
        var user = await _userRepository.GetByEmailChangeTokenHashAsync(tokenHash);
        if (user == null
            || string.IsNullOrEmpty(user.PendingEmail)
            || user.EmailChangeTokenExpiresAtUtc == null
            || user.EmailChangeTokenExpiresAtUtc < DateTime.UtcNow)
            throw new UnauthorizedAccessException("This confirmation link is invalid or has expired.");

        // Re-check the target address is still free (someone could have taken it).
        var existing = await _userRepository.GetByEmailAsync(user.PendingEmail);
        if (existing != null && existing.Id != user.Id)
            throw new InvalidOperationException("That email address is now in use by another account.");

        user.Email = user.PendingEmail;
        user.IsEmailVerified = true;
        user.PendingEmail = null;
        user.EmailChangeTokenHash = null;
        user.EmailChangeTokenExpiresAtUtc = null;
        user.UpdatedAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(user);
    }

    private static string Sha256Hex(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private string GenerateJwtToken(User user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_configuration["Jwt:SecretKey"] ?? "");
        // Read expiry from config so deploy-time changes don't need a rebuild.
        var expiryHours = int.TryParse(_configuration["Jwt:ExpiryHours"], out var h) ? h : 24;

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            // Issuer + Audience now stamped on every token so the new
            // ValidateIssuer / ValidateAudience checks in JwtBearer +
            // ValidateTokenAsync pass.
            Issuer = _configuration["Jwt:Issuer"],
            Audience = _configuration["Jwt:Audience"],
            Expires = DateTime.UtcNow.AddHours(expiryHours),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}
