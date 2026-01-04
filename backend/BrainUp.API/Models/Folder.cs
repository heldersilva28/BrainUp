using System;
using System.Collections.Generic;

namespace BrainUp.API.Models;

public partial class Folder
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public Guid UserId { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<Quiz> Quizzes { get; set; } = new List<Quiz>();

    public virtual User User { get; set; } = null!;
}
