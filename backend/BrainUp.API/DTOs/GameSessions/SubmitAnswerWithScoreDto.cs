namespace BrainUp.API.DTOs.GameSessions
{
    public class SubmitAnswerWithScoreDto
    {
        public Guid? OptionId { get; set; }
        public List<Guid>? OrderedOptionIds { get; set; }
        public int TimeRemaining { get; set; }
        public int TimeTotal { get; set; }
        public int BasePoints { get; set; }
    }
}
