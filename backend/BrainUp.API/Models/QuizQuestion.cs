using System;
using System.Collections.Generic;

namespace BrainUp.API.Models;

public partial class QuizQuestion
{
    public Guid QuizId { get; set; }

    public Guid QuestionId { get; set; }

    public int QuestionOrder { get; set; }

    public virtual Question Question { get; set; } = null!;

    public virtual Quiz Quiz { get; set; } = null!;
}
