using Microsoft.EntityFrameworkCore;
using BrainUp.API.Data;
using BrainUp.API.Hubs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using BrainUp.API.Services;

var builder = WebApplication.CreateBuilder(args);

// ================================
//  SERVICES CONFIGURATION
// ================================

// Add controllers
builder.Services.AddControllers();

// Add database context (PostgreSQL)
builder.Services.AddDbContext<BrainUpContext>(options =>
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

var jwtKey = builder.Configuration["Jwt:Key"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException("JWT Key is not configured.");
}

var key = Encoding.UTF8.GetBytes(jwtKey);


builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(key)
        };
    });

// Add Swagger (para documentação da API)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add SignalR
builder.Services.AddSignalR();

builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<JwtService>();


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

app.UseAuthentication();
app.UseAuthorization();


app.Run();
