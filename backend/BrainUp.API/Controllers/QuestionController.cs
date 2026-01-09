using BrainUp.API.DTOs.Questions;
using BrainUp.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BrainUp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QuestionsController(QuestionService service) : ControllerBase
    {
        private readonly QuestionService _service = service;

        private Guid GetUserId()
        {
            return Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }

        // -------------------------------------------------------
        // CREATE
        // -------------------------------------------------------
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Create([FromBody] QuestionCreateDto dto)
        {
            var authorId = GetUserId();

            var question = await _service.CreateQuestion(authorId, dto);

            if (question == null)
                return BadRequest("Invalid question type.");

            return Ok(question);
        }

        // -------------------------------------------------------
        // GET BY ID
        // -------------------------------------------------------
        [HttpGet("{id}")]
        [Authorize]
        public async Task<IActionResult> Get(Guid id)
        {
            var q = await _service.GetById(id);
            return q == null ? NotFound() : Ok(q);
        }

        // -------------------------------------------------------
        // GET MY QUESTIONS
        // -------------------------------------------------------
        [HttpGet("mine")]
        [Authorize]
        public async Task<IActionResult> GetMine()
        {
            var authorId = GetUserId();
            return Ok(await _service.GetByAuthor(authorId));
        }

        // -------------------------------------------------------
        // GET QUESTIONS FROM QUIZ
        // -------------------------------------------------------
        [HttpGet("quiz/{quizId}")]
        [Authorize]
        public async Task<IActionResult> GetFromQuiz(Guid quizId)
        {
            var authorId = GetUserId();
            var questions = await _service.GetFromQuiz(quizId, authorId);

            return Ok(questions);
        }


        // -------------------------------------------------------
        // UPDATE
        // -------------------------------------------------------
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(Guid id, [FromBody] QuestionUpdateDto dto)
        {
            var authorId = GetUserId();
            var result = await _service.UpdateQuestion(id, authorId, dto);

            return result == null ? NotFound() : Ok(result);
        }

        // -------------------------------------------------------
        // DELETE
        // -------------------------------------------------------
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(Guid id)
        {
            var authorId = GetUserId();
            var ok = await _service.DeleteQuestion(id, authorId);

            return ok ? Ok() : NotFound();
        }
    }
}
