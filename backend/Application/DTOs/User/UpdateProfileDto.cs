namespace Application.DTOs.User;

public class UpdateProfileDto
{
    public string? Username { get; set; }
    public string? Email { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Gender { get; set; }
    public DateTime? DateOfBirth { get; set; }

    // Explicit flag: when true, DateOfBirth is wiped to null on the server.
    // Without this we can't distinguish "user left DOB unchanged" (null) from
    // "user wants to clear DOB" (also null).
    public bool ClearDateOfBirth { get; set; }

    public string? Country { get; set; }
    public string? Bio { get; set; }
    public string? ProfileImageUrl { get; set; }
}
