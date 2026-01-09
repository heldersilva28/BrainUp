using BrainUp.API.Data;
using BrainUp.API.DTOs;
using BrainUp.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace BrainUp.API.Services
{

    public class UserService
    {
        private readonly BrainUpContext _context;
        private readonly JwtService _jwtService;

        public UserService(BrainUpContext context, JwtService jwtService)
        {
            _context = context;
            _jwtService = jwtService;
        }

        // ---------------------------
        // REGISTER
        // ---------------------------
        public async Task<UserDto?> Register(UserCreateDto dto)
        {
            // Verifica se o email já existe
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                return null;

            // Cria o novo utilizador
            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = dto.Username,
                Email = dto.Email,
                PasswordHash = HashPassword(dto.Password),
                CreatedAt = DateTime.UtcNow
            };

            // Escolher a role
            Role? role = null;

            if (dto.RoleId > 0)
            {
                // Tenta buscar a role pelo ID fornecido
                role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == dto.RoleId);
            }

            if (role == null)
            {
                // Fallback para "user" caso o RoleId não exista ou não seja fornecido
                role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "user");
            }

            // Adiciona a role ao utilizador
            if (role != null)
                user.Roles.Add(role);

            // Adiciona o utilizador ao contexto e salva
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Retorna o DTO com a role correta
            return new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                Username = user.Username,
                CreatedAt = user.CreatedAt,
                Role = role?.Name ?? "user"
            };
        }


        // ---------------------------
        // LOGIN
        // ---------------------------
        public async Task<string?> Login(UserLoginDto dto)
        {
            var user = await _context.Users
                .Include(u => u.Roles)
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null) return null;

            if (!VerifyPassword(dto.Password, user.PasswordHash))
                return null;

            var role = user.Roles.FirstOrDefault()?.Name ?? "user";

            return _jwtService.GenerateToken(user.Id, user.Email, role);
        }

        // ---------------------------
        // HELPERS
        // ---------------------------
        private string HashPassword(string password)
        {
            using var sha = SHA256.Create();
            var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(bytes);
        }

        private bool VerifyPassword(string password, string hash)
        {
            return HashPassword(password) == hash;
        }

        // ---------------------------
        // GET ALL USERS (ADMIN)
        // ---------------------------
        public async Task<List<UserDto>> GetAllUsersAsync()
        {
            return await _context.Users
                .Include(u => u.Roles)
                .Select(u => new UserDto
                {
                    Id = u.Id,
                    Username = u.Username,
                    Email = u.Email,
                    CreatedAt = u.CreatedAt,
                    Role = u.Roles.First().Name
                })
                .ToListAsync();
        }

        // ---------------------------
        // GET USER BY ID
        // ---------------------------
        public async Task<UserDto?> GetUserByIdAsync(Guid id)
        {
            var user = await _context.Users
                .Include(u => u.Roles)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null) return null;

            return new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                CreatedAt = user.CreatedAt,
                Role = user.Roles.First().Name
            };
        }

        // ---------------------------
        // UPDATE USER (username)
        // ---------------------------
        public async Task<bool> UpdateUserAsync(Guid id, UserDto updated)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return false;

            user.Username = updated.Username;

            await _context.SaveChangesAsync();
            return true;
        }

        // ---------------------------
        // CHANGE USER ROLE (ADMIN ONLY)
        // ---------------------------
        public async Task<bool> ChangeRoleAsync(Guid userId, string newRole)
        {
            var user = await _context.Users
                .Include(u => u.Roles)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null) return false;

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name == newRole);
            if (role == null) return false;

            user.Roles.Clear();    // garante apenas 1 role
            user.Roles.Add(role);

            await _context.SaveChangesAsync();
            return true;
        }

        // ---------------------------
        // DELETE USER
        // ---------------------------
        public async Task<bool> DeleteUserAsync(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return false;

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return true;
        }

    }
}
