namespace Core.Entities;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "User";
    public bool IsActive { get; set; } = true;
    public bool IsEmailVerified { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Gender { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Country { get; set; }
    public string? Bio { get; set; }
    public string? ProfileImageUrl { get; set; }

    // Verified email-change flow. When a user asks to change their email we
    // stash the requested address here and email a confirmation link to it.
    // The account's real Email is only swapped once that link is confirmed,
    // so an unconfirmed change leaves the original address intact.
    public string? PendingEmail { get; set; }
    public string? EmailChangeTokenHash { get; set; }
    public DateTime? EmailChangeTokenExpiresAtUtc { get; set; }

    // Navigation Properties
    public ICollection<Scan> Scans { get; set; } = new List<Scan>();
}
