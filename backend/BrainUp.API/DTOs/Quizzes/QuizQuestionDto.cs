namespace BrainUp.API.DTOs.Quizzes
{
    public class QuizQuestionDto
    {
        public Guid QuestionId { get; set; }
        public string QuestionText { get; set; } = null!;
        public int Order { get; set; }
    }
}
