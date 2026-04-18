using System.IO;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using Core.Entities;
using Core.Interfaces;
using Core.Exceptions;
using Application.DTOs.Reports;
using Application.Interfaces;

namespace Application.Services;

public class ReportsService : IReportsService
{
    private readonly IReportRepository _reportRepository;
    private readonly IScanRepository _scanRepository;
    private readonly IVulnerabilityRepository _vulnerabilityRepository;
    private readonly IUserRepository _userRepository;
    private readonly string _reportsPath;

    public ReportsService(
        IReportRepository reportRepository,
        IScanRepository scanRepository,
        IVulnerabilityRepository vulnerabilityRepository,
        IUserRepository userRepository)
    {
        _reportRepository = reportRepository;
        _scanRepository = scanRepository;
        _vulnerabilityRepository = vulnerabilityRepository;
        _userRepository = userRepository;
        
        QuestPDF.Settings.License = LicenseType.Community;
        
        _reportsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "Reports");
        if (!Directory.Exists(_reportsPath))
        {
            Directory.CreateDirectory(_reportsPath);
        }
    }

    public async Task<ReportDto> GenerateReportAsync(int scanId, int userId)
    {
        var scan = await _scanRepository.GetByIdAsync(scanId);
        if (scan == null)
            throw new NotFoundException("Scan not found");

        if (scan.UserId != userId)
            throw new UnauthorizedAccessException("You don't have access to this scan");

        var vulnerabilities = await _vulnerabilityRepository.GetByScanIdAsync(scanId);
        var user = await _userRepository.GetByIdAsync(userId);

        var fileName = $"report_{scanId}_{DateTime.UtcNow:yyyyMMddHHmmss}.pdf";
        var filePath = Path.Combine(_reportsPath, fileName);

        GeneratePdfDocument(scan, vulnerabilities.ToList(), user!, filePath);

        var report = new Report
        {
            ScanId = scanId,
            Format = "PDF",
            FilePath = $"Reports/{fileName}",
            GeneratedAt = DateTime.UtcNow
        };

        await _reportRepository.AddAsync(report);

        return new ReportDto
        {
            Id = report.Id,
            ScanId = report.ScanId,
            Format = report.Format,
            FilePath = report.FilePath,
            GeneratedAt = report.GeneratedAt
        };
    }

    public async Task<ReportDto?> GetReportByIdAsync(int reportId, int userId)
    {
        var report = await _reportRepository.GetByIdAsync(reportId);
        if (report == null)
            return null;

        var scan = await _scanRepository.GetByIdAsync(report.ScanId);
        if (scan == null || scan.UserId != userId)
            throw new UnauthorizedAccessException("You don't have access to this report");

        return new ReportDto
        {
            Id = report.Id,
            ScanId = report.ScanId,
            Format = report.Format,
            FilePath = report.FilePath,
            GeneratedAt = report.GeneratedAt
        };
    }

    public async Task<(byte[] FileBytes, string FileName)?> DownloadReportAsync(int reportId, int userId)
    {
        var report = await _reportRepository.GetByIdAsync(reportId);
        if (report == null)
            return null;

        var scan = await _scanRepository.GetByIdAsync(report.ScanId);
        if (scan == null || scan.UserId != userId)
            throw new UnauthorizedAccessException("You don't have access to this report");

        var fullPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", report.FilePath);
        
        if (!File.Exists(fullPath))
            throw new NotFoundException("Report file not found");

        var fileBytes = await File.ReadAllBytesAsync(fullPath);
        var fileName = $"Security_Report_{scan.TargetURL.Replace("https://", "").Replace("http://", "").Replace("/", "_")}.pdf";

        return (fileBytes, fileName);
    }

    private void GeneratePdfDocument(Scan scan, List<Vulnerability> vulnerabilities, User user, string filePath)
    {
        var document = QuestPDF.Fluent.Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);

                page.Header().Height(80).Background(Colors.Blue.Darken3).Padding(15).AlignCenter().Column(col =>
                {
                    col.Item().Text("SECURITY VULNERABILITY SCAN REPORT").FontSize(18).Bold().FontColor(Colors.White);
                });

                page.Content().PaddingVertical(15).Column(column =>
                {
                    column.Item().Text("SCAN INFORMATION").FontSize(14).Bold();
                    column.Item().PaddingBottom(5);
                    column.Item().Text($"Target: {scan.TargetURL}");
                    column.Item().Text($"Date: {scan.CreatedAt:yyyy-MM-dd HH:mm:ss}");
                    column.Item().Text($"Status: {scan.Status}");
                    
                    column.Item().PaddingTop(15).Text("SUMMARY").FontSize(14).Bold();
                    column.Item().PaddingBottom(5);
                    column.Item().Text($"Total Vulnerabilities: {scan.TotalVulns}");
                    column.Item().Text($"Critical: {scan.CriticalCount} | High: {scan.HighCount} | Medium: {scan.MediumCount} | Low: {scan.LowCount}");

                    if (vulnerabilities.Any())
                    {
                        column.Item().PaddingTop(15).Text("VULNERABILITIES").FontSize(14).Bold();
                        
                        int counter = 1;
                        foreach (var vuln in vulnerabilities)
                        {
                            column.Item().PaddingTop(10).Border(1).Padding(10).Column(vCol =>
                            {
                                vCol.Item().Text($"{counter}. {vuln.Type} - {vuln.Severity}").Bold();
                                vCol.Item().Text($"Location: {vuln.Location}").FontSize(10);
                                vCol.Item().Text($"Description: {vuln.Description}").FontSize(10);
                                if (!string.IsNullOrEmpty(vuln.Recommendation))
                                    vCol.Item().Text($"Fix: {vuln.Recommendation}").FontSize(10).Italic();
                            });
                            counter++;
                        }
                    }
                });

                page.Footer().Height(40).Background(Colors.Grey.Lighten3).Padding(10).AlignCenter().Column(col =>
                {
                    col.Item().Text($"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} | User: {user.Email}").FontSize(9);
                });
            });
        });

        document.GeneratePdf(filePath);
    }
}
