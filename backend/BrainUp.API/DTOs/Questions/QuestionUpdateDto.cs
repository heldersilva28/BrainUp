using System.Collections.Generic;

namespace BrainUp.API.DTOs.Questions
{
    public class QuestionUpdateDto
    {
        public string? QuestionText { get; set; }
        public int? TypeId { get; set; }
        public List<QuestionOptionDto>? Options { get; set; }   // opcional
    }
}
