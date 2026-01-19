import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import { guidToCode } from '../utils/sessionUtils';
import { useSearchParams } from 'react-router-dom';

interface Player {
  connectionId: string;
  name: string;
  joinedAt: string;
  playerId?: string;
}

interface QuestionOption {
  id?: string;
  optionText: string;
  isCorrect: boolean;
  correctOrder?: number;
}

interface Question {
  id: string;
  questionText: string;
  type: string;
  options: QuestionOption[];
  order?: number;
}

interface QuizDetails {
  id: string;
  title: string;
  description: string;
  authorId: string;
  createdAt: string;
  questionsCount: number;
}

const WaitingSessionPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const quizId = searchParams.get('quizId');
  const navigate = useNavigate();
  const location = useLocation();
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessionStatus, setSessionStatus] = useState<'waiting' | 'started'>('waiting');
  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5027';
  const normalizePlayer = (player: any): Player | null => {
    if (!player) return null;
    const connectionId = player.connectionId ?? player.ConnectionId ?? '';
    const playerId = player.playerId ?? player.PlayerId;
    if (!connectionId && !playerId) return null;
    return {
      connectionId,
      name: player.name ?? player.Name ?? 'Anonimo',
      joinedAt: player.joinedAt ?? player.JoinedAt ?? new Date().toISOString(),
      playerId,
    };
  };

  const authFetch = (url: string, options: RequestInit = {}) => {
    const token = sessionStorage.getItem('brainup_token');
    console.log('[authFetch] Request:', { url, method: options.method || 'GET', hasToken: !!token });
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  };

  useEffect(() => {
    if (!sessionId || !quizId) {
      console.error('[useEffect] Missing sessionId or quizId');
      setError('Dados da sessão inválidos');
      setLoading(false);
      return;
    }

    console.log('[useEffect] Loading quiz data for:', { sessionId, quizId });
    loadQuizData();
    connectToHub();

    return () => {
      connection?.stop();
    };
  }, [sessionId, quizId]);

  const loadQuizData = async () => {
    try {
      console.log('[loadQuizData] Iniciando carregamento');
      setLoading(true);

      // 1. Buscar dados do quiz
      const quizRes = await authFetch(`${apiBaseUrl}/api/Quizzes/${quizId}`);
      console.log('[loadQuizData] Quiz response status:', quizRes.status);
      
      if (!quizRes.ok) {
        const errorText = await quizRes.text();
        console.error('[loadQuizData] Erro ao carregar quiz:', { status: quizRes.status, error: errorText });
        throw new Error('Erro ao carregar quiz');
      }
      
      const quizData: QuizDetails = await quizRes.json();
      console.log('[loadQuizData] Quiz carregado:', quizData);
      setQuiz(quizData);

      // 2. Buscar perguntas do quiz
      const questionsRes = await authFetch(`${apiBaseUrl}/api/Questions/quiz/${quizId}`);
      console.log('[loadQuizData] Questions response status:', questionsRes.status);
      
      if (!questionsRes.ok) {
        const errorText = await questionsRes.text();
        console.warn('[loadQuizData] Erro ao carregar perguntas:', { status: questionsRes.status, error: errorText });
        setQuestions([]);
        return;
      }
      
      const questionsData: Question[] = await questionsRes.json();
      
      // Ordenar perguntas
      const sortedQuestions = questionsData.sort((a, b) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
      });
      
      console.log('[loadQuizData] Perguntas carregadas:', { 
        count: sortedQuestions.length, 
        questions: sortedQuestions 
      });
      setQuestions(sortedQuestions);

    } catch (err) {
      console.error('[loadQuizData] Erro crítico:', err);
      setError('Erro ao carregar dados do quiz');
    } finally {
      setLoading(false);
    }
  };

  const connectToHub = async () => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${apiBaseUrl}/gameHub`)
      .configureLogging(signalR.LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    /* ---------- EVENTOS ---------- */

    newConnection.on('SessionCreated', (createdSessionId: string, existingPlayers?: Player[]) => {
      if (existingPlayers && existingPlayers.length > 0) {
        const normalizedPlayers = existingPlayers
          .map(normalizePlayer)
          .filter((p): p is Player => Boolean(p));
        setPlayers(normalizedPlayers);
        return;
      }
      console.log('✅ Session created:', createdSessionId);
      if (existingPlayers && existingPlayers.length > 0) {
        setPlayers(prev =>
          prev.length === 0
            ? existingPlayers.map(p => ({ ...p, name: p.name || 'Anônimo' }))
            : prev
        );
      }
    });

    newConnection.on('playerjoined', (player: any) => {
      const normalizedPlayerData = normalizePlayer(player);
      if (!normalizedPlayerData) {
        console.warn('Invalid player data after normalization:', player);
        return;
      }

      setPlayers(prev => {
        if (normalizedPlayerData.playerId) {
          const existingIndex = prev.findIndex(p => p.playerId === normalizedPlayerData.playerId);
          if (existingIndex >= 0) {
            const next = [...prev];
            next[existingIndex] = { ...prev[existingIndex], ...normalizedPlayerData };
            return next;
          }
        }

        if (prev.some(p => p.connectionId === normalizedPlayerData.connectionId)) {
          return prev;
        }

        return [...prev, normalizedPlayerData];
      });
      return;
      const normalizedPlayer = {
        connectionId: player.ConnectionId ?? player.connectionId,
        name: player.Name ?? player.name ?? 'Anônimo',
        joinedAt: player.JoinedAt ?? player.joinedAt ?? new Date().toISOString(),
      };
    
      if (!normalizedPlayer.connectionId) {
        console.warn('⚠️ Invalid player data after normalization:', player);
        return;
      }
    
      setPlayers(prev => {
        if (prev.some(p => p.connectionId === normalizedPlayer.connectionId)) {
          return prev;
        }
        return [...prev, normalizedPlayer];
      });
    });

    newConnection.on('PlayerLeft', (player: any) => {
      console.log('👋 Player left:', player);
      const leftConnectionId = player?.connectionId ?? player?.ConnectionId;
      const leftPlayerId = player?.playerId ?? player?.PlayerId;
      setPlayers(prev =>
        prev.filter(p => {
          if (leftPlayerId) {
            return p.playerId !== leftPlayerId;
          }
          if (leftConnectionId) {
            return p.connectionId !== leftConnectionId;
          }
          return true;
        })
      );
    });

    /* ---------- CONNECT ---------- */

    try {
      await newConnection.start();
      console.log('🔌 Connected to hub');
      
      await newConnection.invoke('CreateSession', sessionId, newConnection.connectionId);
      console.log('📡 CreateSession invoked with sessionId:', sessionId);

      setConnection(newConnection);
    } catch (error) {
      console.error('❌ Connection error:', error);
    }
  };

  const startSession = async () => {
    if (!connection) {
      console.error('❌ Cannot start session: missing connection');
      return;
    }

    if (!quiz || !questions || questions.length === 0) {
      console.error('❌ Cannot start session: missing quiz data or questions', {
        hasQuiz: !!quiz,
        questionsCount: questions?.length || 0
      });
      alert('Não é possível iniciar o quiz. Dados incompletos ou sem perguntas.');
      return;
    }
    
    // Preparar dados completos do quiz para enviar
    const completeQuizData = {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      questions: questions.map(q => ({
        id: q.id,
        title: q.questionText,
        type: q.type === 'multiple_choice' ? 'MultipleChoice' 
             : q.type === 'true_false' ? 'TrueFalse' 
             : 'Ordering',
        options: q.options.map(opt => ({
          id: opt.id ?? '',
          text: opt.optionText
        })),
        timeLimit: 30, // Pode ser configurável
        points: 1000 // Pode ser configurável
      }))
    };

    console.log('✅ Starting session with complete quiz data:', completeQuizData);
    
    await connection.invoke('StartSession', sessionId);
    setSessionStatus('started');
    await connection.stop();
    setConnection(null);
    
    // Navegar para host session com dados completos
    navigate(`/host-session/${sessionId}`, { 
      state: { quiz: completeQuizData },
      replace: true 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-pulse">⏳</div>
          <h1 className="text-3xl font-bold">A carregar quiz...</h1>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-3xl font-bold mb-4">{error || 'Quiz não encontrado'}</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-2xl bg-white/20 px-6 py-3 font-semibold hover:bg-white/30 transition"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 text-white">
      <div className="flex min-h-screen w-full flex-col gap-6 px-4 py-8">
        {/* Header Section */}
        <header className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-white/60">
                BrainUp
              </div>
              <h1 className="text-2xl font-black">{quiz.title}</h1>
              <p className="text-sm text-white/70">
                {questions.length} {questions.length === 1 ? 'pergunta' : 'perguntas'} • Aguardando jogadores
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/30 bg-white/10 px-4 py-2 text-sm">
                Jogadores: {players.length}
              </div>
              <div className="rounded-2xl bg-yellow-500/20 border border-yellow-500/50 px-4 py-2 text-sm font-semibold text-yellow-400">
                {players.length} online
              </div>
            </div>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Players Section */}
          <section className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Participantes</h2>
                <p className="text-sm text-white/70">
                  Lista de jogadores na sala
                </p>
              </div>
              <div className="rounded-xl border border-white/30 px-3 py-1 text-xs">
                Online
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {players.map((p, index) => (
                <div
                  key={p.playerId ?? p.connectionId}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 hover:bg-white/10 transition-all duration-300 animate-fadeIn"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-pink-500 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {(p.name || 'A')?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{p.name || 'Anônimo'}</p>
                      <p className="text-xs text-white/60">
                        {p.joinedAt ? new Date(p.joinedAt).toLocaleTimeString() : '--:--:--'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {players.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <div className="text-5xl mb-4">⏳</div>
                  <p className="text-lg text-white/70">
                    À espera de jogadores...
                  </p>
                  <p className="text-xs text-white/50 mt-2">
                    Partilha o código para começar!
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Code and Actions Section */}
          <section className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
            <div>
              <h2 className="text-xl font-bold">Código de acesso</h2>
              <p className="text-sm text-white/70">
                Partilha este código com a turma
              </p>
            </div>

            <div className="mt-6 rounded-3xl border border-white/30 bg-white/10 px-6 py-6 text-center">
              <div className="text-xs uppercase tracking-[0.4em] text-white/60">
                Código
              </div>
              <div className="mt-2 text-4xl font-black tracking-widest text-yellow-400">
                {guidToCode(sessionId!)}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => navigator.clipboard.writeText(guidToCode(sessionId!))}
                className="w-full rounded-2xl border border-white/40 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Copiar código
              </button>

              {sessionStatus === 'waiting' && (
                <button
                  disabled={players.length === 0 || questions.length === 0}
                  onClick={startSession}
                  className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg transition ${
                    players.length === 0 || questions.length === 0
                      ? 'bg-gray-600 cursor-not-allowed opacity-50'
                      : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:scale-105'
                  }`}
                >
                  {questions.length === 0 
                    ? 'Quiz sem perguntas' 
                    : players.length === 0 
                    ? 'À espera de jogadores...' 
                    : 'Iniciar quiz 🚀'}
                </button>
              )}

              {sessionStatus === 'started' && (
                <div className="w-full rounded-2xl bg-green-500/20 border border-green-500/50 px-4 py-3 text-center">
                  <span className="text-green-400 font-semibold">
                    ✓ Quiz Iniciado!
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-4 text-xs text-white/70">
              Assim que iniciares, todos os jogadores entram no quiz.
            </div>
          </section>
        </main>
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default WaitingSessionPage;
