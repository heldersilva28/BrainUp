using BrainUp.API.Data;
using BrainUp.API.Models;
using Microsoft.EntityFrameworkCore;

namespace BrainUp.API.Services
{
    public class QuestionTypeService(BrainUpContext context)
    {
        private readonly BrainUpContext _context = context;

        public async Task<List<QuestionType>> GetAll()
        {
            return await _context.QuestionTypes
                .OrderBy(q => q.Id)
                .ToListAsync();
        }

        public async Task<QuestionType?> GetById(int id)
        {
            return await _context.QuestionTypes
                .FirstOrDefaultAsync(q => q.Id == id);
        }
    }
}
