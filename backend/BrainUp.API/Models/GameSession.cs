using System;
using System.Collections.Generic;

namespace BrainUp.API.Models;

public partial class GameSession
{
    public Guid Id { get; set; }

    public Guid? QuizId { get; set; }

    public Guid? HostId { get; set; }

    public DateTime? StartedAt { get; set; }

    public DateTime? EndedAt { get; set; }

    public bool? IsActive { get; set; }

    public virtual ICollection<GameRound> GameRounds { get; set; } = new List<GameRound>();

    public virtual User? Host { get; set; }

    public virtual ICollection<PlayerScore> PlayerScores { get; set; } = new List<PlayerScore>();

    public virtual Quiz? Quiz { get; set; }

    public virtual ICollection<SessionPlayer> SessionPlayers { get; set; } = new List<SessionPlayer>();
}
