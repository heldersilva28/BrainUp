public class RoundStatsDto
{
    public Guid RoundId { get; set; }
    public int RoundNumber { get; set; }

    public int TotalAnswers { get; set; }
    public int CorrectAnswers { get; set; }
    public double Accuracy { get; set; }

    public double AverageResponseTimeSeconds { get; set; }
}
