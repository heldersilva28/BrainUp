using System;
using System.Collections.Generic;

namespace BrainUp.API.DTOs.Questions
{
    public class QuestionDto
    {
        public Guid Id { get; set; }
        public string QuestionText { get; set; } = null!;
        public string Type { get; set; } = null!;
        public DateTime CreatedAt { get; set; }

        public List<QuestionOptionResponseDto> Options { get; set; } = new();

        public int Order { get; set;  }
    }

    public class QuestionOptionResponseDto
    {
        public Guid Id { get; set; }
        public string OptionText { get; set; } = null!;
        public bool IsCorrect { get; set; }
        public int? CorrectOrder { get; set; }
    }
}
