using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace BrainUp.API.Models;

public partial class QuestionOption
{
    public Guid Id { get; set; }

    public Guid? QuestionId { get; set; }

    public string OptionText { get; set; } = null!;

    public bool? IsCorrect { get; set; }

    public int? CorrectOrder { get; set; }

    public virtual ICollection<PlayerAnswer> PlayerAnswers { get; set; } = new List<PlayerAnswer>();

    [JsonIgnore]
    public virtual Question? Question { get; set; }
}
