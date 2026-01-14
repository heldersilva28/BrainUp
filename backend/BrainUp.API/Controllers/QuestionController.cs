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

        [HttpPost("{questionId}/options")]
        [Authorize]
        public async Task<IActionResult> AddOptionToQuestion(Guid questionId, [FromBody] QuestionOptionDto dto)
        {
            var option = await _service.AddOptionToQuestion(questionId, dto);

            if (option == null)
                return NotFound("Question not found.");

            return Ok(option);
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

        //remover opção de pergunta
        [HttpDelete("{questionId}/options/{optionId}")]
        [Authorize]
        public async Task<IActionResult> RemoveOptionFromQuestion(Guid questionId, Guid optionId)
        {
            var success = await _service.RemoveOptionFromQuestion(questionId, optionId);

            if (!success)
                return NotFound("Question or option not found.");

            return Ok();
        }

        //alterar opção de pergunta
        [HttpPut("{questionId}/options/{optionId}")]
        [Authorize]
        public async Task<IActionResult> UpdateOptionOfQuestion(Guid questionId, Guid optionId, [FromBody] QuestionOptionDto dto)
        {
            var updatedOption = await _service.UpdateOptionOfQuestion(questionId, optionId, dto);

            if (updatedOption == null)
                return NotFound("Question or option not found.");

            return Ok(updatedOption);
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
