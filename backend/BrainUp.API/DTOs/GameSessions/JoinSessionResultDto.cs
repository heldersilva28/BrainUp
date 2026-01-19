using System;

namespace BrainUp.API.DTOs.GameSessions
{
    public class JoinSessionResultDto
    {
        public Guid SessionId { get; set; }
        public Guid PlayerId { get; set; }
    }
}
