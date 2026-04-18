using Core.Entities;

namespace Core.Interfaces;

public interface IPasswordResetTokenRepository
{
    Task AddAsync(PasswordResetToken token, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
    Task InvalidateAllActiveForUserAsync(int userId, DateTime now, CancellationToken ct = default);
    Task<PasswordResetToken?> GetValidTokenAsync(int userId, string tokenHash, DateTime now, CancellationToken ct = default);
}
