using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Application.Interfaces;
using Application.DTOs.Common;
using Application.DTOs.Reports;

namespace WebAPI.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportsService _reportsService;

    public ReportsController(IReportsService reportsService)
    {
        _reportsService = reportsService;
    }

    /// <summary>
    /// Generate PDF report for a scan
    /// </summary>
    [HttpPost("scans/{scanId}/reports/generate")]
    public async Task<ActionResult<ResponseDto<ReportDto>>> GenerateReport(int scanId)
    {
        var userId = GetCurrentUserId();
        var report = await _reportsService.GenerateReportAsync(scanId, userId);

        return Ok(new ResponseDto<ReportDto>
        {
            Success = true,
            Message = "Report generated successfully",
            Data = report
        });
    }

    /// <summary>
    /// Get report information
    /// </summary>
    [HttpGet("reports/{id}")]
    public async Task<ActionResult<ResponseDto<ReportDto>>> GetReport(int id)
    {
        var userId = GetCurrentUserId();
        var report = await _reportsService.GetReportByIdAsync(id, userId);

        if (report == null)
            return NotFound(new ResponseDto<ReportDto>
            {
                Success = false,
                Message = "Report not found"
            });

        return Ok(new ResponseDto<ReportDto>
        {
            Success = true,
            Message = "Report retrieved successfully",
            Data = report
        });
    }

    /// <summary>
    /// Download PDF report
    /// </summary>
    [HttpGet("reports/{id}/download")]
    public async Task<IActionResult> DownloadReport(int id)
    {
        var userId = GetCurrentUserId();
        var result = await _reportsService.DownloadReportAsync(id, userId);

        if (result == null)
            return NotFound();

        var (fileBytes, fileName) = result.Value;

        return File(fileBytes, "application/pdf", fileName);
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(userIdClaim ?? "0");
    }
}
