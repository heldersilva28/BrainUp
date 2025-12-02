using System;
using System.Collections.Generic;

namespace BrainUp.API.Models;

public partial class PlayerAnswer
{
    public Guid Id { get; set; }

    public Guid? RoundId { get; set; }

    public Guid? PlayerId { get; set; }

    public Guid? OptionId { get; set; }

    public DateTime? AnsweredAt { get; set; }

    public bool? IsCorrect { get; set; }

    public virtual QuestionOption? Option { get; set; }

    public virtual SessionPlayer? Player { get; set; }

    public virtual GameRound? Round { get; set; }
}
