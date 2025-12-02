using System;
using System.Collections.Generic;

namespace BrainUp.API.Models;

public partial class PlayerScore
{
    public Guid Id { get; set; }

    public Guid? SessionId { get; set; }

    public Guid? PlayerId { get; set; }

    public int TotalScore { get; set; }

    public virtual SessionPlayer? Player { get; set; }

    public virtual GameSession? Session { get; set; }
}
