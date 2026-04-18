using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Core.Interfaces;
using Core.Exceptions;
using Application.DTOs.Common;
using Application.DTOs.Vulnerabilities;
using Application.DTOs.Scans;

namespace WebAPI.Controllers;

[ApiController]
[Route("api")]
public class VulnerabilitiesController : ControllerBase
{
    private readonly IVulnerabilityRepository _vulnerabilityRepository;
    private readonly IScanRepository _scanRepository;

    public VulnerabilitiesController(
        IVulnerabilityRepository vulnerabilityRepository,
        IScanRepository scanRepository)
    {
        _vulnerabilityRepository = vulnerabilityRepository;
        _scanRepository = scanRepository;
    }

    /// <summary>
    /// Get all vulnerabilities for a specific scan
    /// </summary>
    [HttpGet("scans/{scanId}/vulnerabilities")]
    [Authorize]
    public async Task<ActionResult<ResponseDto<IEnumerable<VulnerabilityDto>>>> GetScanVulnerabilities(int scanId)
    {
        var userId = GetCurrentUserId();
        var scan = await _scanRepository.GetByIdAsync(scanId);

        if (scan == null)
            return NotFound(new ResponseDto<IEnumerable<VulnerabilityDto>>
            {
                Success = false,
                Message = "Scan not found"
            });

        // Check authorization
        if (scan.UserId != userId)
            return Forbid();

        var vulnerabilities = await _vulnerabilityRepository.GetByScanIdAsync(scanId);

        var result = vulnerabilities.Select(v => new VulnerabilityDto
        {
            Id = v.Id,
            ScanId = v.ScanId,
            Type = v.Type,
            Severity = v.Severity,
            Description = v.Description,
            Location = v.Location,
            Recommendation = v.Recommendation,
            DetectedAt = v.DetectedAt
        });

        return Ok(new ResponseDto<IEnumerable<VulnerabilityDto>>
        {
            Success = true,
            Message = "Vulnerabilities retrieved successfully",
            Data = result
        });
    }

    /// <summary>
    /// Get vulnerabilities filtered by severity level
    /// </summary>
    [HttpGet("scans/{scanId}/vulnerabilities/severity/{severity}")]
    [Authorize]
    public async Task<ActionResult<ResponseDto<IEnumerable<VulnerabilityDto>>>> GetVulnerabilitiesBySeverity(
        int scanId, 
        string severity)
    {
        var userId = GetCurrentUserId();
        var scan = await _scanRepository.GetByIdAsync(scanId);

        if (scan == null)
            return NotFound(new ResponseDto<IEnumerable<VulnerabilityDto>>
            {
                Success = false,
                Message = "Scan not found"
            });

        if (scan.UserId != userId)
            return Forbid();

        // Validate severity
        var validSeverities = new[] { "Critical", "High", "Medium", "Low" };
        if (!validSeverities.Contains(severity, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new ResponseDto<IEnumerable<VulnerabilityDto>>
            {
                Success = false,
                Message = "Invalid severity level. Valid values: Critical, High, Medium, Low"
            });
        }

        var vulnerabilities = await _vulnerabilityRepository.GetByScanIdAndSeverityAsync(scanId, severity);

        var result = vulnerabilities.Select(v => new VulnerabilityDto
        {
            Id = v.Id,
            ScanId = v.ScanId,
            Type = v.Type,
            Severity = v.Severity,
            Description = v.Description,
            Location = v.Location,
            Recommendation = v.Recommendation,
            DetectedAt = v.DetectedAt
        });

        return Ok(new ResponseDto<IEnumerable<VulnerabilityDto>>
        {
            Success = true,
            Message = $"{severity} vulnerabilities retrieved successfully",
            Data = result
        });
    }

    /// <summary>
    /// Callback endpoint for Scanner to report vulnerabilities
    /// </summary>
    [HttpPost("vulnerabilities/callback")]
    [AllowAnonymous] // يمكن تغييرها لـ API Key authentication
    public async Task<ActionResult<ResponseDto<object>>> ReceiveVulnerability(
        [FromBody] VulnerabilityCallbackDto dto)
    {
        // Validate scan exists
        var scan = await _scanRepository.GetByIdAsync(dto.ScanId);
        if (scan == null)
        {
            return NotFound(new ResponseDto<object>
            {
                Success = false,
                Message = "Scan not found"
            });
        }

        // Create vulnerability entity
        var vulnerability = new Core.Entities.Vulnerability
        {
            ScanId = dto.ScanId,
            Type = dto.Type,
            Severity = dto.Severity,
            Description = dto.Description,
            Location = dto.Location,
            Recommendation = dto.Recommendation,
            DetectedAt = DateTime.UtcNow
        };

        await _vulnerabilityRepository.AddAsync(vulnerability);

        // Update scan vulnerability counts
        scan.TotalVulns++;
        switch (dto.Severity.ToLower())
        {
            case "critical":
                scan.CriticalCount++;
                break;
            case "high":
                scan.HighCount++;
                break;
            case "medium":
                scan.MediumCount++;
                break;
            case "low":
                scan.LowCount++;
                break;
        }

        // Update scan status to Running if still Pending
        if (scan.Status == "Pending")
        {
            scan.Status = "Running";
        }

        await _scanRepository.UpdateAsync(scan);

        return Ok(new ResponseDto<object>
        {
            Success = true,
            Message = "Vulnerability received successfully"
        });
    }

    /// <summary>
    /// Update scan status (for Scanner to mark as Completed/Failed)
    /// </summary>
    [HttpPut("scans/{scanId}/status")]
    [AllowAnonymous] // يمكن تغييرها لـ API Key authentication
    public async Task<ActionResult<ResponseDto<object>>> UpdateScanStatus(
        int scanId,
        [FromBody] UpdateScanStatusDto dto)
    {
        var scan = await _scanRepository.GetByIdAsync(scanId);
        if (scan == null)
        {
            return NotFound(new ResponseDto<object>
            {
                Success = false,
                Message = "Scan not found"
            });
        }

        // Validate status
        var validStatuses = new[] { "Pending", "Running", "Completed", "Failed" };
        if (!validStatuses.Contains(dto.Status, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new ResponseDto<object>
            {
                Success = false,
                Message = "Invalid status. Valid values: Pending, Running, Completed, Failed"
            });
        }

        scan.Status = dto.Status;

        if (dto.Status == "Completed" || dto.Status == "Failed")
        {
            scan.CompletedAt = DateTime.UtcNow;
        }

        await _scanRepository.UpdateAsync(scan);

        return Ok(new ResponseDto<object>
        {
            Success = true,
            Message = $"Scan status updated to {dto.Status}"
        });
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(userIdClaim ?? "0");
    }
}
