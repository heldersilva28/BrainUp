using System.ComponentModel.DataAnnotations;

namespace BrainUp.API.DTOs;

public class CreateFolderDto
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = null!;
}

public class UpdateFolderDto
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = null!;
}

public class FolderResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public int QuizCount { get; set; }
}
