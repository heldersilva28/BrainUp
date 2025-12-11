namespace BrainUp.API.DTOs.Quizzes
{
    public class QuizQuestionAddDto
    {
        public Guid QuestionId { get; set; }
        public int Order { get; set; } = 0;
    }
}
