namespace Core.Entities;

public class Scan
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string TargetURL { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public int TotalVulns { get; set; }
    public int CriticalCount { get; set; }
    public int HighCount { get; set; }
    public int MediumCount { get; set; }
    public int LowCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    
    // Navigation properties
    public User User { get; set; } = null!;
    public ICollection<Vulnerability> Vulnerabilities { get; set; } = new List<Vulnerability>();
    public ICollection<Report> Reports { get; set; } = new List<Report>();
}
