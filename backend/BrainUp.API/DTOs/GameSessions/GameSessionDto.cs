namespace BrainUp.API.DTOs.GameSessions
{
    public class GameSessionDto
    {
        public Guid Id { get; set; }
        public Guid QuizId { get; set; }
        public Guid HostId { get; set; }
        public bool IsActive { get; set; }
        public DateTime StartedAt { get; set; }
    }
}
