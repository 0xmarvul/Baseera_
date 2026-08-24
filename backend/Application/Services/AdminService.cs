using System.Text.RegularExpressions;
using Application.DTOs.Admin;
using Application.Interfaces;
using Core.Interfaces;

namespace Application.Services;

public class AdminService : IAdminService
{
    private readonly IUserRepository _userRepository;
    private readonly IScanRepository _scanRepository;
    private readonly IAuthService _authService;

    public AdminService(IUserRepository userRepository, IScanRepository scanRepository, IAuthService authService)
    {
        _userRepository = userRepository;
        _scanRepository = scanRepository;
        _authService = authService;
    }

    private static AdminUserDto Map(Core.Entities.User u) => new()
    {
        Id = u.Id,
        FirstName = u.FirstName,
        LastName = u.LastName,
        Email = u.Email,
        Username = u.Username,
        Country = u.Country,
        Role = u.Role,
        IsEmailVerified = u.IsEmailVerified,
        IsActive = u.IsActive,
        CreatedAt = u.CreatedAt,
    };

    public async Task<AdminStatsDto> GetStatsAsync()
    {
        var users = (await _userRepository.GetAllAsync()).ToList();
        var scans = (await _scanRepository.GetAllAsync()).ToList();
        return new AdminStatsDto
        {
            TotalUsers = users.Count,
            VerifiedUsers = users.Count(u => u.IsEmailVerified),
            UnverifiedUsers = users.Count(u => !u.IsEmailVerified),
            TotalScans = scans.Count,
            TotalFindings = scans.Sum(s => s.TotalVulns),
            Critical = scans.Sum(s => s.CriticalCount),
            High = scans.Sum(s => s.HighCount),
            Medium = scans.Sum(s => s.MediumCount),
            Low = scans.Sum(s => s.LowCount),
        };
    }

    public async Task<List<AdminUserDto>> GetUsersAsync()
    {
        var users = await _userRepository.GetAllAsync();
        var scans = await _scanRepository.GetAllAsync();
        var byUser = scans.GroupBy(s => s.UserId).ToDictionary(g => g.Key, g => new
        {
            ScanCount = g.Count(),
            Total = g.Sum(s => s.TotalVulns),
            Crit = g.Sum(s => s.CriticalCount),
            High = g.Sum(s => s.HighCount),
            Med = g.Sum(s => s.MediumCount),
            Low = g.Sum(s => s.LowCount),
        });

        return users.OrderByDescending(u => u.CreatedAt).Select(u =>
        {
            var dto = Map(u);
            if (byUser.TryGetValue(u.Id, out var agg))
            {
                dto.ScanCount = agg.ScanCount;
                dto.TotalFindings = agg.Total;
                dto.Critical = agg.Crit;
                dto.High = agg.High;
                dto.Medium = agg.Med;
                dto.Low = agg.Low;
            }
            return dto;
        }).ToList();
    }

    public async Task<AdminUserDto> UpdateUserAsync(int id, AdminUpdateUserDto dto)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null) throw new InvalidOperationException("User not found.");

        if (dto.Username != null)
        {
            var v = dto.Username.Trim();
            if (string.IsNullOrWhiteSpace(v)) throw new InvalidOperationException("Username cannot be empty.");
            if (v != user.Username)
            {
                var existing = await _userRepository.GetByUsernameAsync(v);
                if (existing != null && existing.Id != id) throw new InvalidOperationException("Username is already taken.");
                user.Username = v;
            }
        }

        if (dto.Email != null)
        {
            var v = dto.Email.Trim();
            if (string.IsNullOrWhiteSpace(v)) throw new InvalidOperationException("Email cannot be empty.");
            if (v != user.Email)
            {
                if (!Regex.IsMatch(v, @"^[^@\s]+@[^@\s]+\.[^@\s]+$")) throw new InvalidOperationException("Invalid email format.");
                var existing = await _userRepository.GetByEmailAsync(v);
                if (existing != null && existing.Id != id) throw new InvalidOperationException("Email is already in use.");
                // Admin override: set directly (no confirmation flow) and clear any pending change.
                user.Email = v;
                user.PendingEmail = null;
                user.EmailChangeTokenHash = null;
                user.EmailChangeTokenExpiresAtUtc = null;
            }
        }

        if (dto.FirstName != null && !string.IsNullOrWhiteSpace(dto.FirstName)) user.FirstName = dto.FirstName.Trim();
        if (dto.LastName != null && !string.IsNullOrWhiteSpace(dto.LastName)) user.LastName = dto.LastName.Trim();
        if (dto.Country != null) user.Country = string.IsNullOrWhiteSpace(dto.Country) ? null : dto.Country.Trim();
        if (dto.Role != null && (dto.Role == "User" || dto.Role == "Admin")) user.Role = dto.Role;
        if (dto.IsActive.HasValue) user.IsActive = dto.IsActive.Value;
        if (dto.IsEmailVerified.HasValue) user.IsEmailVerified = dto.IsEmailVerified.Value;

        user.UpdatedAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(user);

        var result = Map(user);
        var userScans = (await _scanRepository.GetByUserIdAsync(user.Id)).ToList();
        result.ScanCount = userScans.Count;
        result.TotalFindings = userScans.Sum(s => s.TotalVulns);
        result.Critical = userScans.Sum(s => s.CriticalCount);
        result.High = userScans.Sum(s => s.HighCount);
        result.Medium = userScans.Sum(s => s.MediumCount);
        result.Low = userScans.Sum(s => s.LowCount);
        return result;
    }

    public async Task ResetUserPasswordAsync(int id, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null) throw new InvalidOperationException("User not found.");
        // Reuse the standard forgot-password flow: emails a reset link to the user.
        await _authService.ForgotPasswordAsync(user.Email, ct);
    }

    public async Task DeleteUserAsync(int id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null) throw new InvalidOperationException("User not found.");
        await _userRepository.DeleteAsync(id);
    }
}
