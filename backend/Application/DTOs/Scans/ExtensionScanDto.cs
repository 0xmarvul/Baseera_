namespace Application.DTOs.Scans;

public class ExtensionScanDto
{
    public string TargetURL { get; set; } = string.Empty;
    public int RiskScore { get; set; }
    public List<ExtensionVulnerabilityDto> Vulnerabilities { get; set; } = new();
}

public class ExtensionVulnerabilityDto
{
    public string Type { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string? Recommendation { get; set; }
}
