namespace BrainUp.API.DTOs.Quizzes
{
    public class QuizUpdateDto
    {
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
    }
}
