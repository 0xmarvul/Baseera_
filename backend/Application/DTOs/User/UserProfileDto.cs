namespace Application.DTOs.User;

public class UserProfileDto
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? Gender { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Country { get; set; }
    public string? Bio { get; set; }
    public string? ProfileImageUrl { get; set; }
    // Set while a verified email change is pending confirmation on the new
    // address. Null when there is no pending change.
    public string? PendingEmail { get; set; }
    public DateTime CreatedAt { get; set; }
}
