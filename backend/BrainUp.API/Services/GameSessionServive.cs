using BrainUp.API.Data;
using BrainUp.API.DTOs.GameSessions;
using BrainUp.API.Models;
using Microsoft.EntityFrameworkCore;

namespace BrainUp.API.Services
{
    public class GameSessionService(BrainUpContext context)
    {
        private readonly BrainUpContext _context = context;

        // -------------------------------------------------------
        // CREATE SESSION
        // -------------------------------------------------------
        public async Task<GameSessionDto?> CreateSession(Guid hostId, GameSessionCreateDto dto)
        {
            var quiz = await _context.Quizzes.FirstOrDefaultAsync(q => q.Id == dto.QuizId);
            if (quiz == null) return null;

            var session = new GameSession
            {
                Id = Guid.NewGuid(),
                HostId = hostId,
                QuizId = dto.QuizId,
                IsActive = true
            };

            _context.GameSessions.Add(session);
            await _context.SaveChangesAsync();

            return new GameSessionDto
            {
                Id = session.Id,
                QuizId = session.QuizId!.Value,
                HostId = session.HostId!.Value,
                IsActive = session.IsActive!.Value,
                StartedAt = session.StartedAt!.Value
            };
        }

        // -------------------------------------------------------
        // JOIN SESSION
        // -------------------------------------------------------
        public async Task<Guid?> JoinSession(Guid sessionId, JoinSessionDto dto)
        {
            var session = await _context.GameSessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.IsActive == true);

            if (session == null) return null;

            return await CreateSessionPlayer(sessionId, dto.PlayerName);
        }

        public async Task<JoinSessionResultDto?> JoinSessionByCode(string sessionCode, JoinSessionDto dto)
        {
            var sessionId = await ResolveSessionId(sessionCode);
            if (sessionId == null)
                return null;

            var playerId = await CreateSessionPlayer(sessionId.Value, dto.PlayerName);
            if (playerId == null)
                return null;

            return new JoinSessionResultDto
            {
                SessionId = sessionId.Value,
                PlayerId = playerId.Value
            };
        }

        private async Task<Guid?> CreateSessionPlayer(Guid sessionId, string playerName)
        {
            var player = new SessionPlayer
            {
                Id = Guid.NewGuid(),
                PlayerName = playerName,
                SessionId = sessionId
            };

            _context.SessionPlayers.Add(player);

            _context.PlayerScores.Add(new PlayerScore
            {
                Id = Guid.NewGuid(),
                PlayerId = player.Id,
                SessionId = sessionId,
                TotalScore = 0
            });

            await _context.SaveChangesAsync();
            return player.Id;
        }

        private async Task<Guid?> ResolveSessionId(string sessionCode)
        {
            if (string.IsNullOrWhiteSpace(sessionCode))
                return null;

            if (Guid.TryParse(sessionCode, out var parsed))
                return parsed;

            var normalized = sessionCode.Replace("-", "").Trim();
            if (normalized.Length != 6)
                return null;

            var sessionIds = await _context.GameSessions
                .Where(s => s.IsActive == true)
                .Select(s => s.Id)
                .ToListAsync();

            var match = sessionIds.FirstOrDefault(id =>
                id.ToString("N").StartsWith(normalized, StringComparison.OrdinalIgnoreCase));

            return match == Guid.Empty ? null : match;
        }

        // -------------------------------------------------------
        // START ROUND
        // -------------------------------------------------------
        public async Task<StartRoundResultDto?> StartRound(Guid sessionId, OpenRoundDto dto)
        {
            var session = await _context.GameSessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.IsActive == true);

            if (session == null) return null;

            var round = new GameRound
            {
                Id = Guid.NewGuid(),
                SessionId = sessionId,
                RoundNumber = dto.RoundNumber,
                QuestionId = dto.QuestionId,
                StartedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
            };

            _context.GameRounds.Add(round);
            await _context.SaveChangesAsync();
            return new StartRoundResultDto
            {
                RoundId = round.Id,
                RoundNumber = round.RoundNumber,
                QuestionId = round.QuestionId ?? dto.QuestionId
            };
        }

        // -------------------------------------------------------
        // SUBMIT ANSWER
        // -------------------------------------------------------
        public async Task<bool> SubmitAnswer(Guid roundId, Guid playerId, SubmitAnswerDto dto)
        {
            var round = await _context.GameRounds
                .Include(r => r.Session)
                .FirstOrDefaultAsync(r => r.Id == roundId);

            if (round == null) return false;

            // check if player is part of session
            bool belongsToSession = await _context.SessionPlayers
                .AnyAsync(p => p.Id == playerId && p.SessionId == round.SessionId);

            if (!belongsToSession) return false;

            var option = await _context.QuestionOptions
                .FirstOrDefaultAsync(o => o.Id == dto.OptionId);

            if (option == null) return false;

            bool isCorrect = option.IsCorrect ?? false;

            _context.PlayerAnswers.Add(new PlayerAnswer
            {
                Id = Guid.NewGuid(),
                RoundId = roundId,
                PlayerId = playerId,
                OptionId = dto.OptionId,
                IsCorrect = isCorrect,
                AnsweredAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
            });

            if (isCorrect)
            {
                var score = await _context.PlayerScores
                    .FirstOrDefaultAsync(s =>
                        s.PlayerId == playerId &&
                        s.SessionId == round.SessionId);

                if (score != null)
                    score.TotalScore += 100;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<int?> SubmitAnswerWithScore(Guid sessionId, Guid roundId, Guid playerId, SubmitAnswerWithScoreDto dto)
        {
            var round = await _context.GameRounds
                .Include(r => r.Session)
                .Include(r => r.Question)
                .ThenInclude(q => q!.QuestionOptions)
                .FirstOrDefaultAsync(r => r.Id == roundId);

            if (round == null) return null;
            if (round.SessionId == null || round.SessionId.Value != sessionId) return null;

            bool belongsToSession = await _context.SessionPlayers
                .AnyAsync(p => p.Id == playerId && p.SessionId == round.SessionId);

            if (!belongsToSession) return null;

            var alreadyAnswered = await _context.PlayerAnswers
                .AnyAsync(a => a.RoundId == roundId && a.PlayerId == playerId);

            if (alreadyAnswered) return 0;

            var questionOptions = round.Question?.QuestionOptions?.ToList()
                ?? new List<QuestionOption>();

            bool isCorrect = false;
            Guid? selectedOptionId = null;

            if (dto.OrderedOptionIds != null && dto.OrderedOptionIds.Count > 0)
            {
                var validOptionIds = new HashSet<Guid>(questionOptions.Select(o => o.Id));
                if (dto.OrderedOptionIds.Any(id => !validOptionIds.Contains(id)))
                    return null;

                if (dto.OrderedOptionIds.Count != dto.OrderedOptionIds.Distinct().Count())
                    return null;

                if (dto.OrderedOptionIds.Count != questionOptions.Count)
                    return null;

                var expectedOrder = questionOptions
                    .Where(o => o.CorrectOrder != null)
                    .OrderBy(o => o.CorrectOrder)
                    .Select(o => o.Id)
                    .ToList();

                if (expectedOrder.Count == dto.OrderedOptionIds.Count && expectedOrder.Count > 0)
                {
                    isCorrect = expectedOrder.SequenceEqual(dto.OrderedOptionIds);
                }
            }
            else if (dto.OptionId != null)
            {
                var option = questionOptions.FirstOrDefault(o => o.Id == dto.OptionId.Value);
                if (option != null)
                {
                    selectedOptionId = option.Id;
                    isCorrect = option.IsCorrect ?? false;
                }
            }

            _context.PlayerAnswers.Add(new PlayerAnswer
            {
                Id = Guid.NewGuid(),
                RoundId = roundId,
                PlayerId = playerId,
                OptionId = selectedOptionId,
                IsCorrect = isCorrect,
                AnsweredAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified)
            });

            var points = CalculateScore(
                isCorrect,
                dto.BasePoints,
                dto.TimeRemaining,
                dto.TimeTotal);

            if (points > 0)
            {
                var score = await _context.PlayerScores
                    .FirstOrDefaultAsync(s =>
                        s.PlayerId == playerId &&
                        s.SessionId == round.SessionId);

                if (score == null)
                {
                    score = new PlayerScore
                    {
                        Id = Guid.NewGuid(),
                        PlayerId = playerId,
                        SessionId = round.SessionId!.Value,
                        TotalScore = 0
                    };
                    _context.PlayerScores.Add(score);
                }

                score.TotalScore += points;
            }

            await _context.SaveChangesAsync();
            return points;
        }

        private static int CalculateScore(bool isCorrect, int basePoints, int timeRemaining, int timeTotal)
        {
            if (!isCorrect)
                return 0;

            if (timeTotal <= 0)
                return basePoints;

            var clampedRemaining = Math.Clamp(timeRemaining, 0, timeTotal);
            var bonus = Math.Round(
                (double)clampedRemaining / timeTotal * (basePoints / 2.0),
                MidpointRounding.AwayFromZero);

            return basePoints + (int)bonus;
        }

        // -------------------------------------------------------
        // END SESSION
        // -------------------------------------------------------
        public async Task<bool> EndSession(Guid sessionId)
        {
            var session = await _context.GameSessions.FirstOrDefaultAsync(s => s.Id == sessionId);
            if (session == null) return false;

            session.IsActive = false;
            session.EndedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified);

            await _context.SaveChangesAsync();
            return true;
        }

        // -------------------------------------------------------
        // END ROUND
        // -------------------------------------------------------
        public async Task<bool> EndRound(Guid roundId)
        {
            var round = await _context.GameRounds.FirstOrDefaultAsync(r => r.Id == roundId);
            if (round == null) return false;

            round.EndedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified);

            await _context.SaveChangesAsync();
            return true;
        }

        // -------------------------------------------------------
        // LEADERBOARD
        // -------------------------------------------------------
        public async Task<object?> GetLeaderboard(Guid sessionId)
        {
            return await _context.PlayerScores
                .Include(s => s.Player)
                .Where(s => s.SessionId == sessionId)
                .OrderByDescending(s => s.TotalScore)
                .Select(s => new
                {
                    Player = s.Player!.PlayerName,
                    Score = s.TotalScore
                })
                .ToListAsync();
        }
        // -------------------------------------------------------
        // GET SESSION STATUS
        // -------------------------------------------------------
        public async Task<bool?> GetSessionStatus(Guid sessionId)
        {
            var session = await _context.GameSessions
                .FirstOrDefaultAsync(s => s.Id == sessionId);
            
            if (session == null) return null;
            
            return session.IsActive;
        }
    }
}
