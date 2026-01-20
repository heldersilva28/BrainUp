public class PlayerStatsDto
{
    public Guid PlayerId { get; set; }
    public string? PlayerName { get; set; }

    public int TotalScore { get; set; }

    public int TotalAnswers { get; set; }
    public int CorrectAnswers { get; set; }
    public double Accuracy { get; set; }

    public double AverageResponseTimeSeconds { get; set; }

    public int Rank { get; set; }
}
