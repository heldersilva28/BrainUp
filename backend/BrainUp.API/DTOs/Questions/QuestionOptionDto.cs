namespace BrainUp.API.DTOs.Questions
{
    public class QuestionOptionDto
    {
        public Guid? Id { get; set; } // nulo para novas opções
        public string OptionText { get; set; } = null!;
        public bool? IsCorrect { get; set; }
        public int? CorrectOrder { get; set; } // só usado em perguntas de ordenar
    }
}
