using BrainUp.API.DTOs;
using BrainUp.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BrainUp.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController(UserService userService) : ControllerBase
    {
        private readonly UserService _userService = userService;

        // ---------------------------
        // GET ALL USERS (ADMIN)
        // ---------------------------
        [Authorize(Roles = "admin")]
        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _userService.GetAllUsersAsync();
            return Ok(users);
        }

        // ---------------------------
        // GET USER BY ID
        // ---------------------------
        [Authorize(Roles = "admin")]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserById(Guid id)
        {
            var user = await _userService.GetUserByIdAsync(id);
            if (user == null)
                return NotFound();

            return Ok(user);
        }

        // ---------------------------
        // UPDATE USER
        // ---------------------------
        [Authorize]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(Guid id, UserDto dto)
        {
            // apenas o próprio user ou admin pode atualizar
            var requesterId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var requesterRole = User.FindFirstValue(ClaimTypes.Role);

            if (requesterRole != "admin" && requesterId != id.ToString())
                return Forbid();

            var updated = await _userService.UpdateUserAsync(id, dto);

            if (!updated)
                return NotFound();

            return Ok("Utilizador atualizado com sucesso.");
        }

        // ---------------------------
        // CHANGE ROLE (ADMIN)
        // ---------------------------
        [Authorize(Roles = "admin")]
        [HttpPut("role/{userId}")]
        public async Task<IActionResult> ChangeRole(Guid userId, [FromQuery] string role)
        {
            var success = await _userService.ChangeRoleAsync(userId, role);

            if (!success)
                return BadRequest("Role inválida ou utilizador inexistente.");

            return Ok($"Role alterada para '{role}'.");
        }

        // ---------------------------
        // DELETE USER (ADMIN)
        // ---------------------------
        [Authorize(Roles = "admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(Guid id)
        {
            var deleted = await _userService.DeleteUserAsync(id);

            if (!deleted)
                return NotFound();

            return Ok("Utilizador removido.");
        }
    }
}
