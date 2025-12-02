using System;
using System.Collections.Generic;

namespace BrainUp.API.Models;

public partial class QuestionType
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public virtual ICollection<Question> Questions { get; set; } = new List<Question>();
}
