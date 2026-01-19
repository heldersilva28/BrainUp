using System;

namespace BrainUp.API.DTOs.GameSessions
{
    public class StartRoundResultDto
    {
        public Guid RoundId { get; set; }
        public int RoundNumber { get; set; }
        public Guid QuestionId { get; set; }
    }
}
