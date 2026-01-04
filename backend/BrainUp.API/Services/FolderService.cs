using BrainUp.API.Data;
using BrainUp.API.Models;
using Microsoft.EntityFrameworkCore;

namespace BrainUp.API.Services;

public class FolderService(BrainUpContext context)
{
    private readonly BrainUpContext _context = context;

    public async Task<IEnumerable<Folder>> GetAllByUserIdAsync(Guid userId)
    {
        return await _context.Folders
            .Where(f => f.UserId == userId)
            .Include(f => f.Quizzes)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();
    }

    public async Task<Folder?> GetByIdAsync(Guid id, Guid userId)
    {
        return await _context.Folders
            .Include(f => f.Quizzes)
            .FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
    }

    public async Task<Folder> CreateAsync(Folder folder)
    {
        folder.Id = Guid.NewGuid();
        folder.CreatedAt = DateTime.UtcNow;
        
        _context.Folders.Add(folder);
        await _context.SaveChangesAsync();
        
        return folder;
    }

    public async Task<Folder?> UpdateAsync(Guid id, Guid userId, string name)
    {
        var folder = await _context.Folders
            .FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        
        if (folder == null)
            return null;
        
        folder.Name = name;
        await _context.SaveChangesAsync();
        
        return folder;
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId)
    {
        var folder = await _context.Folders
            .FirstOrDefaultAsync(f => f.Id == id && f.UserId == userId);
        
        if (folder == null)
            return false;
        
        _context.Folders.Remove(folder);
        await _context.SaveChangesAsync();
        
        return true;
    }
}
