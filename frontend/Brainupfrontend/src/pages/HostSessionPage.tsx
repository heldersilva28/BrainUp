import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';

interface Question {
  id: string;
  title: string;
  type: 'MultipleChoice' | 'TrueFalse' | 'Ordering';
  options?: QuestionOption[];
  timeLimit: number;
  points: number;
}

interface QuestionOption {
  id: string;
  text: string;
}

interface QuizData {
  id: string;
  title: string;
  questions: Question[];
}

interface LeaderboardEntry {
  name: string;
  score: number;
}

const HostSessionPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const quizData = location.state?.quiz as QuizData;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5027';

  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [answeredPlayers, setAnsweredPlayers] = useState<string[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [playerIds, setPlayerIds] = useState<string[]>([]); // novo
  const [hasStartedFirstRound, setHasStartedFirstRound] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isFinalLeaderboard, setIsFinalLeaderboard] = useState(false);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');

  const currentQuestion = quizData?.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === (quizData?.questions.length || 0) - 1;

  /* =====================================================
     TIMER AUTO-ADVANCE
  ====================================================== */
  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isTimerActive && timeLeft === 0) {
      // Auto-advance quando tempo acaba
      setIsTimerActive(false);
      nextQuestion();
    }
  }, [timeLeft, isTimerActive]);

  /* =====================================================
     CONNECT HUB
  ====================================================== */
  useEffect(() => {
    if (!sessionId || !quizData) return;
    connectToHub();
    return () => { connection?.stop(); };
  }, []);

  const authFetch = (url: string, options: RequestInit = {}) => {
    const token = sessionStorage.getItem('brainup_token');
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  };

  const connectToHub = async () => {

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${apiBaseUrl}/gameHub`)
      .configureLogging(signalR.LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    newConnection.on('playeranswered', (playerId: string) => {
      console.log('✅ Player answered:', playerId);
      setAnsweredPlayers(prev => {
        if (prev.includes(playerId)) return prev;
        return [...prev, playerId];
      });
    });

    newConnection.on('SessionCreated', (_sessionId: string, existingPlayers: any[]) => {
      const existingIds = (existingPlayers ?? [])
        .map(p => p?.connectionId ?? p?.ConnectionId)
        .filter(Boolean);
      const uniqueIds = Array.from(new Set(existingIds));
      setPlayerIds(uniqueIds);
      setTotalPlayers(uniqueIds.length);
    });

    newConnection.on('playerjoined', (player: any) => {
      console.log('👤 Player joined (host view):', player);
      const id = player?.connectionId ?? player?.ConnectionId;
      if (!id) return;
      setPlayerIds(prev => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        setTotalPlayers(next.length);
        return next;
      });
    });

    newConnection.on('PlayerLeft', (player: any) => {
      console.log('👋 Player left (host view):', player);
      const id = player?.connectionId ?? player?.ConnectionId;
      if (!id) return;
      setPlayerIds(prev => {
        const next = prev.filter(existing => existing !== id);
        setTotalPlayers(next.length);
        return next;
      });
    });

    await newConnection.start();

    await newConnection.invoke(
    'CreateSession',
    sessionId,
    newConnection.connectionId
    );

    console.log('🎯 Host connected to hub');
    setConnection(newConnection);

  };
  const fetchLeaderboard = async () => {
    if (!sessionId) return;
    setIsLoadingLeaderboard(true);
    setLeaderboardError('');
    setShowLeaderboard(true);
    try {
      const res = await authFetch(`${apiBaseUrl}/api/GameSession/${sessionId}/leaderboard`);
      if (!res.ok) {
        setLeaderboardEntries([]);
        setLeaderboardError('Nao foi possivel obter a leaderboard.');
        return;
      }
      const data = await res.json();
      const entries = Array.isArray(data)
        ? data.map((entry: any) => ({
          name: entry?.player ?? entry?.Player ?? 'Jogador',
          score: Number(entry?.score ?? entry?.Score ?? 0),
        }))
        : [];
      setLeaderboardEntries(entries);
    } catch (err) {
      console.error('Erro ao carregar leaderboard:', err);
      setLeaderboardEntries([]);
      setLeaderboardError('Erro ao carregar a leaderboard.');
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  /* =====================================================
     START FIRST ROUND
  ====================================================== */
  const startFirstRound = async () => {
    if (!quizData?.questions[0]) {
      console.error('❌ No first question available');
      return;
    }

    console.log('🚀 Starting first round');
    setCurrentQuestionIndex(0);
    setHasStartedFirstRound(true);
    
    // Aguardar estado atualizar antes de chamar startRound
    setTimeout(() => {
      const firstQuestion = quizData.questions[0];
      startRoundWithQuestion(firstQuestion, 1);
    }, 100);
  };

  /* =====================================================
     START ROUND
  ====================================================== */
  const startRoundWithQuestion = async (question: Question, roundNum: number) => {
    if (!connection || !question) {
      console.error(' Cannot start round: missing connection or question', { 
        hasConnection: !!connection, 
        hasQuestion: !!question 
      });
      return;
    }

    console.log(' Starting round', roundNum, question);

    setAnsweredPlayers([]);
    setTimeLeft(question.timeLimit);
    setIsTimerActive(true);

    if (!sessionId) return;

    const roundResponse = await authFetch(`${apiBaseUrl}/api/GameSession/${sessionId}/round/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roundNumber: roundNum,
        questionId: question.id,
      }),
    });

    if (!roundResponse.ok) {
      const message = await roundResponse.text();
      console.error('?? Failed to start round in API:', message);
      setIsTimerActive(false);
      return;
    }

    const roundData = await roundResponse.json();
    const roundId = roundData?.roundId ?? roundData?.RoundId;

    if (!roundId) {
      console.error('?? Missing roundId from API response');
      setIsTimerActive(false);
      return;
    }

    await connection.invoke('StartRound', sessionId, roundNum, {
      roundId,
      id: question.id,
      title: question.title,
      type: question.type,
      options: question.options,
      timeLimit: question.timeLimit,
      points: question.points,
    });
  };

  /* =====================================================
     NEXT QUESTION
  ====================================================== */
  const nextQuestion = async () => {
    if (!connection || !sessionId) return;

    setIsTimerActive(false);

    await connection.invoke('EndRound', sessionId);

    await fetchLeaderboard();
    setIsFinalLeaderboard(isLastQuestion);
    setShowLeaderboard(true);
  };

  const continueAfterLeaderboard = async () => {
    setShowLeaderboard(false);

    if (!connection || !sessionId) return;

    if (isFinalLeaderboard) {
      await connection.invoke('EndSession', sessionId);
      navigate('/dashboard');
      return;
    }

    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    setIsFinalLeaderboard(false);

    setTimeout(() => {
      const nextQuestion = quizData.questions[nextIndex];
      startRoundWithQuestion(nextQuestion, nextIndex + 1);
    }, 100);
  };

  /* =====================================================
     RENDER OPTIONS
  ====================================================== */
  const renderOptions = () => {
    if (!currentQuestion) return null;

    if (currentQuestion.type === 'MultipleChoice') {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {currentQuestion.options?.map((option, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/20 bg-white/5 px-5 py-4 text-white/80"
            >
              <span className="inline-block w-8 h-8 rounded-full bg-white/20 mr-3 text-center leading-8">
                {String.fromCharCode(65 + i)}
              </span>
              {option.text}
            </div>
          ))}
        </div>
      );
    }

    if (currentQuestion.type === 'TrueFalse') {
      return (
        <div className="grid grid-cols-2 gap-4">
          {currentQuestion.options?.map(option => (
            <div
              key={option.id}
              className="rounded-xl border border-white/20 bg-white/5 px-5 py-4 text-center text-white/80"
            >
              {option.text}
            </div>
          ))}
        </div>
      );
    }

    if (currentQuestion.type === 'Ordering') {
      return (
        <div className="space-y-3">
          {currentQuestion.options?.map((option, i) => (
            <div
              key={option.id}
              className="rounded-xl border border-white/20 bg-white/5 px-5 py-4 text-white/80 flex items-center gap-3"
            >
              <span className="inline-block w-8 h-8 rounded-full bg-white/20 text-center leading-8">
                {i + 1}
              </span>
              {option.text}
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  if (!quizData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-3xl font-bold mb-4">Quiz não encontrado</h1>
          <button
            onClick={() => navigate(`/waiting-session/${sessionId}`)}
            className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:scale-105"
          >
            Voltar à Sala de Espera
          </button>
        </div>
      </div>
    );
  }

  // Show "Start first question" screen
  if (currentQuestionIndex === -1 || !hasStartedFirstRound) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 text-white">
        <div className="flex min-h-screen w-full flex-col gap-6 px-4 py-8 items-center justify-center">
          <div className="text-center max-w-2xl">
            <div className="text-6xl mb-6">🎮</div>
            <h1 className="text-4xl font-black mb-4">{quizData.title}</h1>
            <p className="text-xl text-white/80 mb-2">
              {quizData.questions.length} perguntas
            </p>
            <p className="text-white/60 mb-8">
              Os jogadores estão prontos. Clica para começar!
            </p>
            <button
              onClick={startFirstRound}
              className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-8 py-4 text-xl font-bold text-white shadow-lg transition hover:scale-105"
            >
              Começar Primeira Pergunta 🚀
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 text-white">
      <div className="flex min-h-screen w-full flex-col gap-6 px-4 py-8">
        {/* Header */}
        <header className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-white/60">
                BrainUp - Host
              </div>
              <h1 className="text-2xl font-black">{quizData.title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/30 bg-white/10 px-4 py-2 text-sm">
                Pergunta {currentQuestionIndex + 1}/{quizData.questions.length}
              </div>
              <div className="rounded-2xl bg-yellow-500/20 border border-yellow-500/50 px-4 py-2 text-sm font-semibold text-yellow-400">
                ⏱️ {timeLeft}s
              </div>
              <div className="rounded-2xl bg-green-500/20 border border-green-500/50 px-4 py-2 text-sm font-semibold text-green-400">
                {answeredPlayers.length}/{totalPlayers} responderam
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 w-full bg-white/20 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                timeLeft <= 5 ? 'bg-red-400' : 'bg-yellow-400'
              }`}
              style={{
                width: `${currentQuestion ? (timeLeft / currentQuestion.timeLimit) * 100 : 0}%`,
              }}
            />
          </div>
        </header>

        {/* Question Display */}
        <main className="flex-1">
          <div className="rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">{currentQuestion?.title}</h2>
              <div className="rounded-xl border border-white/30 px-4 py-2 text-sm">
                {currentQuestion?.points} pts
              </div>
            </div>

            {renderOptions()}

            <div className="mt-8 flex justify-between items-center">
              <div className="text-white/70">
                <p className="text-sm">
                </p>
              </div>
              
              <button
                onClick={nextQuestion}
                className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:scale-105"
              >
                {isLastQuestion ? 'Terminar Quiz' : 'Próxima Pergunta →'}
              </button>
            </div>
          </div>
        </main>
      </div>

      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="w-full max-w-2xl rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-md shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-white/60">
                  Leaderboard
                </div>
                <h2 className="text-3xl font-bold">
                  {isFinalLeaderboard ? 'Resultados finais' : 'Resultados da pergunta'}
                </h2>
              </div>
              <div className="rounded-2xl border border-white/30 bg-white/10 px-4 py-2 text-sm">
                {leaderboardEntries.length} jogadores
              </div>
            </div>

            {isLoadingLeaderboard ? (
              <div className="rounded-2xl border border-white/20 bg-white/5 px-5 py-4 text-white/70">
                A carregar leaderboard...
              </div>
            ) : leaderboardError ? (
              <div className="rounded-2xl border border-red-400/40 bg-red-400/10 px-5 py-4 text-red-200">
                {leaderboardError}
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboardEntries.map((entry, index) => (
                  <div
                    key={`${entry.name}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-white/20 bg-white/5 px-5 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="text-lg font-semibold">{entry.name}</div>
                    </div>
                    <div className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold">
                      {entry.score} pts
                    </div>
                  </div>
                ))}
                {leaderboardEntries.length === 0 && (
                  <div className="rounded-2xl border border-white/20 bg-white/5 px-5 py-4 text-white/70">
                    Ainda nao ha pontuacoes registadas.
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 flex justify-end">
              <button
                onClick={continueAfterLeaderboard}
                className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:scale-105"
              >
                {isFinalLeaderboard ? 'Terminar quiz' : 'Continuar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostSessionPage;
