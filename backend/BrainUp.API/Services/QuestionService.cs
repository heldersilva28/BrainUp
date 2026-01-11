using BrainUp.API.Data;
using BrainUp.API.DTOs.Questions;
using BrainUp.API.Models;
using Microsoft.EntityFrameworkCore;

namespace BrainUp.API.Services
{
    public class QuestionService(BrainUpContext context)
    {
        private readonly BrainUpContext _context = context;

        // -------------------------------------------------------
        // CREATE
        // -------------------------------------------------------
        public async Task<QuestionDto?> CreateQuestion(Guid authorId, QuestionCreateDto dto)
        {
            // validar tipo
            var type = await _context.QuestionTypes
                .FirstOrDefaultAsync(t => t.Id == dto.TypeId);

            if (type == null)
                return null;

            var question = new Question
            {
                Id = Guid.NewGuid(),
                AuthorId = authorId,
                QuestionText = dto.QuestionText,
                TypeId = dto.TypeId
            };

            // adicionar opções
            foreach (var opt in dto.Options)
            {
                question.QuestionOptions.Add(new QuestionOption
                {
                    Id = Guid.NewGuid(),
                    OptionText = opt.OptionText,
                    IsCorrect = opt.IsCorrect,
                    CorrectOrder = opt.CorrectOrder
                });
            }

            _context.Questions.Add(question);
            await _context.SaveChangesAsync();

            return await BuildQuestionDto(question.Id);
        }

        // -------------------------------------------------------
        // GET BY ID
        // -------------------------------------------------------
        public async Task<QuestionDto?> GetById(Guid id)
        {
            return await BuildQuestionDto(id);
        }

        // -------------------------------------------------------
        // GET MY QUESTIONS
        // -------------------------------------------------------
        public async Task<List<QuestionDto>> GetByAuthor(Guid authorId)
        {
            var list = await _context.Questions
                .Include(q => q.Type)
                .Include(q => q.QuestionOptions)
                .Where(q => q.AuthorId == authorId)
                .OrderByDescending(q => q.CreatedAt)
                .ToListAsync();

            return [.. list.Select(q => new QuestionDto
            {
                Id = q.Id,
                QuestionText = q.QuestionText,
                Type = q.Type.Name,
                CreatedAt = q.CreatedAt,
                Options = [.. q.QuestionOptions.Select(o => new QuestionOptionResponseDto
                {
                    Id = o.Id,
                    OptionText = o.OptionText,
                    IsCorrect = o.IsCorrect ?? false,
                    CorrectOrder = o.CorrectOrder
                })]
            })];
        }

        // -------------------------------------------------------
        // GET QUESTIONS FROM QUIZ
        // -------------------------------------------------------
        public async Task<List<QuestionDto>> GetFromQuiz(Guid quizId, Guid authorId)
        {
            var quizExists = await _context.Quizzes
                .AnyAsync(q => q.Id == quizId && q.AuthorId == authorId);

            if (!quizExists) return new List<QuestionDto>();

            var questionIds = await _context.QuizQuestions
                .Where(qq => qq.QuizId == quizId)
                .Select(qq => qq.QuestionId)
                .ToListAsync();

            var questions = await _context.Questions
                .Include(q => q.Type)
                .Include(q => q.QuestionOptions)
                .Where(q => questionIds.Contains(q.Id))
                .ToListAsync();

            return questions.Select(q => new QuestionDto
            {
                Id = q.Id,
                QuestionText = q.QuestionText,
                Type = q.Type.Name,
                CreatedAt = q.CreatedAt,
                Options = q.QuestionOptions.Select(o => new QuestionOptionResponseDto
                {
                    Id = o.Id,
                    OptionText = o.OptionText,
                    IsCorrect = o.IsCorrect ?? false,
                    CorrectOrder = o.CorrectOrder
                }).ToList(),
                Order = questionIds.IndexOf(q.Id)
            }).ToList();
        }

        // -------------------------------------------------------
        // UPDATE
        // -------------------------------------------------------
        public async Task<QuestionDto?> UpdateQuestion(Guid id, Guid authorId, QuestionUpdateDto dto)
        {
            var question = await _context.Questions
                .Include(q => q.QuestionOptions)
                .FirstOrDefaultAsync(q => q.Id == id && q.AuthorId == authorId);

            if (question == null) return null;

            if (dto.QuestionText != null)
                question.QuestionText = dto.QuestionText;

            if (dto.TypeId.HasValue)
                question.TypeId = dto.TypeId.Value;

            if (dto.Options != null)
            {
                _context.QuestionOptions.RemoveRange(question.QuestionOptions);

                foreach (var opt in dto.Options)
                {
                    question.QuestionOptions.Add(new QuestionOption
                    {
                        Id = Guid.NewGuid(),
                        OptionText = opt.OptionText,
                        IsCorrect = opt.IsCorrect,
                        CorrectOrder = opt.CorrectOrder
                    });
                }
            }

            question.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return await BuildQuestionDto(id);
        }

        // -------------------------------------------------------
        // DELETE
        // -------------------------------------------------------
        public async Task<bool> DeleteQuestion(Guid id, Guid authorId)
        {
            var q = await _context.Questions
                .FirstOrDefaultAsync(x => x.Id == id && x.AuthorId == authorId);

            if (q == null)
                return false;

            _context.Questions.Remove(q);
            await _context.SaveChangesAsync();
            return true;
        }

        // -------------------------------------------------------
        // HELPER to build DTO
        // -------------------------------------------------------
        private async Task<QuestionDto?> BuildQuestionDto(Guid id)
        {
            var q = await _context.Questions
                .Include(q => q.Type)
                .Include(q => q.QuestionOptions)
                .FirstOrDefaultAsync(q => q.Id == id);

            if (q == null) return null;

            return new QuestionDto
            {
                Id = q.Id,
                QuestionText = q.QuestionText,
                Type = q.Type.Name,
                CreatedAt = q.CreatedAt,
                Options = [.. q.QuestionOptions.Select(o => new QuestionOptionResponseDto
                {
                    Id = o.Id,
                    OptionText = o.OptionText,
                    IsCorrect = o.IsCorrect ?? false,
                    CorrectOrder = o.CorrectOrder
                })]
            };
        }
    }
}
