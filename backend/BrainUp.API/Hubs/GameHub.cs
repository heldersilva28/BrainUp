using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace BrainUp.API.Hubs
{
    public class GameHub : Hub
    {
        // Enviado quando um jogador entra
        public async Task JoinGame(string playerName)
        {
            await Clients.All.SendAsync("PlayerJoined", playerName);
        }

        // Enviado quando um jogador responde a uma pergunta
        public async Task SendAnswer(string playerName, string answer)
        {
            await Clients.All.SendAsync("ReceiveAnswer", playerName, answer);
        }

        // Enviado quando o jogo termina
        public async Task EndGame()
        {
            await Clients.All.SendAsync("GameEnded");
        }
    }
}
