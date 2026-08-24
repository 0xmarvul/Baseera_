namespace Core.Interfaces;

public interface IAuthService
{
    Task<string> RegisterAsync(string email, string username, string firstName, string lastName, string password,
        string? phoneNumber = null, string? gender = null, DateTime? dateOfBirth = null, string? country = null, string? bio = null);
    Task<string> LoginAsync(string email, string password);
    Task<bool> ValidateTokenAsync(string token);
    Task ChangePasswordAsync(int userId, string currentPassword, string newPassword);
    Task ForgotPasswordAsync(string email, CancellationToken ct = default);
    Task ResetPasswordAsync(string email, string token, string newPassword, CancellationToken ct = default);
    Task VerifyEmailAsync(string email, string token, CancellationToken ct = default);
    Task ResendVerificationEmailAsync(string email, CancellationToken ct = default);

    // Verified email change: request stashes the new address + emails a
    // confirmation link to it; confirm swaps the account's email only when
    // that link is used. Until confirmed, the old email stays active.
    Task RequestEmailChangeAsync(int userId, string newEmail, CancellationToken ct = default);
    Task ConfirmEmailChangeAsync(string token, CancellationToken ct = default);
}
