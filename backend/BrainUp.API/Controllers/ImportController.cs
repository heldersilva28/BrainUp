using BrainUp.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BrainUp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ImportController : ControllerBase
    {
        private readonly ImportService _importService;

        public ImportController(ImportService importService)
        {
            _importService = importService;
        }

        [HttpPost("questions")]
        [Authorize]
        public async Task<IActionResult> ImportQuestions(IFormFile file, Guid? quizId = null)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Ficheiro inválido");

            var extension = Path.GetExtension(file.FileName).ToLower();

            try
            {
                using var stream = file.OpenReadStream();

                bool result = extension switch
                {
                    ".json" => await _importService.ImportJsonAsync(stream, quizId),
                    ".gift" => await _importService.ImportGiftAsync(stream, quizId),
                    _ => throw new Exception("Apenas .json ou .gift são suportados.")
                };

                if (!result)
                    return BadRequest("O ficheiro não contém perguntas válidas.");

                return Ok("Importação concluída com sucesso.");
            }
            catch (Exception ex)
            {
                // devolve a mensagem de erro real
                return BadRequest($"Erro ao importar: {ex.Message}");
            }
        }
    }
}
