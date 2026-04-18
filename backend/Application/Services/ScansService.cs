using Core.Entities;
using Core.Interfaces;
using Core.Exceptions;
using Application.DTOs.Common;
using Application.DTOs.Scans;
using Application.Interfaces;

namespace Application.Services;

public class ScansService : IScansService
{
    private readonly IScanRepository _scanRepository;
    private readonly IVulnerabilityRepository _vulnerabilityRepository;

    public ScansService(IScanRepository scanRepository, IVulnerabilityRepository vulnerabilityRepository)
    {
        _scanRepository = scanRepository;
        _vulnerabilityRepository = vulnerabilityRepository;
    }

    public async Task<ScanDto> CreateScanAsync(CreateScanDto createScanDto, int userId)
    {
        var scan = new Scan
        {
            UserId = userId,
            TargetURL = createScanDto.TargetURL,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };

        await _scanRepository.AddAsync(scan);

        return new ScanDto
        {
            Id = scan.Id,
            TargetURL = scan.TargetURL,
            Status = scan.Status,
            TotalVulns = scan.TotalVulns,
            CriticalCount = scan.CriticalCount,
            HighCount = scan.HighCount,
            MediumCount = scan.MediumCount,
            LowCount = scan.LowCount,
            CreatedAt = scan.CreatedAt,
            CompletedAt = scan.CompletedAt
        };
    }

    public async Task<ScanDto> CreateExtensionScanAsync(ExtensionScanDto extensionScanDto, int userId)
    {
        var vulns = extensionScanDto.Vulnerabilities ?? new List<ExtensionVulnerabilityDto>();
        var criticalCount = vulns.Count(v => v.Severity.Equals("Critical", StringComparison.OrdinalIgnoreCase));
        var highCount = vulns.Count(v => v.Severity.Equals("High", StringComparison.OrdinalIgnoreCase));
        var mediumCount = vulns.Count(v => v.Severity.Equals("Medium", StringComparison.OrdinalIgnoreCase));
        var lowCount = vulns.Count(v => v.Severity.Equals("Low", StringComparison.OrdinalIgnoreCase));

        var scan = new Scan
        {
            UserId = userId,
            TargetURL = extensionScanDto.TargetURL,
            Status = "Completed",
            TotalVulns = vulns.Count,
            CriticalCount = criticalCount,
            HighCount = highCount,
            MediumCount = mediumCount,
            LowCount = lowCount,
            CreatedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow
        };

        await _scanRepository.AddAsync(scan);

        foreach (var v in vulns)
        {
            var vuln = new Vulnerability
            {
                ScanId = scan.Id,
                Type = v.Type,
                Severity = v.Severity,
                Description = v.Description,
                Location = v.Location,
                Recommendation = v.Recommendation,
                DetectedAt = DateTime.UtcNow
            };
            await _vulnerabilityRepository.AddAsync(vuln);
        }

        return new ScanDto
        {
            Id = scan.Id,
            TargetURL = scan.TargetURL,
            Status = scan.Status,
            TotalVulns = scan.TotalVulns,
            CriticalCount = scan.CriticalCount,
            HighCount = scan.HighCount,
            MediumCount = scan.MediumCount,
            LowCount = scan.LowCount,
            CreatedAt = scan.CreatedAt,
            CompletedAt = scan.CompletedAt
        };
    }

    public async Task<IEnumerable<ScanDto>> GetUserScansAsync(int userId)
    {
        var scans = await _scanRepository.GetByUserIdAsync(userId);

        return scans.Select(s => new ScanDto
        {
            Id = s.Id,
            TargetURL = s.TargetURL,
            Status = s.Status,
            TotalVulns = s.TotalVulns,
            CriticalCount = s.CriticalCount,
            HighCount = s.HighCount,
            MediumCount = s.MediumCount,
            LowCount = s.LowCount,
            CreatedAt = s.CreatedAt,
            CompletedAt = s.CompletedAt
        });
    }

    public async Task<PagedResultDto<ScanDto>> GetPagedUserScansAsync(int userId, ScanFilterParamsDto filterParams)
    {
        var (items, totalCount) = await _scanRepository.GetPagedByUserIdAsync(
            userId,
            filterParams.PageNumber,
            filterParams.PageSize,
            filterParams.Status,
            filterParams.FromDate,
            filterParams.ToDate,
            filterParams.SortBy ?? "CreatedAt",
            filterParams.Order ?? "desc"
        );

        var scanDtos = items.Select(s => new ScanDto
        {
            Id = s.Id,
            TargetURL = s.TargetURL,
            Status = s.Status,
            TotalVulns = s.TotalVulns,
            CriticalCount = s.CriticalCount,
            HighCount = s.HighCount,
            MediumCount = s.MediumCount,
            LowCount = s.LowCount,
            CreatedAt = s.CreatedAt,
            CompletedAt = s.CompletedAt
        });

        return new PagedResultDto<ScanDto>
        {
            Items = scanDtos,
            TotalCount = totalCount,
            PageNumber = filterParams.PageNumber,
            PageSize = filterParams.PageSize
        };
    }

    public async Task<ScanDto?> GetScanByIdAsync(int scanId, int userId)
    {
        var scan = await _scanRepository.GetByIdAsync(scanId);

        if (scan == null || scan.UserId != userId)
            return null;

        return new ScanDto
        {
            Id = scan.Id,
            TargetURL = scan.TargetURL,
            Status = scan.Status,
            TotalVulns = scan.TotalVulns,
            CriticalCount = scan.CriticalCount,
            HighCount = scan.HighCount,
            MediumCount = scan.MediumCount,
            LowCount = scan.LowCount,
            CreatedAt = scan.CreatedAt,
            CompletedAt = scan.CompletedAt
        };
    }

    public async Task<ScanDto> UpdateScanStatusAsync(int scanId, UpdateScanStatusDto updateStatusDto, int userId)
    {
        var scan = await _scanRepository.GetByIdAsync(scanId);

        if (scan == null)
            throw new NotFoundException("Scan not found");

        if (scan.UserId != userId)
            throw new UnauthorizedAccessException("You don't have access to this scan");

        scan.Status = updateStatusDto.Status;

        if (updateStatusDto.Status.ToLower() == "completed")
        {
            scan.CompletedAt = DateTime.UtcNow;
        }

        await _scanRepository.UpdateAsync(scan);

        return new ScanDto
        {
            Id = scan.Id,
            TargetURL = scan.TargetURL,
            Status = scan.Status,
            TotalVulns = scan.TotalVulns,
            CriticalCount = scan.CriticalCount,
            HighCount = scan.HighCount,
            MediumCount = scan.MediumCount,
            LowCount = scan.LowCount,
            CreatedAt = scan.CreatedAt,
            CompletedAt = scan.CompletedAt
        };
    }

    public async Task DeleteScanAsync(int scanId, int userId)
    {
        var scan = await _scanRepository.GetByIdAsync(scanId);

        if (scan == null)
            throw new NotFoundException("Scan not found");

        if (scan.UserId != userId)
            throw new UnauthorizedAccessException("You don't have access to this scan");

        await _scanRepository.DeleteAsync(scan.Id);
    }

    public async Task ClearAllScansAsync(int userId)
    {
        var scans = await _scanRepository.GetByUserIdAsync(userId);
        foreach (var scan in scans)
        {
            await _scanRepository.DeleteAsync(scan.Id);
        }
    }
}
