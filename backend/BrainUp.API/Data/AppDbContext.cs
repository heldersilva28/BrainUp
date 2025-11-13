using Microsoft.EntityFrameworkCore;
using BrainUp.API.Models;

namespace BrainUp.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // Tabelas da base de dados
        public DbSet<Question> Questions { get; set; } = null!;
    }
}
