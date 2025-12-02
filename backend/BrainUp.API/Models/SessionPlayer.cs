using System;
using System.Collections.Generic;

namespace BrainUp.API.Models;

public partial class SessionPlayer
{
    public Guid Id { get; set; }

    public Guid? SessionId { get; set; }

    public string PlayerName { get; set; } = null!;

    public DateTime? JoinedAt { get; set; }

    public virtual ICollection<PlayerAnswer> PlayerAnswers { get; set; } = new List<PlayerAnswer>();

    public virtual ICollection<PlayerScore> PlayerScores { get; set; } = new List<PlayerScore>();

    public virtual GameSession? Session { get; set; }
}
