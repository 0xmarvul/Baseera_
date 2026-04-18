namespace Application.DTOs.Scans;

public class ScanDto
{
    public int Id { get; set; }
    public string TargetURL { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int TotalVulns { get; set; }
    public int CriticalCount { get; set; }
    public int HighCount { get; set; }
    public int MediumCount { get; set; }
    public int LowCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
