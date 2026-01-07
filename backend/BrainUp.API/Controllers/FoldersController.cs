using BrainUp.API.DTOs;
using BrainUp.API.DTOs.Quizzes;
using BrainUp.API.Models;
using BrainUp.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BrainUp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FoldersController : ControllerBase
{
    private readonly FolderService _folderService;
    private readonly QuizService _quizService;

    public FoldersController(FolderService folderService, QuizService quizService)
    {
        _folderService = folderService;
        _quizService = quizService;
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.Parse(userIdClaim!);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<FolderResponseDto>>> GetFolders()
    {
        var userId = GetUserId();
        var folders = await _folderService.GetAllByUserIdAsync(userId);

        var response = folders.Select(f => new FolderResponseDto
        {
            Id = f.Id,
            Name = f.Name,
            UserId = f.UserId,
            CreatedAt = f.CreatedAt,
            QuizCount = f.Quizzes.Count
        });

        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<FolderResponseDto>> GetFolder(Guid id)
    {
        var userId = GetUserId();
        var folder = await _folderService.GetByIdAsync(id, userId);

        if (folder == null)
            return NotFound();

        var response = new FolderResponseDto
        {
            Id = folder.Id,
            Name = folder.Name,
            UserId = folder.UserId,
            CreatedAt = folder.CreatedAt,
            QuizCount = folder.Quizzes.Count
        };

        return Ok(response);
    }

    [HttpGet("{id}/quizzes")]
    public async Task<ActionResult<IEnumerable<QuizDto>>> GetFolderQuizzes(Guid id)
    {
        var userId = GetUserId();
        var folder = await _folderService.GetByIdAsync(id, userId);

        if (folder == null)
            return NotFound();

        var quizzes = folder.Quizzes.Select(q => new QuizDto
        {
            Id = q.Id,
            Title = q.Title,
            Description = q.Description,
            AuthorId = q.AuthorId,
            CreatedAt = q.CreatedAt,
            QuestionsCount = _quizService.GetQuestionCountInQuiz(q.Id).Result
        }).ToList();

        return Ok(quizzes);
    }

    [HttpPost]
    public async Task<ActionResult<FolderResponseDto>> CreateFolder(CreateFolderDto dto)
    {
        var userId = GetUserId();

        var folder = new Folder
        {
            Name = dto.Name,
            UserId = userId
        };

        var createdFolder = await _folderService.CreateAsync(folder);

        var response = new FolderResponseDto
        {
            Id = createdFolder.Id,
            Name = createdFolder.Name,
            UserId = createdFolder.UserId,
            CreatedAt = createdFolder.CreatedAt,
            QuizCount = 0
        };

        return CreatedAtAction(nameof(GetFolder), new { id = response.Id }, response);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<FolderResponseDto>> UpdateFolder(Guid id, UpdateFolderDto dto)
    {
        var userId = GetUserId();
        var folder = await _folderService.UpdateAsync(id, userId, dto.Name);

        if (folder == null)
            return NotFound();

        var response = new FolderResponseDto
        {
            Id = folder.Id,
            Name = folder.Name,
            UserId = folder.UserId,
            CreatedAt = folder.CreatedAt,
            QuizCount = folder.Quizzes.Count
        };

        return Ok(response);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteFolder(Guid id)
    {
        var userId = GetUserId();
        var deleted = await _folderService.DeleteAsync(id, userId);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}
