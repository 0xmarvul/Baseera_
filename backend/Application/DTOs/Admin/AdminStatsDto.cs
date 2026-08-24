namespace Application.DTOs.Admin;

public class AdminStatsDto
{
    public int TotalUsers { get; set; }
    public int VerifiedUsers { get; set; }
    public int UnverifiedUsers { get; set; }
    public int TotalScans { get; set; }
    public int TotalFindings { get; set; }
    public int Critical { get; set; }
    public int High { get; set; }
    public int Medium { get; set; }
    public int Low { get; set; }
}
