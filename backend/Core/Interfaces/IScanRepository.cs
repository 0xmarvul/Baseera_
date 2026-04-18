using Core.Entities;

namespace Core.Interfaces;

public interface IScanRepository : IRepository<Scan>
{
    Task<IEnumerable<Scan>> GetByUserIdAsync(int userId);
    Task<(IEnumerable<Scan> Items, int TotalCount)> GetPagedByUserIdAsync(
        int userId, 
        int pageNumber, 
        int pageSize,
        string? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string sortBy = "CreatedAt",
        string order = "desc");
}
