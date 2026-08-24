using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Application.DTOs.Admin;
using Application.DTOs.Common;
using Application.Interfaces;

namespace WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;
    private readonly ILogger<AdminController> _logger;

    public AdminController(IAdminService adminService, ILogger<AdminController> logger)
    {
        _adminService = adminService;
        _logger = logger;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<ResponseDto<AdminStatsDto>>> GetStats()
    {
        var stats = await _adminService.GetStatsAsync();
        return Ok(new ResponseDto<AdminStatsDto> { Success = true, Message = "OK", Data = stats });
    }

    [HttpGet("users")]
    public async Task<ActionResult<ResponseDto<List<AdminUserDto>>>> GetUsers()
    {
        var users = await _adminService.GetUsersAsync();
        return Ok(new ResponseDto<List<AdminUserDto>> { Success = true, Message = "OK", Data = users });
    }

    [HttpPut("users/{id}")]
    public async Task<ActionResult<ResponseDto<AdminUserDto>>> UpdateUser(int id, [FromBody] AdminUpdateUserDto dto)
    {
        try
        {
            var user = await _adminService.UpdateUserAsync(id, dto);
            return Ok(new ResponseDto<AdminUserDto> { Success = true, Message = "User updated", Data = user });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Admin failed to update user {Id}", id);
            return BadRequest(new ResponseDto<AdminUserDto> { Success = false, Message = ex.Message });
        }
    }

    [HttpPost("users/{id}/reset-password")]
    public async Task<ActionResult<ResponseDto<object>>> ResetPassword(int id, CancellationToken ct)
    {
        try
        {
            await _adminService.ResetUserPasswordAsync(id, ct);
            return Ok(new ResponseDto<object> { Success = true, Message = "Password reset email sent to the user." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Admin failed to reset password for user {Id}", id);
            return BadRequest(new ResponseDto<object> { Success = false, Message = ex.Message });
        }
    }

    [HttpDelete("users/{id}")]
    public async Task<ActionResult<ResponseDto<object>>> DeleteUser(int id)
    {
        try
        {
            await _adminService.DeleteUserAsync(id);
            return Ok(new ResponseDto<object> { Success = true, Message = "User deleted" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Admin failed to delete user {Id}", id);
            return BadRequest(new ResponseDto<object> { Success = false, Message = "Failed to delete user. Please try again." });
        }
    }
}
