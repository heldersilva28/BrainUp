using Microsoft.EntityFrameworkCore;
using BrainUp.API.Data;
using BrainUp.API.Hubs;

var builder = WebApplication.CreateBuilder(args);

// ================================
//  SERVICES CONFIGURATION
// ================================

// Add controllers
builder.Services.AddControllers();

// Add database context (PostgreSQL)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
);

// Add CORS (permite ligação do React)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173") // URL do React (Vite)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

// Add Swagger (para documentação da API)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add SignalR
builder.Services.AddSignalR();

var app = builder.Build();

// ================================
//  MIDDLEWARE PIPELINE
// ================================

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthorization();

app.MapControllers();
app.MapHub<GameHub>("/gamehub"); // (iremos criar o hub mais tarde)

app.Run();
