import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';

interface Question {
  id: string;
  title: string;
  type: 'MultipleChoice' | 'TrueFalse' | 'Ordering';
  options?: string[];
  timeLimit: number;
  points: number;
}

interface QuizData {
  id: string;
  title: string;
  questions: Question[];
}

const HostSessionPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const quizData = location.state?.quiz as QuizData;

  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [answeredPlayers, setAnsweredPlayers] = useState<string[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [hasStartedFirstRound, setHasStartedFirstRound] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

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

  const connectToHub = async () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5027';

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

    newConnection.on('playerjoined', (player: any) => {
      console.log('👤 Player joined (host view):', player);
      setTotalPlayers(prev => prev + 1);
    });

    newConnection.on('PlayerLeft', (player: any) => {
      console.log('👋 Player left (host view):', player);
      setTotalPlayers(prev => Math.max(0, prev - 1));
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
    
    await connection.invoke('StartRound', sessionId, roundNum, {
      id: question.id,
      title: question.title,
      type: question.type,
      options: question.options,
      timeLimit: question.timeLimit,
    });
  };

  /* =====================================================
     NEXT QUESTION
  ====================================================== */
  const nextQuestion = async () => {
    if (!connection) return;

    setIsTimerActive(false);
    
    await connection.invoke('EndRound', sessionId);
    
    if (isLastQuestion) {
      await connection.invoke('EndSession', sessionId);
      navigate('/dashboard');
    } else {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      
      // Aguardar estado atualizar
      setTimeout(() => {
        const nextQuestion = quizData.questions[nextIndex];
        startRoundWithQuestion(nextQuestion, nextIndex + 1);
      }, 100);
    }
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
              {option}
            </div>
          ))}
        </div>
      );
    }

    if (currentQuestion.type === 'TrueFalse') {
      return (
        <div className="grid grid-cols-2 gap-4">
          {['Verdadeiro', 'Falso'].map(option => (
            <div
              key={option}
              className="rounded-xl border border-white/20 bg-white/5 px-5 py-4 text-center text-white/80"
            >
              {option}
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
              key={i}
              className="rounded-xl border border-white/20 bg-white/5 px-5 py-4 text-white/80 flex items-center gap-3"
            >
              <span className="inline-block w-8 h-8 rounded-full bg-white/20 text-center leading-8">
                {i + 1}
              </span>
              {option}
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
                  {answeredPlayers.length} de {totalPlayers} jogadores responderam
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
    </div>
  );
};

export default HostSessionPage;
