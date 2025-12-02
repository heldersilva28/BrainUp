using System;
using System.Collections.Generic;

namespace BrainUp.API.Models;

public partial class GameRound
{
    public Guid Id { get; set; }

    public Guid? SessionId { get; set; }

    public Guid? QuestionId { get; set; }

    public int RoundNumber { get; set; }

    public DateTime? StartedAt { get; set; }

    public DateTime? EndedAt { get; set; }

    public virtual ICollection<PlayerAnswer> PlayerAnswers { get; set; } = new List<PlayerAnswer>();

    public virtual Question? Question { get; set; }

    public virtual GameSession? Session { get; set; }
}
