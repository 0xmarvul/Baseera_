namespace Application.DTOs.Scans;

public class UpdateScanStatusDto
{
    public string Status { get; set; } = string.Empty; // "Completed", "Failed", "Running"
}
