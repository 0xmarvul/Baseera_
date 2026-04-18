namespace Core.Entities;

public class Report
{
    public int Id { get; set; }
    public int ScanId { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public string Format { get; set; } = "PDF";
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation Properties
    public Scan Scan { get; set; } = null!;
}
