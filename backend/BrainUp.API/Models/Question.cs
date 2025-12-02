using System;
using System.Collections.Generic;

namespace BrainUp.API.Models;

public partial class Question
{
    public Guid Id { get; set; }

    public int TypeId { get; set; }

    public Guid? AuthorId { get; set; }

    public string QuestionText { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public virtual User? Author { get; set; }

    public virtual ICollection<GameRound> GameRounds { get; set; } = new List<GameRound>();

    public virtual ICollection<QuestionOption> QuestionOptions { get; set; } = new List<QuestionOption>();

    public virtual ICollection<QuizQuestion> QuizQuestions { get; set; } = new List<QuizQuestion>();

    public virtual QuestionType Type { get; set; } = null!;
}
