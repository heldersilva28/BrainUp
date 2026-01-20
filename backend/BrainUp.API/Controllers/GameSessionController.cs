using BrainUp.API.DTOs.GameSessions;
using BrainUp.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BrainUp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GameSessionController : ControllerBase
    {
        private readonly GameSessionService _service;

        public GameSessionController(GameSessionService service)
        {
            _service = service;
        }

        private Guid GetUserId()
        {
            return Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }

        // -------------------------------------------------------
        // CREATE SESSION
        // -------------------------------------------------------
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateSession([FromBody] GameSessionCreateDto dto)
        {
            var userId = GetUserId();

            var session = await _service.CreateSession(userId, dto);

            if (session == null)
                return BadRequest("Quiz não encontrado.");

            return Ok(session);
        }

        // -------------------------------------------------------
        // JOIN SESSION
        // -------------------------------------------------------
        [HttpPost("{sessionId}/join")]
        [AllowAnonymous] // qualquer jogador pode entrar so com nome
        public async Task<IActionResult> JoinSession(Guid sessionId, [FromBody] JoinSessionDto dto)
        {
            var playerId = await _service.JoinSession(sessionId, dto);

            return playerId == null
                ? BadRequest("Sessão não encontrada ou já terminou.")
                : Ok(new { playerId });
        }

        // -------------------------------------------------------
        // JOIN SESSION BY CODE
        // -------------------------------------------------------
        [HttpPost("join-by-code/{sessionCode}")]
        [AllowAnonymous]
        public async Task<IActionResult> JoinSessionByCode(string sessionCode, [FromBody] JoinSessionDto dto)
        {
            var result = await _service.JoinSessionByCode(sessionCode, dto);

            return result == null
                ? BadRequest("Sessão não encontrada ou já terminou.")
                : Ok(result);
        }
        // START ROUND (Host only)
        // -------------------------------------------------------
        [HttpPost("{sessionId}/round/start")]
        [Authorize]
        public async Task<IActionResult> StartRound(Guid sessionId, [FromBody] OpenRoundDto dto)
        {
            var userId = GetUserId();

            // opcional: verificar se userId == HostId mais tarde

            var round = await _service.StartRound(sessionId, dto);

            if (round == null)
                return BadRequest("Sessão inválida ou inativa.");

            return Ok(round);
        }

        // END ROUND (Host only)
        // -------------------------------------------------------
        [HttpPost("round/{roundId}/end")]
        [Authorize]
        public async Task<IActionResult> EndRound(Guid roundId)
        {
            var userId = GetUserId();

            var ok = await _service.EndRound(roundId);

            return ok
                ? Ok("Rodada encerrada.")
                : BadRequest("Falha ao encerrar rodada.");
        }

        // -------------------------------------------------------
        // SUBMIT ANSWER
        // -------------------------------------------------------
        [HttpPost("{sessionId}/round/{roundId}/answer/{playerId}")]
        [AllowAnonymous] // jogadores externos podem responder
        public async Task<IActionResult> SubmitAnswer(Guid sessionId, Guid roundId, Guid playerId,
            [FromBody] SubmitAnswerDto dto)
        {
            var ok = await _service.SubmitAnswer(roundId, playerId, dto);

            return ok
                ? Ok("Resposta registada.")
                : BadRequest("Falha ao registar resposta.");
        }

        // -------------------------------------------------------
        // SUBMIT ANSWER WITH SCORE
        // -------------------------------------------------------
        [HttpPost("{sessionId}/round/{roundId}/answer-with-score/{playerId}")]
        [AllowAnonymous]
        public async Task<IActionResult> SubmitAnswerWithScore(Guid sessionId, Guid roundId, Guid playerId,
            [FromBody] SubmitAnswerWithScoreDto dto)
        {
            var points = await _service.SubmitAnswerWithScore(sessionId, roundId, playerId, dto);

            return points == null
                ? BadRequest("Falha ao registar resposta.")
                : Ok(new { points });
        }

        // -------------------------------------------------------
        // END SESSION (Host)
        // -------------------------------------------------------
        [HttpPost("{sessionId}/end")]
        [Authorize]
        public async Task<IActionResult> EndSession(Guid sessionId)
        {
            var ok = await _service.EndSession(sessionId);

            return ok
                ? Ok("Sessão terminada.")
                : BadRequest("Sessão não encontrada.");
        }

        // -------------------------------------------------------
        // LEADERBOARD
        // -------------------------------------------------------
        [HttpGet("{sessionId}/leaderboard")]
        public async Task<IActionResult> GetLeaderboard(Guid sessionId)
        {
            var board = await _service.GetLeaderboard(sessionId);

            return board == null
                ? NotFound("Sessão não encontrada.")
                : Ok(board);
        }

        [HttpGet("{sessionId}")]
        public async Task<IActionResult> GetSessionStatus(Guid sessionId)
        {
            var session = await _service.GetSessionStatus(sessionId);

            return session == null
                ? NotFound("Sessão não encontrada.")
                : Ok(session);
        }

    }
}
