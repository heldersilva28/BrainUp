using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace BrainUp.API.Hubs
{
    public class GameHub : Hub
    {
        private static ConcurrentDictionary<string, string> _connectionToSession = new();
        private static ConcurrentDictionary<string, string> _hostSessions = new();
        private static ConcurrentDictionary<string, List<PlayerInfo>> _sessionPlayers = new();

        // --------------------------------------------
        // HOST CRIA SESSÃO
        // --------------------------------------------
        public async Task CreateSession(string sessionId, string hostConnectionId)
        {
            _hostSessions[hostConnectionId] = sessionId;
            _connectionToSession[Context.ConnectionId] = sessionId;

            _sessionPlayers.TryAdd(sessionId, new List<PlayerInfo>());

            await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);
            
            // Send existing players if any
            var existingPlayers = _sessionPlayers.TryGetValue(sessionId, out var players) 
                ? players.ToList() 
                : new List<PlayerInfo>();
                
            await Clients.Caller.SendAsync("SessionCreated", sessionId, existingPlayers);
        }

        // --------------------------------------------
        // PLAYER ENTRA COM CÓDIGO
        // --------------------------------------------
        public async Task JoinPlayerByCode(string sessionCode, string playerName)
        {
            if (_connectionToSession.ContainsKey(Context.ConnectionId))
                return;

            string sessionId = sessionCode;

            // Código curto
            if (sessionCode.Length == 6)
            {
                var foundSession = _sessionPlayers.Keys
                    .FirstOrDefault(s =>
                        s.Replace("-", "")
                         .StartsWith(sessionCode, StringComparison.OrdinalIgnoreCase));

                if (foundSession == null)
                {
                    await Clients.Caller.SendAsync("JoinError", "Código inválido");
                    return;
                }
                
                sessionId = foundSession;
            }

            // Verificar se a sessão existe
            if (!_sessionPlayers.ContainsKey(sessionId))
            {
                await Clients.Caller.SendAsync("JoinError", "Sessão não encontrada");
                return;
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);
            _connectionToSession[Context.ConnectionId] = sessionId;

            var player = new PlayerInfo
            {
                ConnectionId = Context.ConnectionId,
                Name = playerName,
                JoinedAt = DateTime.UtcNow
            };

            // 🔒 LOCK na lista (List<T> não é thread-safe)
            lock (_sessionPlayers[sessionId])
            {
                if (_sessionPlayers[sessionId]
                    .All(p => p.ConnectionId != Context.ConnectionId))
                {
                    _sessionPlayers[sessionId].Add(player);
                }
            }

            // Enviar para OUTROS no grupo (excluindo o caller = o próprio player)
            await Clients.OthersInGroup(sessionId).SendAsync("playerjoined", player);
            
            // Confirmar ao player que entrou com sucesso
            await Clients.Caller.SendAsync("JoinedSuccessfully", sessionId);
        }

        // --------------------------------------------
        // HOST CONTROLA JOGO
        // --------------------------------------------
        public async Task StartSession(string sessionId)
        {
            await Clients.Group(sessionId).SendAsync("sessionstarted");
        }

        public async Task StartRound(string sessionId, int roundNumber, object questionData)
        {
            await Clients.Group(sessionId).SendAsync("roundstarted", new
            {
                RoundNumber = roundNumber,
                Question = questionData
            });
        }

        public async Task EndRound(string sessionId)
        {
            await Clients.Group(sessionId).SendAsync("roundended");
        }

        public async Task EndSession(string sessionId)
        {
            await Clients.Group(sessionId).SendAsync("sessionended");
        }

        public async Task PlayerAnswered(string sessionId, string playerId)
        {
            await Clients.Group(sessionId).SendAsync("playeranswered", playerId);
        }

        // --------------------------------------------
        // DISCONNECT
        // --------------------------------------------
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var connectionId = Context.ConnectionId;

            if (_connectionToSession.TryRemove(connectionId, out var sessionId))
            {
                if (_sessionPlayers.TryGetValue(sessionId, out var players))
                {
                    PlayerInfo? removed = null;

                    lock (players)
                    {
                        removed = players.FirstOrDefault(p => p.ConnectionId == connectionId);
                        if (removed != null)
                            players.Remove(removed);
                    }

                    if (removed != null)
                        await Clients.Group(sessionId).SendAsync("PlayerLeft", removed);
                }
            }

            await base.OnDisconnectedAsync(exception);
        }
    }

    public class PlayerInfo
    {
        public required string ConnectionId { get; set; }
        public required string Name { get; set; }
        public DateTime JoinedAt { get; set; }
    }
}
