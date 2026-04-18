using Application.DTOs.Reports;

namespace Application.Interfaces;

public interface IReportsService
{
    Task<ReportDto> GenerateReportAsync(int scanId, int userId);
    Task<ReportDto?> GetReportByIdAsync(int reportId, int userId);
    Task<(byte[] FileBytes, string FileName)?> DownloadReportAsync(int reportId, int userId);
}
