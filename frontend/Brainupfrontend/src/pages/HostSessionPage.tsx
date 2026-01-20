import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import { useAuthGuard } from '../hooks/useAuthGuard';

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
  useAuthGuard();
  const quizData = location.state?.quiz as QuizData;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5027';

  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [answeredPlayers, setAnsweredPlayers] = useState<string[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [, setPlayerIds] = useState<string[]>([]); // novo
  const [hasStartedFirstRound, setHasStartedFirstRound] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isFinalLeaderboard, setIsFinalLeaderboard] = useState(false);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [correctAnswerInfo, setCorrectAnswerInfo] = useState<{
    type: string;
    correctOption?: QuestionOption;
    orderedOptions?: QuestionOption[];
  } | null>(null);
  const [showFinalResults, setShowFinalResults] = useState(false);
  const [finalStats, setFinalStats] = useState<{
    totalQuestions: number;
    averageScore: number;
    highestScore: number;
  } | null>(null);

  const currentQuestion = quizData?.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === (quizData?.questions.length || 0) - 1;
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);

  useEffect(() => {
    if (showFinalResults) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showFinalResults]);
  
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
     AUTO-ADVANCE QUANDO TODOS RESPONDEM
  ====================================================== */
  useEffect(() => {
    // Verificar se todos os jogadores responderam
    if (
      isTimerActive && 
      totalPlayers > 0 && 
      answeredPlayers.length === totalPlayers &&
      answeredPlayers.length > 0
    ) {
      console.log('✅ All players answered! Auto-advancing...');
      setIsTimerActive(false);
      
      // Pequeno delay para dar tempo de ver que todos responderam
      setTimeout(() => {
        nextQuestion();
      }, 1500);
    }
  }, [answeredPlayers.length, totalPlayers, isTimerActive]);

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
      console.error('❌ Cannot start round: missing connection or question', { 
        hasConnection: !!connection, 
        hasQuestion: !!question 
      });
      return;
    }

    console.log('🎮 Starting round', roundNum, question);

    setAnsweredPlayers([]);
    setTimeLeft(question.timeLimit);
    setIsTimerActive(true);

    // Buscar informação completa da pergunta do backend (com isCorrect e correctOrder)
    try {
      const questionRes = await authFetch(`${apiBaseUrl}/api/Questions/${question.id}`);
      
      if (questionRes.ok) {
        const fullQuestion = await questionRes.json();
        console.log('📥 Full question from API:', fullQuestion);
        
        // Buscar as options com informação de correção
        const optionsRes = await authFetch(`${apiBaseUrl}/api/Questions/${question.id}/options`);
        
        if (optionsRes.ok) {
          const options = await optionsRes.json();
          console.log('📥 Options from API:', options);
          
          // Normalizar options
          const normalizedOptions = options.map((opt: any) => ({
            id: opt.id,
            text: opt.optionText,
            isCorrect: opt.isCorrect,
            correctOrder: opt.correctOrder
          }));

          if (fullQuestion.type === 'ordering' || question.type === 'Ordering') {
            // Ordenar pelas correctOrder
            const sortedOptions = [...normalizedOptions].sort((a, b) => {
              const orderA = a.correctOrder ?? 999;
              const orderB = b.correctOrder ?? 999;
              return orderA - orderB;
            });
            
            setCorrectAnswerInfo({
              type: 'Ordering',
              orderedOptions: sortedOptions
            });
          } else {
            // Para MultipleChoice e TrueFalse, encontrar a opção correta
            const correctOpt = normalizedOptions.find((opt: any) => opt.isCorrect === true);
            
            setCorrectAnswerInfo({
              type: question.type,
              correctOption: correctOpt
            });
          }
        }
      }
    } catch (err) {
      console.error('⚠️ Error fetching full question details:', err);
      // Fallback: usar dados que já temos
      setCorrectAnswerInfo({
        type: question.type,
        correctOption: undefined,
        orderedOptions: undefined
      });
    }

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
      console.error('❌ Failed to start round in API:', message);
      setIsTimerActive(false);
      return;
    }

    const roundData = await roundResponse.json();
    const roundId = roundData?.roundId ?? roundData?.RoundId;

    if (!roundId) {
      console.error('❌ Missing roundId from API response');
      setIsTimerActive(false);
      return;
    }

    setCurrentRoundId(roundId);
      
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

    if (currentRoundId) {
      try {
        const res = await authFetch(
          `${apiBaseUrl}/api/GameSession/round/${currentRoundId}/end`,
          { method: 'POST' }
        );
  
        if (!res.ok) {
          const msg = await res.text();
          console.error('❌ Erro ao encerrar ronda na API:', msg);
        } else {
          console.log('✅ Ronda encerrada com sucesso na API');
        }
      } catch (err) {
        console.error('❌ Erro ao chamar EndRound API:', err);
      }
    } else {
      console.warn('⚠️ currentRoundId não definido, não foi possível encerrar ronda na API');
    }

    await connection.invoke('EndRound', sessionId);

    await fetchLeaderboard();
    setIsFinalLeaderboard(isLastQuestion);
    setShowLeaderboard(true);
  };

  const continueAfterLeaderboard = async () => {
    setShowLeaderboard(false);

    if (!connection || !sessionId) return;

    if (isFinalLeaderboard) {
      // Calcular estatísticas finais
      const totalQuestions = quizData.questions.length;
      const averageScore = leaderboardEntries.length > 0
        ? leaderboardEntries.reduce((sum, entry) => sum + entry.score, 0) / leaderboardEntries.length
        : 0;
      const highestScore = leaderboardEntries.length > 0
        ? Math.max(...leaderboardEntries.map(e => e.score))
        : 0;
    
      setFinalStats({
        totalQuestions,
        averageScore: Math.round(averageScore),
        highestScore
      });
    
      // 🔹 1. Terminar sessão no backend (API REST)
      try {
        const res = await authFetch(
          `${apiBaseUrl}/api/GameSession/${sessionId}/end`,
          { method: 'POST' }
        );
    
        if (!res.ok) {
          const msg = await res.text();
          console.error('❌ Erro ao terminar sessão na API:', msg);
        } else {
          console.log('✅ Sessão terminada com sucesso na API');
        }
      } catch (err) {
        console.error('❌ Erro ao chamar endpoint EndSession:', err);
      }
    
      // 🔹 2. Avisar via SignalR (opcional, se usas isto para notificar jogadores)
      await connection.invoke('EndSession', sessionId);
    
      // 🔹 3. Mostrar resultados finais
      setShowFinalResults(true);
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

  const goToDashboard = () => {
    navigate('/dashboard');
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
              className="rounded-xl border border-white/20 bg-white/5 px-5 py-4 text-white/80 flex items-center"
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
    <>
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
                {answeredPlayers.length === totalPlayers && totalPlayers > 0 && (
                  <span className="ml-2 animate-pulse">✓</span>
                )}
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
              <div className="text-white/70"></div>
              
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

      {/* Leaderboard Modal */}
      {showLeaderboard && !showFinalResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6">
          <div className="w-full max-w-5xl rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-md shadow-2xl max-h-[90vh] overflow-y-auto">
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

            <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
              {/* Leaderboard */}
              <div>
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
                        className="flex items-center justify-between rounded-2xl border border-white/20 bg-white/5 px-5 py-4 hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                            index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-900' :
                            index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                            'bg-white/15 text-white/80'
                          }`}>
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
                        Ainda não há pontuações registadas.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Correct Answer Display */}
              {correctAnswerInfo && (
                <div className="lg:w-80">
                  <div className="rounded-3xl border border-emerald-400/50 bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 p-6 shadow-lg">
                    <div className="mb-4 flex items-center gap-3">
                      <svg className="h-6 w-6 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <h3 className="text-lg font-bold text-emerald-200">Resposta Correta</h3>
                    </div>

                    {correctAnswerInfo.type === 'Ordering' && correctAnswerInfo.orderedOptions && correctAnswerInfo.orderedOptions.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-emerald-100/80 mb-3 font-semibold uppercase tracking-wide">Ordem correta:</p>
                        {correctAnswerInfo.orderedOptions.map((option, index) => (
                          <div
                            key={option.id}
                            className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/30 text-sm font-bold text-emerald-100">
                              {index + 1}
                            </span>
                            <span className="text-sm font-medium text-emerald-50">{option.text}</span>
                          </div>
                        ))}
                      </div>
                    ) : correctAnswerInfo.correctOption ? (
                      <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-4">
                        <p className="text-base font-semibold text-emerald-50">
                          {correctAnswerInfo.correctOption.text}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-4">
                        <p className="text-sm text-yellow-100/90 italic flex items-center gap-2">
                          <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"></svg>
                          <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
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

      {/* Final Results Screen */}
      {showFinalResults && finalStats && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">

          {/* Backdrop blur layer */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-pink-900 opacity-90" />

          {/* Modal Container */}
          <div
            className="
              relative w-full max-w-6xl max-h-[90vh]
              overflow-y-auto rounded-3xl
              backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl
              animate-[modalEnter_0.5s_ease-out_forwards]
            "
          >

            {/* 🔹 HEADER STICKY COM BLUR */}
            <div className="text-center mb-8 sticky top-0 bg-gradient-to-br from-purple-900/90 via-indigo-900/90 to-pink-900/90 backdrop-blur z-10 py-6 rounded-t-3xl border-b border-white/20">
              <div className="text-7xl mb-4 animate-bounce">🎉</div>
              <h1 className="text-5xl font-black mb-2 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
                Quiz Concluído!
              </h1>
              <p className="text-2xl text-white/80">{quizData.title}</p>
            </div>

            {/* 🔹 CONTEÚDO */}
            <div className="p-6 md:p-10">

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="rounded-3xl border border-white/30 bg-gradient-to-br from-blue-500/30 to-blue-600/20 p-8 backdrop-blur-xl shadow-2xl text-center">
                  <div className="text-5xl mb-4">📝</div>
                  <div className="text-4xl font-black mb-2">{finalStats.totalQuestions}</div>
                  <div className="text-lg text-white/80">Perguntas</div>
                </div>

                <div className="rounded-3xl border border-white/30 bg-gradient-to-br from-green-500/30 to-green-600/20 p-8 backdrop-blur-xl shadow-2xl text-center">
                  <div className="text-5xl mb-4">📊</div>
                  <div className="text-4xl font-black mb-2">{finalStats.averageScore}</div>
                  <div className="text-lg text-white/80">Pontuação Média</div>
                </div>

                <div className="rounded-3xl border border-white/30 bg-gradient-to-br from-yellow-500/30 to-orange-600/20 p-8 backdrop-blur-xl shadow-2xl text-center">
                  <div className="text-5xl mb-4">👥</div>
                  <div className="text-4xl font-black mb-2">{leaderboardEntries.length}</div>
                  <div className="text-lg text-white/80">Participantes</div>
                </div>
              </div>

              {/* Podium */}
              <div className="rounded-3xl border border-white/30 bg-gradient-to-br from-white/15 to-white/5 p-8 backdrop-blur-xl shadow-2xl mb-10">
                <h2 className="text-3xl font-black text-center mb-10">🏆 Top 3</h2>

                <div className="flex items-end justify-center gap-6 mb-8">

                  {/* 2nd Place */}
                  {leaderboardEntries[1] && (
                    <div className="flex flex-col items-center">
                      <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-6xl font-black text-gray-900 shadow-2xl mb-4 animate-pulse">
                        2
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-gray-300/30 to-gray-400/20 border border-gray-300/50 px-6 py-12 md:py-20 text-center shadow-xl">
                        <div className="text-2xl font-bold mb-2">{leaderboardEntries[1].name}</div>
                        <div className="text-4xl font-black text-gray-300">{leaderboardEntries[1].score} pts</div>
                      </div>
                    </div>
                  )}

                  {/* 1st Place */}
                  {leaderboardEntries[0] && (
                    <div className="flex flex-col items-center -mt-6 md:-mt-8">
                      <div className="text-6xl mb-4 animate-bounce">👑</div>
                      <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-7xl font-black text-white shadow-2xl mb-4 animate-pulse">
                        1
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-yellow-400/30 to-yellow-600/20 border-2 border-yellow-400/70 px-8 py-14 md:py-24 text-center shadow-2xl">
                        <div className="text-3xl font-black mb-3">{leaderboardEntries[0].name}</div>
                        <div className="text-5xl font-black text-yellow-400">{leaderboardEntries[0].score} pts</div>
                      </div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {leaderboardEntries[2] && (
                    <div className="flex flex-col items-center">
                      <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-6xl font-black text-white shadow-2xl mb-4 animate-pulse">
                        3
                      </div>
                      <div className="rounded-2xl bg-gradient-to-br from-amber-600/30 to-amber-700/20 border border-amber-600/50 px-6 py-12 md:py-20 text-center shadow-xl">
                        <div className="text-2xl font-bold mb-2">{leaderboardEntries[2].name}</div>
                        <div className="text-4xl font-black text-amber-400">{leaderboardEntries[2].score} pts</div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Remaining Players */}
                {leaderboardEntries.length > 3 && (
                  <div className="mt-8">
                    <h3 className="text-xl font-bold text-center mb-4 text-white/80">
                      Outros Participantes
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {leaderboardEntries.slice(3).map((entry, index) => (
                        <div
                          key={`${entry.name}-${index + 3}`}
                          className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 px-5 py-3 hover:bg-white/10 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                              {index + 4}
                            </div>
                            <span className="font-semibold">{entry.name}</span>
                          </div>
                          <span className="text-lg font-bold text-white/90">
                            {entry.score} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-center">
                <button
                  onClick={goToDashboard}
                  className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-10 py-4 text-xl font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-yellow-500/50"
                >
                  Voltar ao Dashboard
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>
    </div>
    </>
  );
};

export default HostSessionPage;
