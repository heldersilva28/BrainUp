namespace BrainUp.API.DTOs.Quizzes
{
    public class ReorderQuestionsDto
    {
        public List<ReorderItem> Items { get; set; } = new();
    }

    public class ReorderItem
    {
        public Guid QuestionId { get; set; }
        public int Order { get; set; }
    }
}
