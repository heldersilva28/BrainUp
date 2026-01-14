using BrainUp.API.Data;
using BrainUp.API.DTOs.Questions;
using BrainUp.API.Models;
using Microsoft.EntityFrameworkCore;

namespace BrainUp.API.Services
{
    public class QuestionService(BrainUpContext context)
    {
        private readonly BrainUpContext _context = context;

        //adicionar opção de resposta ao quiz
        public async Task<QuestionOption?> AddOptionToQuestion(Guid questionId, QuestionOptionDto dto)
        {
            var question = await _context.Questions
                .FirstOrDefaultAsync(q => q.Id == questionId);

            if (question == null)
                return null;

            var option = new QuestionOption
            {
                Id = Guid.NewGuid(),
                QuestionId = questionId,
                OptionText = dto.OptionText,
                IsCorrect = dto.IsCorrect,
                CorrectOrder = dto.CorrectOrder
            };

            _context.QuestionOptions.Add(option);
            await _context.SaveChangesAsync();

            return option;
        }

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

            _context.Questions.Add(question);
            await _context.SaveChangesAsync(); // Guardar a pergunta primeiro

            // Para True/False, garantir ordem específica: True primeiro, False segundo
            if (type.Name.Equals("true_false", StringComparison.OrdinalIgnoreCase))
            {
                // Ordenar opções: True primeiro, False segundo
                var orderedOptions = dto.Options
                    .OrderByDescending(opt => opt.OptionText.Equals("True", StringComparison.OrdinalIgnoreCase) || 
                                              opt.OptionText.Equals("Verdadeiro", StringComparison.OrdinalIgnoreCase))
                    .ToList();

                // Adicionar uma a uma para garantir ordem
                foreach (var opt in orderedOptions)
                {
                    var option = new QuestionOption
                    {
                        Id = Guid.NewGuid(),
                        QuestionId = question.Id,
                        OptionText = opt.OptionText,
                        IsCorrect = opt.IsCorrect,
                        CorrectOrder = null
                    };
                    _context.QuestionOptions.Add(option);
                    await _context.SaveChangesAsync(); // Guardar uma a uma
                }
            }
            else
            {
                // Para outros tipos, manter ordem original e adicionar uma a uma
                foreach (var opt in dto.Options)
                {
                    var option = new QuestionOption
                    {
                        Id = Guid.NewGuid(),
                        QuestionId = question.Id,
                        OptionText = opt.OptionText,
                        IsCorrect = opt.IsCorrect,
                        CorrectOrder = opt.CorrectOrder
                    };
                    _context.QuestionOptions.Add(option);
                    await _context.SaveChangesAsync(); // Guardar uma a uma
                }
            }

            return await BuildQuestionDto(question.Id);
        }

        // -------------------------------------------------------
        // GET BY ID
        // -------------------------------------------------------
        public async Task<QuestionDto?> GetById(Guid id)
        {
            return await BuildQuestionDto(id);
        }

        //delete opção de pergunta
        public async Task<bool> RemoveOptionFromQuestion(Guid questionId, Guid optionId)
        {
            var option = await _context.QuestionOptions
                .FirstOrDefaultAsync(o => o.Id == optionId && o.QuestionId == questionId);

            
            if (option == null)
                return false;

            _context.QuestionOptions.Remove(option);
            await _context.SaveChangesAsync();

            return true;
        }

        //alterar opção de pergunta
        public async Task<QuestionOption?> UpdateOptionOfQuestion(Guid questionId, Guid optionId, QuestionOptionDto dto)
        {
            var option = await _context.QuestionOptions
                .FirstOrDefaultAsync(o => o.Id == optionId && o.QuestionId == questionId);

            if (option == null)
                return null;

            option.OptionText = dto.OptionText;
            option.IsCorrect = dto.IsCorrect;
            option.CorrectOrder = dto.CorrectOrder;

            await _context.SaveChangesAsync();

            return option;
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

            return [.. list.Select(q => {
                // Ordenar opções baseado no tipo
                var orderedOptions = q.Type.Name.Equals("true_false", StringComparison.OrdinalIgnoreCase)
                    ? q.QuestionOptions
                        .OrderByDescending(o => o.OptionText.Equals("True", StringComparison.OrdinalIgnoreCase) ||
                                               o.OptionText.Equals("Verdadeiro", StringComparison.OrdinalIgnoreCase))
                        .ToList()
                    : q.QuestionOptions
                        .OrderBy(o => o.Id)
                        .ToList();

                return new QuestionDto
                {
                    Id = q.Id,
                    QuestionText = q.QuestionText,
                    Type = q.Type.Name,
                    CreatedAt = q.CreatedAt,
                    Options = [.. orderedOptions.Select(o => new QuestionOptionResponseDto
                    {
                        Id = o.Id,
                        OptionText = o.OptionText,
                        IsCorrect = o.IsCorrect ?? false,
                        CorrectOrder = o.CorrectOrder
                    })]
                };
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

            return questions.Select(q => {
                // Ordenar opções baseado no tipo
                var orderedOptions = q.Type.Name.Equals("true_false", StringComparison.OrdinalIgnoreCase)
                    ? q.QuestionOptions
                        .OrderByDescending(o => o.OptionText.Equals("True", StringComparison.OrdinalIgnoreCase) || 
                                               o.OptionText.Equals("Verdadeiro", StringComparison.OrdinalIgnoreCase))
                        .ToList()
                    : q.QuestionOptions
                        .OrderBy(o => o.Id)
                        .ToList();

                return new QuestionDto
                {
                    Id = q.Id,
                    QuestionText = q.QuestionText,
                    Type = q.Type.Name,
                    CreatedAt = q.CreatedAt,
                    Options = orderedOptions.Select(o => new QuestionOptionResponseDto
                    {
                        Id = o.Id,
                        OptionText = o.OptionText,
                        IsCorrect = o.IsCorrect ?? false,
                        CorrectOrder = o.CorrectOrder
                    }).ToList(),
                    Order = _context.QuizQuestions
                        .Where(qq => qq.QuizId == quizId && qq.QuestionId == q.Id)
                        .Select(qq => qq.QuestionOrder)
                        .FirstOrDefault()
                };
            }).ToList();
        }

        // -------------------------------------------------------
        // UPDATE
        // -------------------------------------------------------
        public async Task<QuestionDto?> UpdateQuestion(
            Guid id,
            Guid authorId,
            QuestionUpdateDto dto)
        {
            var question = await _context.Questions
                .Include(q => q.QuestionOptions)
                .FirstOrDefaultAsync(q => q.Id == id && q.AuthorId == authorId);

            if (question == null)
                return null;

            // -------- Question --------
            if (dto.QuestionText != null)
                question.QuestionText = dto.QuestionText;

            if (dto.TypeId.HasValue)
                question.TypeId = dto.TypeId.Value;

            // -------- Options --------
            if (dto.Options != null)
            {
                var incomingIds = dto.Options
                    .Where(o => o.Id.HasValue)
                    .Select(o => o.Id!.Value)
                    .ToHashSet();

                // 🗑 Remover opções que já não existem no DTO
                var toRemove = question.QuestionOptions
                    .Where(o => !incomingIds.Contains(o.Id))
                    .ToList();

                _context.QuestionOptions.RemoveRange(toRemove);

                // ✏️ Actualizar opções existentes + ➕ novas
                foreach (var opt in dto.Options)
                {
                    if (opt.Id.HasValue)
                    {
                        var existing = question.QuestionOptions
                            .FirstOrDefault(o => o.Id == opt.Id.Value);

                        if (existing == null)
                            continue; // segurança extra

                        existing.OptionText = opt.OptionText;
                        existing.IsCorrect = opt.IsCorrect;
                        existing.CorrectOrder = opt.CorrectOrder;
                    }
                    else
                    {
                        question.QuestionOptions.Add(new QuestionOption
                        {
                            Id = Guid.NewGuid(),
                            QuestionId = question.Id,
                            OptionText = opt.OptionText,
                            IsCorrect = opt.IsCorrect,
                            CorrectOrder = opt.CorrectOrder
                        });
                    }
                }
            }

            question.UpdatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified);


            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                // opcional: traduzir para 409 Conflict
                throw;
            }

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

            // Ordenar opções baseado no tipo
            List<QuestionOption> orderedOptions;
            
            if (q.Type.Name.Equals("true_false", StringComparison.OrdinalIgnoreCase))
            {
                // True/False: True primeiro, False segundo
                orderedOptions = q.QuestionOptions
                    .OrderByDescending(o => o.OptionText.Equals("True", StringComparison.OrdinalIgnoreCase) || 
                                           o.OptionText.Equals("Verdadeiro", StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }
            else
            {
                // Para outros tipos: ordenar por ID (ordem de inserção na BD)
                // Como GUIDs são gerados sequencialmente pelo SQL Server, podemos usar ToString() para ordenar
                orderedOptions = q.QuestionOptions
                    .OrderBy(o => o.Id)
                    .ToList();
            }

            return new QuestionDto
            {
                Id = q.Id,
                QuestionText = q.QuestionText,
                Type = q.Type.Name,
                CreatedAt = q.CreatedAt,
                Options = [.. orderedOptions.Select(o => new QuestionOptionResponseDto
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
