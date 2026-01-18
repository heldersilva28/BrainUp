import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const JoinSessionPage: React.FC = () => {
  const [sessionCode, setSessionCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5027";

  const joinSession = async () => {
    if (!sessionCode.trim() || !playerName.trim()) {
      setError("Preenche todos os campos");
      return;
    }

    setLoading(true);
    setError('');

    try {
      // O código inserido será tratado como sessionId
      const sessionId = sessionCode.trim();
      
      const storedPlayerId = localStorage.getItem('brainup_player_id');
      const playerId = storedPlayerId ?? crypto.randomUUID();
      if (!storedPlayerId) {
        localStorage.setItem('brainup_player_id', playerId);
      }

      // Guardar dados do jogador
      localStorage.setItem('brainup_player', JSON.stringify({
        playerName: playerName.trim(),
        sessionId: sessionId,
        playerId: playerId
      }));
      
      navigate(`/player-session/${sessionId}`);
    } catch (err: any) {
      setError(err.message || "Erro ao entrar na sessão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 text-white">
      <div className="flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl sm:p-8">
          <div className="text-center">
            <div className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60 sm:text-xs sm:tracking-[0.4em]">
              BrainUp
            </div>
            <h1 className="mt-4 text-2xl font-black sm:text-3xl">
              Entrar no Quiz
            </h1>
            <p className="mt-3 text-sm text-white/70 sm:text-base">
              Insere o código da sessão e o teu nome
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl bg-red-500/20 border border-red-500/30 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); joinSession(); }}>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Código da Sessão
              </label>
              <input
                type="text"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                placeholder="Ex: ABC123"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:border-white/40 focus:outline-none focus:ring-0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                O Teu Nome
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Como te chamas?"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/50 focus:border-white/40 focus:outline-none focus:ring-0"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "A entrar..." : "Entrar no Quiz"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a 
              href="/" 
              className="text-sm text-white/60 hover:text-white/80 transition"
            >
              ← Voltar ao início
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinSessionPage;
