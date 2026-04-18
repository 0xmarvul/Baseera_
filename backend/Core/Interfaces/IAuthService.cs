namespace Core.Interfaces;

public interface IAuthService
{
    Task<string> RegisterAsync(string email, string username, string firstName, string lastName, string password,
        string? phoneNumber = null, string? gender = null, DateTime? dateOfBirth = null, string? country = null, string? bio = null);
    Task<string> LoginAsync(string email, string password);
    Task<bool> ValidateTokenAsync(string token);
    Task ChangePasswordAsync(int userId, string newPassword);
    Task ForgotPasswordAsync(string email, CancellationToken ct = default);
    Task ResetPasswordAsync(string email, string token, string newPassword, CancellationToken ct = default);
    Task VerifyEmailAsync(string email, string token, CancellationToken ct = default);
    Task ResendVerificationEmailAsync(string email, CancellationToken ct = default);
}
