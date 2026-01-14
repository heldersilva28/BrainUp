using System.Text;
using System.Text.Json;
using BrainUp.API.Data;
using BrainUp.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BrainUp.API.Services
{
    public class ImportService(BrainUpContext context, IHttpContextAccessor http)
    {
        private readonly BrainUpContext _context = context;
        private readonly IHttpContextAccessor _http = http;

        // -------------------------------------------------------
        // JSON IMPORT
        // -------------------------------------------------------
        public async Task<bool> ImportJsonAsync(Stream stream, Guid? quizId, Guid? folderId)
        {
            using var reader = new StreamReader(stream);
            var json = await reader.ReadToEndAsync();

            var questions = JsonSerializer.Deserialize<List<JsonQuestionDto>>(json);

            if (questions == null) return false;

            // Criar quiz uma única vez se não foi fornecido
            Guid realQuizId;
            if (quizId == null)
            {
                var userId = Guid.Parse(_http.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new Exception("User ID não encontrado"));

                var newQuiz = new Quiz
                {
                    Id = Guid.NewGuid(),
                    Title = $"Imported Quiz - {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}",
                    Description = "Criado automaticamente durante importação",
                    CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified),
                    AuthorId = userId,
                    FolderId = folderId
                };

                _context.Quizzes.Add(newQuiz);
                await _context.SaveChangesAsync();
                realQuizId = newQuiz.Id;
            }
            else
            {
                bool exists = await _context.Quizzes.AnyAsync(qz => qz.Id == quizId.Value);
                if (!exists)
                    throw new Exception($"QuizId '{quizId}' não existe na base de dados.");
                realQuizId = quizId.Value;
            }

            int questionIndex = 1;
            foreach (var q in questions)
            {
                try
                {
                    await SaveQuestionToDb(q, realQuizId, questionIndex);
                    questionIndex++;
                }
                catch (Exception ex)
                {
                    throw new Exception($"Erro na pergunta {questionIndex}: {ex.Message}");
                }
            }

            return true;
        }

        // -------------------------------------------------------
        // GIFT IMPORT
        // -------------------------------------------------------
        public async Task<bool> ImportGiftAsync(Stream stream, Guid? quizId, Guid? folderId)
        {
            using var reader = new StreamReader(stream);
            string content = await reader.ReadToEndAsync();

            // Create quiz if not provided, similar to JSON import
            Guid realQuizId;
            if (quizId == null)
            {
                var userId = Guid.Parse(_http.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new Exception("User ID não encontrado"));

                var newQuiz = new Quiz
                {
                    Id = Guid.NewGuid(),
                    Title = $"Imported GIFT Quiz - {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}",
                    Description = "Criado automaticamente durante importação GIFT",
                    CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified),
                    AuthorId = userId,
                    FolderId = folderId
                };

                _context.Quizzes.Add(newQuiz);
                await _context.SaveChangesAsync();
                realQuizId = newQuiz.Id;
            }
            else
            {
                bool exists = await _context.Quizzes.AnyAsync(qz => qz.Id == quizId.Value);
                if (!exists)
                    throw new Exception($"QuizId '{quizId}' não existe na base de dados.");
                realQuizId = quizId.Value;
            }

            var blocks = content.Split('}')
                .Select(b => b.Trim())
                .Where(b => b.Contains('{'))
                .ToList();

            foreach (var block in blocks)
            {
                var parsed = ParseGiftQuestion(block + "}");
                if (parsed != null)
                    await SaveQuestionToDb(parsed, realQuizId);
            }

            return true;
        }

        // -------------------------------------------------------
        // PARSE GIFT BLOCK
        // -------------------------------------------------------
        private JsonQuestionDto? ParseGiftQuestion(string block)
        {
            int braceIndex = block.IndexOf('{');
            if (braceIndex < 0) return null;

            string questionText = block[..braceIndex].Trim();
            string optionsRaw = block[(braceIndex + 1)..block.IndexOf('}')].Trim();

            var optionsSplit = optionsRaw.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            var dto = new JsonQuestionDto
            {
                Question = questionText,
                Type = "multiple_choice",
                Options = new List<JsonOptionDto>()
            };

            // Ordering detection - check if options start with numbers followed by colon or dot
            bool isOrdering = optionsSplit.All(op => 
                System.Text.RegularExpressions.Regex.IsMatch(op, @"^\d+[:.]\w+") ||
                op.Contains(":") && char.IsDigit(op[0]));

            if (isOrdering)
            {
                dto.Type = "ordering";
                
                foreach (var op in optionsSplit)
                {
                    // Parse format like "1:option" or "1.option"
                    var match = System.Text.RegularExpressions.Regex.Match(op, @"^(\d+)[:.](.*?)$");
                    if (match.Success)
                    {
                        int correctOrder = int.Parse(match.Groups[1].Value);
                        string text = match.Groups[2].Value;

                        dto.Options.Add(new JsonOptionDto
                        {
                            Text = text,
                            Correct = null, // Para ordering, Correct deve ser null
                            Order = correctOrder // CorrectOrder na base de dados
                        });
                    }
                }
            }
            else
            {
                int order = 1;

                foreach (var op in optionsSplit)
                {
                    bool correct = op.StartsWith("=");

                    dto.Options.Add(new JsonOptionDto
                    {
                        Text = op.TrimStart('=', '~'),
                        Correct = correct,
                        Order = order++
                    });
                }

                // True/False detection
                if (optionsSplit.Length == 1 && (optionsRaw == "T" || optionsRaw == "F"))
                {
                    dto.Type = "true_false";
                    dto.Options = new List<JsonOptionDto>
                    {
                        new JsonOptionDto { Text = "True",  Correct = (optionsRaw == "T") },
                        new JsonOptionDto { Text = "False", Correct = (optionsRaw == "F") }
                    };
                }
            }

            return dto;
        }

        // -------------------------------------------------------
        // SAVE TO DB
        // -------------------------------------------------------
        private async Task SaveQuestionToDb(JsonQuestionDto q, Guid quizId, int questionIndex = 0)
        {
            var userId = Guid.Parse(_http.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new Exception("User ID não encontrado"));
            // Validar type
            var type = await _context.QuestionTypes.FirstOrDefaultAsync(x => x.Name == q.Type);
            if (type == null)
                throw new Exception($"QuestionType '{q.Type}' não existe na base de dados.");

            // Criar pergunta
            var question = new Question
            {
                Id = Guid.NewGuid(),
                QuestionText = q.Question.Trim(),
                TypeId = type.Id,
                AuthorId = userId,
                CreatedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
            };

            _context.Questions.Add(question);
            await _context.SaveChangesAsync(); // Guardar a pergunta primeiro

            // Adicionar opções (filtrar vazias)
            if (q.Options == null || q.Options.Count == 0)
                throw new Exception("A pergunta deve conter pelo menos uma opção.");

            var validOptions = q.Options.Where(op => !string.IsNullOrWhiteSpace(op.Text)).ToList();

            if (validOptions.Count == 0)
                throw new Exception("Todas as opções estão vazias.");

            // Determinar tipo especial
            bool isOrderingQuestion = q.Type.Equals("ordering", StringComparison.OrdinalIgnoreCase);
            bool isTrueFalseQuestion = q.Type.Equals("true_false", StringComparison.OrdinalIgnoreCase);

            // Validar regras do banco
            if (!isOrderingQuestion && !validOptions.Any(op => op.Correct == true))
                throw new Exception("Para múltipla escolha ou verdadeiro/falso, pelo menos uma opção deve ser marcada como correta.");

            if (isOrderingQuestion)
            {
                if (validOptions.Any(op => !op.Order.HasValue))
                    throw new Exception("Todas as opções de questões de ordenação devem ter um 'Order' definido.");

                var duplicateOrders = validOptions.GroupBy(op => op.Order)
                                                .Where(g => g.Count() > 1)
                                                .Select(g => g.Key)
                                                .ToList();
                if (duplicateOrders.Count > 0)
                    throw new Exception($"As opções de ordenação possuem ordens duplicadas: {string.Join(", ", duplicateOrders)}");
            }

            // Para True/False, garantir ordem: True primeiro, False segundo
            if (isTrueFalseQuestion)
            {
                var orderedTrueFalse = validOptions
                    .OrderByDescending(op => op.Text.Equals("True", StringComparison.OrdinalIgnoreCase) || 
                                            op.Text.Equals("Verdadeiro", StringComparison.OrdinalIgnoreCase))
                    .ToList();
                
                // Adicionar uma a uma para garantir ordem
                foreach (var op in orderedTrueFalse)
                {
                    var option = new QuestionOption
                    {
                        Id = Guid.NewGuid(),
                        QuestionId = question.Id,
                        OptionText = op.Text.Trim(),
                        IsCorrect = op.Correct,
                        CorrectOrder = null
                    };
                    _context.QuestionOptions.Add(option);
                    await _context.SaveChangesAsync(); // Guardar uma a uma
                }
            }
            else
            {
                // Para outros tipos, manter ordem original do ficheiro
                // Adicionar uma a uma para garantir a ordem de inserção
                foreach (var op in validOptions)
                {
                    var option = new QuestionOption
                    {
                        Id = Guid.NewGuid(),
                        QuestionId = question.Id,
                        OptionText = op.Text.Trim(),
                        IsCorrect = isOrderingQuestion ? null : op.Correct,
                        CorrectOrder = isOrderingQuestion ? op.Order : null
                    };
                    _context.QuestionOptions.Add(option);
                    await _context.SaveChangesAsync(); // Guardar uma a uma
                    
                    // Pequeno delay para garantir GUIDs sequenciais diferentes
                    await Task.Delay(1);
                }
            }

            // Associar pergunta ao quiz
            int nextOrder = await _context.QuizQuestions
                .Where(qq => qq.QuizId == quizId)
                .CountAsync() + 1;

            _context.QuizQuestions.Add(new QuizQuestion
            {
                QuizId = quizId,
                QuestionId = question.Id,
                QuestionOrder = nextOrder
            });

            await _context.SaveChangesAsync();
        }

        // -------------------------------------------------------
        // DTOs INTERNOS
        // -------------------------------------------------------
        private class JsonQuestionDto
        {
            public string Type { get; set; } = null!;
            public Guid? AuthorId { get; set; }
            public string Question { get; set; } = null!;
            public List<JsonOptionDto>? Options { get; set; }
        }

        private class JsonOptionDto
        {
            public string Text { get; set; } = null!;
            public bool? Correct { get; set; }
            public int? Order { get; set; }
        }
    }
}
