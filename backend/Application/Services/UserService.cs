using Core.Interfaces;
using Core.Exceptions;
using Application.DTOs.User;
using Application.Interfaces;
using System.Text.RegularExpressions;

namespace Application.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;

    public UserService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<UserProfileDto?> GetProfileAsync(int userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null) return null;

        return new UserProfileDto
        {
            Id = user.Id,
            Email = user.Email,
            Username = user.Username,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role,
            PhoneNumber = user.PhoneNumber,
            Gender = user.Gender,
            DateOfBirth = user.DateOfBirth,
            Country = user.Country,
            Bio = user.Bio,
            ProfileImageUrl = user.ProfileImageUrl,
            CreatedAt = user.CreatedAt
        };
    }

    public async Task<UserProfileDto> UpdateProfileAsync(int userId, UpdateProfileDto dto)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
            throw new NotFoundException("User not found");

        // Required fields. If present in the payload, they must be non-blank;
        // a blank value is treated as a user error, not "leave the field alone".
        if (dto.Username != null)
        {
            if (string.IsNullOrWhiteSpace(dto.Username))
                throw new InvalidOperationException("Username cannot be empty");
            var trimmedUsername = dto.Username.Trim();
            if (trimmedUsername != user.Username)
            {
                var existingByUsername = await _userRepository.GetByUsernameAsync(trimmedUsername);
                if (existingByUsername != null && existingByUsername.Id != userId)
                    throw new InvalidOperationException("Username is already taken");
                user.Username = trimmedUsername;
            }
        }

        if (dto.Email != null)
        {
            if (string.IsNullOrWhiteSpace(dto.Email))
                throw new InvalidOperationException("Email cannot be empty");
            var trimmedEmail = dto.Email.Trim();
            if (trimmedEmail != user.Email)
            {
                if (!Regex.IsMatch(trimmedEmail, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                    throw new InvalidOperationException("Invalid email format");
                var existingByEmail = await _userRepository.GetByEmailAsync(trimmedEmail);
                if (existingByEmail != null && existingByEmail.Id != userId)
                    throw new InvalidOperationException("Email is already in use");
                user.Email = trimmedEmail;
            }
        }

        if (dto.FirstName != null)
        {
            if (string.IsNullOrWhiteSpace(dto.FirstName))
                throw new InvalidOperationException("First name cannot be empty");
            user.FirstName = dto.FirstName.Trim();
        }

        if (dto.LastName != null)
        {
            if (string.IsNullOrWhiteSpace(dto.LastName))
                throw new InvalidOperationException("Last name cannot be empty");
            user.LastName = dto.LastName.Trim();
        }

        // Optional fields. Empty string explicitly clears the value; null means
        // "field not present in payload, leave it alone".
        if (dto.PhoneNumber != null)
            user.PhoneNumber = string.IsNullOrWhiteSpace(dto.PhoneNumber) ? null : dto.PhoneNumber.Trim();
        if (dto.Gender != null)
            user.Gender = string.IsNullOrWhiteSpace(dto.Gender) ? null : dto.Gender.Trim();
        if (dto.ClearDateOfBirth)
            user.DateOfBirth = null;
        else if (dto.DateOfBirth.HasValue)
            user.DateOfBirth = dto.DateOfBirth;
        // Country is required (see UpdateProfileValidator). A whitespace-only
        // or empty payload is rejected before we get here, but defense in
        // depth: if anything slips through, leave the existing value alone
        // rather than null it out.
        if (!string.IsNullOrWhiteSpace(dto.Country))
            user.Country = dto.Country.Trim();
        if (dto.Bio != null)
            user.Bio = string.IsNullOrWhiteSpace(dto.Bio) ? null : dto.Bio.Trim();
        if (dto.ProfileImageUrl != null)
            user.ProfileImageUrl = string.IsNullOrWhiteSpace(dto.ProfileImageUrl) ? null : dto.ProfileImageUrl;
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);

        return new UserProfileDto
        {
            Id = user.Id,
            Email = user.Email,
            Username = user.Username,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role,
            PhoneNumber = user.PhoneNumber,
            Gender = user.Gender,
            DateOfBirth = user.DateOfBirth,
            Country = user.Country,
            Bio = user.Bio,
            ProfileImageUrl = user.ProfileImageUrl,
            CreatedAt = user.CreatedAt
        };
    }

    public async Task DeleteAccountAsync(int userId)
    {
        await _userRepository.DeleteAsync(userId);
    }
}
