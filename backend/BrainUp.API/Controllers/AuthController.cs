using BrainUp.API.DTOs;
using BrainUp.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace BrainUp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController(UserService userService) : ControllerBase
    {
        private readonly UserService _userService = userService;

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

        [Authorize]
        [HttpGet("me")]
        public IActionResult Me()
        {
            var userId = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
            var email = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value;
            var role = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;

            return Ok(new { userId, email, role });
        }

        [HttpGet("validate")]
        [Authorize]
        public IActionResult ValidateToken()
        {
          // If we reach here, the JWT token is valid (thanks to [Authorize] attribute)
          var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
          var email = User.FindFirst(ClaimTypes.Email)?.Value;
          
          return Ok(new { 
            valid = true, 
            userId = userId,
            email = email,
            message = "Token is valid" 
          });
        }
    }
}
