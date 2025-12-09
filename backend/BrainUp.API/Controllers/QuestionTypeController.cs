using BrainUp.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BrainUp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QuestionTypesController(QuestionTypeService service) : ControllerBase
    {
        private readonly QuestionTypeService _service = service;

        /// <summary>
        /// Lista todos os tipos de pergunta (Multiple Choice, True/False, Ordering, etc)
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll()
        {
            var types = await _service.GetAll();
            return Ok(types);
        }

        /// <summary>
        /// Devolve um tipo de pergunta pelo ID
        /// </summary>
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var type = await _service.GetById(id);

            if (type == null)
                return NotFound();

            return Ok(type);
        }
    }
}
