using System;
using System.Collections.Generic;

namespace BrainUp.API.Models;

public partial class Quiz
{
    public Guid Id { get; set; }

    public string Title { get; set; } = null!;

    public string? Description { get; set; }

    public Guid? AuthorId { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User? Author { get; set; }

    public virtual ICollection<GameSession> GameSessions { get; set; } = new List<GameSession>();

    public virtual ICollection<QuizQuestion> QuizQuestions { get; set; } = new List<QuizQuestion>();
}
