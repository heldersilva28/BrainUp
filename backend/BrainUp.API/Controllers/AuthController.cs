using BrainUp.API.DTOs;
using BrainUp.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace BrainUp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserService _userService;

        public AuthController(UserService userService)
        {
            _userService = userService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(UserCreateDto dto)
        {
            var user = await _userService.Register(dto);

            if (user == null)
                return BadRequest("Email já existe");

            return Ok(user);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(UserLoginDto dto)
        {
            var token = await _userService.Login(dto);

            if (token == null)
                return Unauthorized("Email ou password inválidos");

            return Ok(new { token });
        }
    }
}
