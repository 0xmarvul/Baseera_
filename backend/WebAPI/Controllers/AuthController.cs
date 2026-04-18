using Microsoft.AspNetCore.Mvc;
using Core.Interfaces;
using Application.DTOs.Auth;
using Application.DTOs.Common;
using Application.DTOs.Password;

namespace WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<ActionResult<ResponseDto<string>>> Register([FromBody] RegisterDto registerDto)
    {
        try
        {
            var token = await _authService.RegisterAsync(
                registerDto.Email,
                registerDto.Username,
                registerDto.FirstName,
                registerDto.LastName,
                registerDto.Password,
                registerDto.PhoneNumber,
                registerDto.Gender,
                registerDto.DateOfBirth,
                registerDto.Country,
                registerDto.Bio
            );

            return Ok(new ResponseDto<string>
            {
                Success = true,
                Message = "User registered successfully",
                Data = token
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Registration failed for email: {Email}", registerDto.Email);
            return BadRequest(new ResponseDto<string>
            {
                Success = false,
                Message = ex.Message,
                Data = null
            });
        }
    }

    [HttpPost("login")]
    public async Task<ActionResult<ResponseDto<string>>> Login([FromBody] LoginDto loginDto)
    {
        try
        {
            var token = await _authService.LoginAsync(loginDto.Email, loginDto.Password);

            return Ok(new ResponseDto<string>
            {
                Success = true,
                Message = "Login successful",
                Data = token
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning("Login failed for email: {Email}", loginDto.Email);
            return Unauthorized(new ResponseDto<string>
            {
                Success = false,
                Message = ex.Message,
                Data = null
            });
        }
    }

    [HttpPost("validate-token")]
    public async Task<ActionResult<ResponseDto<bool>>> ValidateToken([FromBody] string token)
    {
        var isValid = await _authService.ValidateTokenAsync(token);

        return Ok(new ResponseDto<bool>
        {
            Success = isValid,
            Message = isValid ? "Token is valid" : "Token is invalid",
            Data = isValid
        });
    }

    [HttpPost("forgot-password")]
    public async Task<ActionResult<ResponseDto<string>>> ForgotPassword([FromBody] ForgotPasswordDto dto, CancellationToken ct)
    {
        try
        {
            await _authService.ForgotPasswordAsync(dto.Email, ct);
            return Ok(new ResponseDto<string>
            {
                Success = true,
                Message = "If an account with that email exists, a reset link has been sent.",
                Data = null
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Forgot password failed for email: {Email}", dto.Email);
            return BadRequest(new ResponseDto<string>
            {
                Success = false,
                Message = "An error occurred. Please try again.",
                Data = null
            });
        }
    }

    [HttpPost("reset-password")]
    public async Task<ActionResult<ResponseDto<string>>> ResetPassword([FromBody] ResetPasswordDto dto, CancellationToken ct)
    {
        try
        {
            await _authService.ResetPasswordAsync(dto.Email, dto.Token, dto.NewPassword, ct);
            return Ok(new ResponseDto<string>
            {
                Success = true,
                Message = "Password reset successfully.",
                Data = null
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new ResponseDto<string>
            {
                Success = false,
                Message = ex.Message,
                Data = null
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ResponseDto<string>
            {
                Success = false,
                Message = ex.Message,
                Data = null
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Reset password failed for email: {Email}", dto.Email);
            return BadRequest(new ResponseDto<string>
            {
                Success = false,
                Message = "An error occurred. Please try again.",
                Data = null
            });
        }
    }

    [HttpPost("verify-email")]
    public async Task<ActionResult<ResponseDto<string>>> VerifyEmail([FromBody] VerifyEmailDto dto, CancellationToken ct)
    {
        try
        {
            await _authService.VerifyEmailAsync(dto.Email, dto.Token, ct);
            return Ok(new ResponseDto<string>
            {
                Success = true,
                Message = "Email verified successfully.",
                Data = null
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new ResponseDto<string>
            {
                Success = false,
                Message = ex.Message,
                Data = null
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ResponseDto<string>
            {
                Success = false,
                Message = ex.Message,
                Data = null
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Email verification failed for email: {Email}", dto.Email);
            return BadRequest(new ResponseDto<string>
            {
                Success = false,
                Message = "An error occurred. Please try again.",
                Data = null
            });
        }
    }

    [HttpPost("resend-verification")]
    public async Task<ActionResult<ResponseDto<string>>> ResendVerification([FromBody] ResendVerificationDto dto, CancellationToken ct)
    {
        try
        {
            await _authService.ResendVerificationEmailAsync(dto.Email, ct);
            return Ok(new ResponseDto<string>
            {
                Success = true,
                Message = "If your email is registered and not yet verified, a new verification link has been sent.",
                Data = null
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Resend verification failed for email: {Email}", dto.Email);
            return BadRequest(new ResponseDto<string>
            {
                Success = false,
                Message = "An error occurred. Please try again.",
                Data = null
            });
        }
    }
}
