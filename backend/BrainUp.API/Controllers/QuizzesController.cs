using BrainUp.API.DTOs.Quizzes;
using BrainUp.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BrainUp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QuizzesController(QuizService service) : ControllerBase
    {
        private readonly QuizService _service = service;

        private Guid GetUserId()
        {
            return Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }

        // -------------------------------------------------------
        // CREATE
        // -------------------------------------------------------
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateQuiz([FromBody] QuizCreateDto dto)
        {
            var userId = GetUserId();
            var quiz = await _service.CreateQuiz(userId, dto);
            return Ok(quiz);
        }

        // -------------------------------------------------------
        // GET BY ID
        // -------------------------------------------------------
        [HttpGet("{id}")]
        [Authorize]
        public async Task<IActionResult> GetQuiz(Guid id)
        {
            var quiz = await _service.GetQuizById(id);
            return quiz == null ? NotFound() : Ok(quiz);
        }

        // -------------------------------------------------------
        // GET MY QUIZZES
        // -------------------------------------------------------
        [HttpGet("mine")]
        [Authorize]
        public async Task<IActionResult> GetMyQuizzes()
        {
            var userId = GetUserId();
            var quizzes = await _service.GetMyQuizzes(userId);
            return Ok(quizzes);
        }

        // -------------------------------------------------------
        // UPDATE
        // -------------------------------------------------------
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateQuiz(Guid id, [FromBody] QuizUpdateDto dto)
        {
            var userId = GetUserId();
            var quiz = await _service.UpdateQuiz(id, userId, dto);

            return quiz == null ? NotFound("Quiz não encontrado ou não pertence a este utilizador.") : Ok(quiz);
        }

        // -------------------------------------------------------
        // DELETE
        // -------------------------------------------------------
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteQuiz(Guid id)
        {
            var userId = GetUserId();
            
            // Remove all questions associated with the quiz first
            await _service.RemoveAllQuestionsFromQuiz(id, userId);
            
            var success = await _service.DeleteQuiz(id, userId);

            return success ? Ok("Quiz e todas as questões removidos.") : NotFound("Quiz não encontrado ou não pertence a este utilizador.");
        }

        // -------------------------------------------------------
        // ADD QUESTION TO QUIZ
        // -------------------------------------------------------
        [HttpPost("{quizId}/questions/add")]
        [Authorize]
        public async Task<IActionResult> AddQuestionToQuiz(Guid quizId, [FromBody] QuizQuestionAddDto dto)
        {
            var userId = GetUserId();
            var ok = await _service.AddQuestion(quizId, userId, dto);

            return ok ? Ok("Pergunta adicionada ao quiz.") : BadRequest("Falha ao adicionar pergunta.");
        }

        // -------------------------------------------------------
        // REMOVE QUESTION FROM QUIZ
        // -------------------------------------------------------
        [HttpDelete("{quizId}/questions/{questionId}")]
        [Authorize]
        public async Task<IActionResult> RemoveQuestion(Guid quizId, Guid questionId)
        {
            var userId = GetUserId();
            var ok = await _service.RemoveQuestion(quizId, questionId, userId);

            return ok ? Ok("Pergunta removida do quiz.") : NotFound("Pergunta não faz parte do quiz ou quiz não encontrado.");
        }

        // -------------------------------------------------------
        // REORDER QUESTIONS
        // -------------------------------------------------------
        [HttpPut("{quizId}/questions/reorder")]
        [Authorize]
        public async Task<IActionResult> ReorderQuestions(Guid quizId, [FromBody] ReorderQuestionsDto dto)
        {
            var userId = GetUserId();
            var ok = await _service.ReorderQuestions(quizId, userId, dto);

            return ok ? Ok("Ordem de perguntas atualizada.") : BadRequest("Falha ao atualizar ordem.");
        }
    }
}
