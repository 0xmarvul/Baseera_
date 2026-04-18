using Application.DTOs.Common;
using Application.DTOs.Scans;

namespace Application.Interfaces;

public interface IScansService
{
    Task<ScanDto> CreateScanAsync(CreateScanDto createScanDto, int userId);
    Task<ScanDto> CreateExtensionScanAsync(ExtensionScanDto extensionScanDto, int userId);
    Task<IEnumerable<ScanDto>> GetUserScansAsync(int userId);
    Task<PagedResultDto<ScanDto>> GetPagedUserScansAsync(int userId, ScanFilterParamsDto filterParams);
    Task<ScanDto?> GetScanByIdAsync(int scanId, int userId);
    Task<ScanDto> UpdateScanStatusAsync(int scanId, UpdateScanStatusDto updateStatusDto, int userId);
    Task DeleteScanAsync(int scanId, int userId);
    Task ClearAllScansAsync(int userId);
}
