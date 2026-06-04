namespace Application.DTOs.User;

using System.ComponentModel.DataAnnotations;

public class ChangePasswordDto
{
    [Required]
    [MinLength(8)]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$",
        ErrorMessage = "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a digit, and a special character.")]
    public string NewPassword { get; set; } = string.Empty;
}
