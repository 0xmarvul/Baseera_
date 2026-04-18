using Core.Entities;

namespace Core.Interfaces;

public interface IReportRepository : IRepository<Report>
{
    Task<Report?> GetByScanIdAsync(int scanId);
    Task<IEnumerable<Report>> GetAllByScanIdAsync(int scanId);
}
