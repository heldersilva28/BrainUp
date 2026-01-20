public class SessionStatsDto
{
    public Guid SessionId { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public double DurationSeconds { get; set; }

    public int TotalPlayers { get; set; }
    public int TotalRounds { get; set; }

    public double AverageAccuracy { get; set; }

    public List<PlayerStatsDto> Players { get; set; } = new();
    public List<RoundStatsDto> Rounds { get; set; } = new();
}
