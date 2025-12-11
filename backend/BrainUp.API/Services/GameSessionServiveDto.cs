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
        public async Task<bool> JoinSession(Guid sessionId, JoinSessionDto dto)
        {
            var session = await _context.GameSessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.IsActive == true);

            if (session == null) return false;

            var player = new SessionPlayer
            {
                Id = Guid.NewGuid(),
                PlayerName = dto.PlayerName,
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
            return true;
        }

        // -------------------------------------------------------
        // START ROUND
        // -------------------------------------------------------
        public async Task<GameRound?> StartRound(Guid sessionId, OpenRoundDto dto)
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
                StartedAt = DateTime.UtcNow
            };

            _context.GameRounds.Add(round);
            await _context.SaveChangesAsync();
            return round;
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
                AnsweredAt = DateTime.UtcNow
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

        // -------------------------------------------------------
        // END SESSION
        // -------------------------------------------------------
        public async Task<bool> EndSession(Guid sessionId)
        {
            var session = await _context.GameSessions.FirstOrDefaultAsync(s => s.Id == sessionId);
            if (session == null) return false;

            session.IsActive = false;
            session.EndedAt = DateTime.UtcNow;

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
    }
}
