namespace BrainUp.API.DTOs.Quizzes
{
    public class QuizDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public Guid? AuthorId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
