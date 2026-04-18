using Microsoft.EntityFrameworkCore;
using Core.Entities;
using Core.Interfaces;
using Infrastructure.Data;

namespace Infrastructure.Repositories;

public class ScanRepository : GenericRepository<Scan>, IScanRepository
{
    public ScanRepository(SecurityScannerDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Scan>> GetByUserIdAsync(int userId)
    {
        return await _dbSet
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
    }

    public async Task<(IEnumerable<Scan> Items, int TotalCount)> GetPagedByUserIdAsync(
        int userId,
        int pageNumber,
        int pageSize,
        string? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null,
        string sortBy = "CreatedAt",
        string order = "desc")
    {
        var query = _dbSet.Where(s => s.UserId == userId);

        // Apply filters
        if (!string.IsNullOrEmpty(status))
        {
            query = query.Where(s => s.Status.ToLower() == status.ToLower());
        }

        if (fromDate.HasValue)
        {
            query = query.Where(s => s.CreatedAt >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(s => s.CreatedAt <= toDate.Value);
        }

        // Get total count before pagination
        var totalCount = await query.CountAsync();

        // Apply sorting
        query = sortBy.ToLower() switch
        {
            "createdat" => order.ToLower() == "asc" 
                ? query.OrderBy(s => s.CreatedAt) 
                : query.OrderByDescending(s => s.CreatedAt),
            "targeturl" => order.ToLower() == "asc" 
                ? query.OrderBy(s => s.TargetURL) 
                : query.OrderByDescending(s => s.TargetURL),
            "status" => order.ToLower() == "asc" 
                ? query.OrderBy(s => s.Status) 
                : query.OrderByDescending(s => s.Status),
            "totalvulns" => order.ToLower() == "asc" 
                ? query.OrderBy(s => s.TotalVulns) 
                : query.OrderByDescending(s => s.TotalVulns),
            _ => query.OrderByDescending(s => s.CreatedAt)
        };

        // Apply pagination
        var items = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, totalCount);
    }
}
