namespace Application.DTOs.Admin;

public class AdminUserDto
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string? Country { get; set; }
    public string Role { get; set; } = "User";
    public bool IsEmailVerified { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }

    // Per-user scan activity, aggregated from their scans.
    public int ScanCount { get; set; }
    public int TotalFindings { get; set; }
    public int Critical { get; set; }
    public int High { get; set; }
    public int Medium { get; set; }
    public int Low { get; set; }
}
