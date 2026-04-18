namespace Application.DTOs.User;

using System.ComponentModel.DataAnnotations;

public class ChangePasswordDto
{
    [Required]
    [MinLength(6)]
    public string NewPassword { get; set; } = string.Empty;
}
