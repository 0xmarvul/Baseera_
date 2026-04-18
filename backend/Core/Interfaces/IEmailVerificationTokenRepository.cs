using Core.Entities;

namespace Core.Interfaces;

public interface IEmailVerificationTokenRepository
{
    Task AddAsync(EmailVerificationToken token, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
    Task InvalidateAllActiveForUserAsync(int userId, DateTime now, CancellationToken ct = default);
    Task<EmailVerificationToken?> GetValidTokenAsync(int userId, string tokenHash, DateTime now, CancellationToken ct = default);
}
