using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Application.DTOs.Common;
using Application.DTOs.User;
using Application.Interfaces;
using Core.Interfaces;

namespace WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IAuthService _authService;
    private readonly ILogger<UsersController> _logger;

    public UsersController(IUserService userService, IAuthService authService, ILogger<UsersController> logger)
    {
        _userService = userService;
        _authService = authService;
        _logger = logger;
    }

    /// <summary>
    /// Get current user's profile
    /// </summary>
    [HttpGet("profile")]
    public async Task<ActionResult<ResponseDto<UserProfileDto>>> GetProfile()
    {
        var userId = GetCurrentUserId();
        var profile = await _userService.GetProfileAsync(userId);

        if (profile == null)
            return NotFound(new ResponseDto<UserProfileDto>
            {
                Success = false,
                Message = "User not found"
            });

        return Ok(new ResponseDto<UserProfileDto>
        {
            Success = true,
            Message = "Profile retrieved successfully",
            Data = profile
        });
    }

    /// <summary>
    /// Update current user's profile
    /// </summary>
    [HttpPut("profile")]
    public async Task<ActionResult<ResponseDto<UserProfileDto>>> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var profile = await _userService.UpdateProfileAsync(userId, dto);

            return Ok(new ResponseDto<UserProfileDto>
            {
                Success = true,
                Message = "Profile updated successfully",
                Data = profile
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update profile for user");
            return BadRequest(new ResponseDto<UserProfileDto>
            {
                Success = false,
                Message = ex.Message
            });
        }
    }

    /// <summary>
    /// Delete current user's account
    /// </summary>
    [HttpDelete("profile")]
    public async Task<ActionResult<ResponseDto<object>>> DeleteProfile()
    {
        try
        {
            var userId = GetCurrentUserId();
            await _userService.DeleteAccountAsync(userId);

            return Ok(new ResponseDto<object>
            {
                Success = true,
                Message = "Account deleted successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete account for user");
            return BadRequest(new ResponseDto<object>
            {
                Success = false,
                Message = "Failed to delete account. Please try again."
            });
        }
    }

    /// <summary>
    /// Change current user's password
    /// </summary>
    [HttpPut("change-password")]
    public async Task<ActionResult<ResponseDto<object>>> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            await _authService.ChangePasswordAsync(userId, dto.NewPassword);

            return Ok(new ResponseDto<object>
            {
                Success = true,
                Message = "Password changed successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to change password for user");
            return BadRequest(new ResponseDto<object>
            {
                Success = false,
                Message = ex.Message
            });
        }
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Invalid or missing user identity claim");
        return userId;
    }
}
