using BrainUp.API.Data;
using BrainUp.API.DTOs.Quizzes;
using BrainUp.API.Models;
using Microsoft.EntityFrameworkCore;

namespace BrainUp.API.Services
{
    public class QuizService(BrainUpContext context)
    {
        private readonly BrainUpContext _context = context;

        // -------------------------------------------------------
        // CREATE QUIZ
        // -------------------------------------------------------
        public async Task<QuizDto> CreateQuiz(Guid authorId, QuizCreateDto dto)
        {
            var quiz = new Quiz
            {
                Id = Guid.NewGuid(),
                AuthorId = authorId,
                Title = dto.Title,
                Description = dto.Description,
                CreatedAt = DateTime.UtcNow
            };

            _context.Quizzes.Add(quiz);
            await _context.SaveChangesAsync();

            return new QuizDto
            {
                Id = quiz.Id,
                Title = quiz.Title,
                Description = quiz.Description,
                AuthorId = quiz.AuthorId,
                CreatedAt = quiz.CreatedAt
            };
        }

        // -------------------------------------------------------
        // GET QUIZ BY ID
        // -------------------------------------------------------
        public async Task<QuizDto?> GetQuizById(Guid id)
        {
            var quiz = await _context.Quizzes
                .FirstOrDefaultAsync(q => q.Id == id);

            if (quiz == null) return null;

            return new QuizDto
            {
                Id = quiz.Id,
                Title = quiz.Title,
                Description = quiz.Description,
                AuthorId = quiz.AuthorId,
                CreatedAt = quiz.CreatedAt
            };
        }

        // -------------------------------------------------------
        // GET MY QUIZZES
        // -------------------------------------------------------
        public async Task<List<QuizDto>> GetMyQuizzes(Guid authorId)
        {
            return await _context.Quizzes
                .Where(q => q.AuthorId == authorId)
                .OrderByDescending(q => q.CreatedAt)
                .Select(q => new QuizDto
                {
                    Id = q.Id,
                    Title = q.Title,
                    Description = q.Description,
                    AuthorId = q.AuthorId,
                    CreatedAt = q.CreatedAt
                })
                .ToListAsync();
        }

        // -------------------------------------------------------
        // UPDATE QUIZ
        // -------------------------------------------------------
        public async Task<QuizDto?> UpdateQuiz(Guid quizId, Guid authorId, QuizUpdateDto dto)
        {
            var quiz = await _context.Quizzes
                .FirstOrDefaultAsync(q => q.Id == quizId && q.AuthorId == authorId);

            if (quiz == null)
                return null;

            quiz.Title = dto.Title;
            quiz.Description = dto.Description;
            //quiz.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return await GetQuizById(quiz.Id);
        }

        // -------------------------------------------------------
        // DELETE QUIZ
        // -------------------------------------------------------
        public async Task<bool> DeleteQuiz(Guid id, Guid authorId)
        {
            var quiz = await _context.Quizzes
                .FirstOrDefaultAsync(q => q.Id == id && q.AuthorId == authorId);

            if (quiz == null)
                return false;

            _context.Quizzes.Remove(quiz);
            await _context.SaveChangesAsync();
            return true;
        }

        // -------------------------------------------------------
        // ADD QUESTION TO QUIZ
        // -------------------------------------------------------
        public async Task<bool> AddQuestion(Guid quizId, Guid authorId, QuizQuestionAddDto dto)
        {
            var quiz = await _context.Quizzes
                .FirstOrDefaultAsync(q => q.Id == quizId && q.AuthorId == authorId);

            if (quiz == null)
                return false;

            var question = await _context.Questions
                .FirstOrDefaultAsync(q => q.Id == dto.QuestionId && q.AuthorId == authorId);

            if (question == null)
                return false;

            bool exists = await _context.QuizQuestions
                .AnyAsync(qq => qq.QuizId == quizId && qq.QuestionId == question.Id);

            if (exists)
                return false;

            var quizQuestion = new QuizQuestion
            {
                QuizId = quizId,
                QuestionId = question.Id,
                QuestionOrder = dto.Order
            };

            _context.QuizQuestions.Add(quizQuestion);
            await _context.SaveChangesAsync();

            return true;
        }

        // -------------------------------------------------------
        // REMOVE QUESTION FROM QUIZ
        // -------------------------------------------------------
        public async Task<bool> RemoveQuestion(Guid quizId, Guid questionId, Guid authorId)
        {
            var quiz = await _context.Quizzes
                .FirstOrDefaultAsync(q => q.Id == quizId && q.AuthorId == authorId);

            if (quiz == null)
                return false;

            var quizQuestion = await _context.QuizQuestions
                .FirstOrDefaultAsync(qq => qq.QuizId == quizId && qq.QuestionId == questionId);

            if (quizQuestion == null)
                return false;

            _context.QuizQuestions.Remove(quizQuestion);
            await _context.SaveChangesAsync();

            return true;
        }

        // -------------------------------------------------------
        // REORDER QUESTIONS
        // -------------------------------------------------------
        public async Task<bool> ReorderQuestions(Guid quizId, Guid authorId, ReorderQuestionsDto dto)
        {
            var quiz = await _context.Quizzes
                .FirstOrDefaultAsync(q => q.Id == quizId && q.AuthorId == authorId);

            if (quiz == null)
                return false;

            foreach (var item in dto.Items)
            {
                var qq = await _context.QuizQuestions
                    .FirstOrDefaultAsync(x =>
                        x.QuizId == quizId &&
                        x.QuestionId == item.QuestionId
                    );

                if (qq != null)
                {
                    qq.QuestionOrder = item.Order;
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RemoveAllQuestionsFromQuiz(Guid quizId, Guid authorId)
        {
            var quiz = await _context.Quizzes
            .FirstOrDefaultAsync(q => q.Id == quizId && q.AuthorId == authorId);

            if (quiz == null)
            return false;

            // Get all question IDs for this quiz
            var questionIds = await _context.QuizQuestions
            .Where(qq => qq.QuizId == quizId)
            .Select(qq => qq.QuestionId)
            .ToListAsync();

            if (!questionIds.Any())
            return true;

            // Remove in correct order to avoid FK constraint issues
            await _context.QuestionOptions
            .Where(qo => qo.QuestionId.HasValue && questionIds.Contains(qo.QuestionId.Value))
            .ExecuteDeleteAsync();

            await _context.QuizQuestions
            .Where(qq => qq.QuizId == quizId)
            .ExecuteDeleteAsync();

            await _context.Questions
            .Where(q => questionIds.Contains(q.Id))
            .ExecuteDeleteAsync();

            return true;
        }
    }
}
