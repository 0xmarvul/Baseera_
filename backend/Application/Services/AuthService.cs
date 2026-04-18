using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
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

    public AuthService(IUserRepository userRepository, IConfiguration configuration,
        IEmailSender emailSender, IPasswordResetTokenRepository tokenRepository,
        IEmailVerificationTokenRepository verificationTokenRepository)
    {
        _userRepository = userRepository;
        _configuration = configuration;
        _emailSender = emailSender;
        _tokenRepository = tokenRepository;
        _verificationTokenRepository = verificationTokenRepository;
    }

    public async Task<string> RegisterAsync(string email, string username, string firstName, string lastName, string password,
        string? phoneNumber = null, string? gender = null, DateTime? dateOfBirth = null, string? country = null, string? bio = null)
    {
        if (await _userRepository.EmailExistsAsync(email))
            throw new InvalidOperationException("Email already exists");

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

        var htmlBody = $@"
<h2>Welcome to Bassera!</h2>
<p>Hello,</p>
<p>Please click the link below to verify your email address and activate your Bassera account:</p>
<p><a href=""{verifyLink}"">Verify Email Address</a></p>
<p>This link will expire in 24 hours.</p>
<p>If you did not create this account, you can safely ignore this email.</p>
<p>Best regards,<br>The Bassera Team</p>";

        await _emailSender.SendAsync(email, "Verify Your Email – Bassera", htmlBody);

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
                ValidateIssuer = false,
                ValidateAudience = false,
                ClockSkew = TimeSpan.Zero
            }, out SecurityToken validatedToken);

            return Task.FromResult(true);
        }
        catch
        {
            return Task.FromResult(false);
        }
    }

    public async Task ChangePasswordAsync(int userId, string newPassword)
    {
        if (string.IsNullOrEmpty(newPassword) || newPassword.Length < 6)
            throw new ArgumentException("Password must be at least 6 characters long");

        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
            throw new UnauthorizedAccessException("User not found");

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

        var htmlBody = $@"
<p>Hello {user.FirstName},</p>
<p>You requested a password reset for your Baseera account.</p>
<p><a href=""{resetLink}"">Click here to reset your password</a></p>
<p>This link expires in {ttlMinutes} minutes.</p>
<p>If you did not request this, please ignore this email.</p>";

        await _emailSender.SendAsync(email, "Reset Your Baseera Password", htmlBody, ct);
    }

    public async Task ResetPasswordAsync(string email, string token, string newPassword, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(newPassword))
            throw new UnauthorizedAccessException("Invalid request");

        if (newPassword.Length < 6)
            throw new ArgumentException("Password must be at least 6 characters long");

        var user = await _userRepository.GetByEmailAsync(email);
        if (user == null)
            throw new UnauthorizedAccessException("Invalid or expired reset token");

        var tokenHash = Sha256Hex(token);
        var now = DateTime.UtcNow;
        var resetToken = await _tokenRepository.GetValidTokenAsync(user.Id, tokenHash, now, ct);

        if (resetToken == null)
            throw new UnauthorizedAccessException("Invalid or expired reset token");

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

        var htmlBody = $@"
<h2>Welcome to Bassera!</h2>
<p>Hello,</p>
<p>Please click the link below to verify your email address and activate your Bassera account:</p>
<p><a href=""{verifyLink}"">Verify Email Address</a></p>
<p>This link will expire in 24 hours.</p>
<p>If you did not create this account, you can safely ignore this email.</p>
<p>Best regards,<br>The Bassera Team</p>";

        await _emailSender.SendAsync(email, "Verify Your Email – Bassera", htmlBody, ct);
    }

    private static string GenerateSecureToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
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
            Expires = DateTime.UtcNow.AddHours(24),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}
