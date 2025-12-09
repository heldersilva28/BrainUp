using System.Collections.Generic;

namespace BrainUp.API.DTOs.Questions
{
    public class QuestionCreateDto
    {
        public string QuestionText { get; set; } = null!;
        public int TypeId { get; set; }   // FK para question_types
        public List<QuestionOptionDto> Options { get; set; } = new();
    }
}
