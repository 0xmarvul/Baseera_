using Core.Entities;
using Core.Interfaces;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public class EmailVerificationTokenRepository : IEmailVerificationTokenRepository
{
    private readonly SecurityScannerDbContext _context;

    public EmailVerificationTokenRepository(SecurityScannerDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(EmailVerificationToken token, CancellationToken ct = default)
    {
        await _context.EmailVerificationTokens.AddAsync(token, ct);
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await _context.SaveChangesAsync(ct);
    }

    public async Task InvalidateAllActiveForUserAsync(int userId, DateTime now, CancellationToken ct = default)
    {
        var activeTokens = await _context.EmailVerificationTokens
            .Where(t => t.UserId == userId && t.ExpiresAtUtc > now && t.UsedAtUtc == null)
            .ToListAsync(ct);

        foreach (var token in activeTokens)
            token.ExpiresAtUtc = now;

        await _context.SaveChangesAsync(ct);
    }

    public async Task<EmailVerificationToken?> GetValidTokenAsync(int userId, string tokenHash, DateTime now, CancellationToken ct = default)
    {
        return await _context.EmailVerificationTokens
            .FirstOrDefaultAsync(t =>
                t.UserId == userId &&
                t.TokenHash == tokenHash &&
                t.ExpiresAtUtc > now &&
                t.UsedAtUtc == null,
                ct);
    }
}
