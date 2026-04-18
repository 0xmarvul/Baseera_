using Application.DTOs.User;

namespace Application.Interfaces;

public interface IUserService
{
    Task<UserProfileDto?> GetProfileAsync(int userId);
    Task<UserProfileDto> UpdateProfileAsync(int userId, UpdateProfileDto dto);
    Task DeleteAccountAsync(int userId);
}
