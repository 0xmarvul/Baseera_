namespace Application.DTOs.Reports;

public class ReportDto
{
    public int Id { get; set; }
    public int ScanId { get; set; }
    public string Format { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
}
