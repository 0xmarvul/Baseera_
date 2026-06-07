namespace Application.DTOs.User;

using System.ComponentModel.DataAnnotations;

public class ChangePasswordDto
{
    // Current password is required so a stolen JWT alone is not enough
    // to take over an account. Verified against the stored hash before
    // any change is applied.
    [Required(ErrorMessage = "Current password is required.")]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$",
        ErrorMessage = "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a digit, and a special character.")]
    public string NewPassword { get; set; } = string.Empty;
}
