using Application.DTOs.Admin;

namespace Application.Interfaces;

public interface IAdminService
{
    Task<AdminStatsDto> GetStatsAsync();
    Task<List<AdminUserDto>> GetUsersAsync();
    Task<AdminUserDto> UpdateUserAsync(int id, AdminUpdateUserDto dto);
    Task ResetUserPasswordAsync(int id, CancellationToken ct = default);
    Task DeleteUserAsync(int id);
}
