using Microsoft.EntityFrameworkCore;
using Core.Entities;
using Core.Interfaces;
using Infrastructure.Data;

namespace Infrastructure.Repositories;

public class ReportRepository : GenericRepository<Report>, IReportRepository
{
    public ReportRepository(SecurityScannerDbContext context) : base(context)
    {
    }

    public async Task<Report?> GetByScanIdAsync(int scanId)
    {
        return await _dbSet
            .Where(r => r.ScanId == scanId)
            .OrderByDescending(r => r.GeneratedAt)
            .FirstOrDefaultAsync();
    }

    public async Task<IEnumerable<Report>> GetAllByScanIdAsync(int scanId)
    {
        return await _dbSet
            .Where(r => r.ScanId == scanId)
            .OrderByDescending(r => r.GeneratedAt)
            .ToListAsync();
    }
}
