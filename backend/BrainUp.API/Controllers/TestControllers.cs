using Microsoft.AspNetCore.Mvc;
using BrainUp.API.Data;

namespace BrainUp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TestController : ControllerBase
    {
        private readonly BrainUpContext _context;

        public TestController(BrainUpContext context)
        {
            _context = context;
        }

        [HttpGet("health")]
        public IActionResult Health()
        {
            return Ok(new { message = "API online", time = DateTime.Now });
        }

        [HttpGet("tables")]
        public IActionResult Tables()
        {
            return Ok(_context.Model.GetEntityTypes().Select(t => t.Name));
        }
    }
}
