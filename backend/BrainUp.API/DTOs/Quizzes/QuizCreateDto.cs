namespace BrainUp.API.DTOs.Quizzes
{
    public class QuizCreateDto
    {
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
    }
}
