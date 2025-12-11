using Microsoft.AspNetCore.SignalR;

namespace BrainUp.API.Hubs
{
    public class GameHub : Hub
    {
        // --------------------------------------------
        // HOST CRIA OU ENTRA NA SALA
        // --------------------------------------------
        public async Task JoinHost(string sessionId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);
            await Clients.Group(sessionId).SendAsync("HostJoined");
        }

        // --------------------------------------------
        // PLAYER ENTRA NA SALA
        // --------------------------------------------
        public async Task JoinPlayer(string sessionId, string playerId, string playerName)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);

            await Clients.Group(sessionId).SendAsync("PlayerJoined", new
            {
                PlayerId = playerId,
                PlayerName = playerName
            });
        }

        // --------------------------------------------
        // HOST INICIA PRÓXIMA PERGUNTA
        // --------------------------------------------
        public async Task StartRound(string sessionId, int roundNumber, Guid questionId)
        {
            await Clients.Group(sessionId).SendAsync("RoundStarted", new
            {
                RoundNumber = roundNumber,
                QuestionId = questionId
            });
        }

        // --------------------------------------------
        // PLAYER RESPONDE
        // --------------------------------------------
        public async Task PlayerAnswered(string sessionId, string playerId)
        {
            // Host recebe número de respostas em tempo real
            await Clients.Group(sessionId).SendAsync("PlayerAnswered", playerId);
        }

        // --------------------------------------------
        // HOST TERMINA A RONDA
        // --------------------------------------------
        public async Task EndRound(string sessionId)
        {
            await Clients.Group(sessionId).SendAsync("RoundEnded");
        }

        // --------------------------------------------
        // HOST TERMINA A SESSÃO
        // --------------------------------------------
        public async Task EndSession(string sessionId)
        {
            await Clients.Group(sessionId).SendAsync("SessionEnded");
        }
    }
}
