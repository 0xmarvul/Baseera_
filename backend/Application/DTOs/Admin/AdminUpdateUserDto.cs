namespace Application.DTOs.Admin;

// Every field optional: admin PATCHes only what changed. Booleans use nullable
// so "not sent" is distinct from "set to false".
public class AdminUpdateUserDto
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Username { get; set; }
    public string? Email { get; set; }
    public string? Country { get; set; }
    public string? Role { get; set; }
    public bool? IsActive { get; set; }
    public bool? IsEmailVerified { get; set; }
}
