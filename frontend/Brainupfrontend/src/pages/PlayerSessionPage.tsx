import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import ConfirmModal from '../components/ConfirmModal';

interface QuestionOption {
  id: string;
  text: string;
}

interface Question {
  id: string;
  title: string;
  type: 'MultipleChoice' | 'TrueFalse' | 'Ordering';
  options?: QuestionOption[];
  timeLimit: number;
  points?: number;
  roundId?: string;
}

const PlayerSessionPage: React.FC = () => {
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const navigate = useNavigate();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5027';

  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [sessionStatus, setSessionStatus] =
    useState<'waiting' | 'question' | 'waiting-next' | 'finished'>('waiting');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [roundNumber, setRoundNumber] = useState(0);
  const [playerData, setPlayerData] = useState<any>(null);
  const [confirmedSessionId, setConfirmedSessionId] = useState<string | null>(null); //tirar
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const hasConnectedRef = React.useRef(false);
  
  // Para drag and drop em perguntas de ordenação
  const [orderingItems, setOrderingItems] = useState<QuestionOption[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const dragIndexRef = React.useRef<number | null>(null);

  // Modal states
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'error' as 'confirm' | 'alert' | 'error' | 'success',
  });

  /* =====================================================
     LOAD PLAYER + CONNECT
  ====================================================== */

  useEffect(() => {
    // Prevenir múltiplas execuções (React Strict Mode)
    if (hasConnectedRef.current) {
      console.log('⚠️ Connection already initiated, skipping...');
      return;
    }

    const stored = localStorage.getItem('brainup_player');
    if (!stored) {
      navigate('/join-session');
      return;
    }

    try {
      const data = JSON.parse(stored);
      
      // Validate required fields
      if (!data.playerName || !data.sessionId) {
        navigate('/join-session');
        return;
      }

      const storedPlayerId =
        data.playerId || localStorage.getItem('brainup_player_id');
      const playerId = storedPlayerId ?? crypto.randomUUID();
      if (!storedPlayerId) {
        localStorage.setItem('brainup_player_id', playerId);
      }
      if (data.playerId !== playerId) {
        data.playerId = playerId;
        localStorage.setItem('brainup_player', JSON.stringify(data));
      }
      
      hasConnectedRef.current = true; // 🔒 Marcar como conectado
      setPlayerData(data);
      connectToHub(data);
    } catch (error) {
      console.error('Invalid player data:', error);
      navigate('/join-session');
    }

    // Cleanup ao desmontar
    return () => {
      if (connection) {
        console.log('🔌 Disconnecting...');
        connection.stop();
      }
    };
  }, []); // Dependências vazias - só executa uma vez

  /* =====================================================
     TIMER
  ====================================================== */

  useEffect(() => {
    if (timeLeft > 0 && sessionStatus === 'question' && !hasAnswered) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, sessionStatus, hasAnswered]);

  /* =====================================================
     DRAG AND DROP HELPERS
  ====================================================== */
  const moveOrderingItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    setOrderingItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      setSelectedAnswer(next.map(item => item.id));
      return next;
    });
  };

  const buildDragPreview = (label: string) => {
    const preview = document.createElement("div");
    preview.textContent = label;
    preview.style.padding = "12px 16px";
    preview.style.background = "rgba(255,255,255,0.15)";
    preview.style.border = "1px solid rgba(255,255,255,0.35)";
    preview.style.borderRadius = "12px";
    preview.style.color = "white";
    preview.style.fontSize = "16px";
    preview.style.fontWeight = "600";
    preview.style.boxShadow = "0 12px 24px rgba(0,0,0,0.25)";
    preview.style.pointerEvents = "none";
    preview.style.position = "absolute";
    preview.style.top = "-9999px";
    preview.style.left = "-9999px";
    document.body.appendChild(preview);
    return preview;
  };

  /* =====================================================
     SIGNALR
  ====================================================== */

  const connectToHub = async (data: any) => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${apiBaseUrl}/gameHub`)
      .configureLogging(signalR.LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    /* ---------- EVENTOS PRIMEIRO ---------- */

    newConnection.on('JoinedSuccessfully', (confirmedSessionId: string) => {
      console.log('✅ Joined successfully:', confirmedSessionId);
      setSessionStatus('waiting');
      setConfirmedSessionId(confirmedSessionId); //tirar
    });

    newConnection.on('JoinError', (message: string) => {
      console.error('❌ Join error:', message);
      setModalConfig({
        isOpen: true,
        title: 'Erro ao Entrar',
        message: message || 'Código inválido ou sessão inexistente',
        type: 'error',
      });
    });

    newConnection.on('sessionstarted', () => {
      console.log('🎮 Session started - aguardando primeira pergunta');
      setSessionStatus('waiting-next');
    });

    newConnection.on('roundstarted', (roundData: any) => {
      console.log('📝 Round started - EVENTO RECEBIDO:', roundData);
      console.log('📝 Question data:', roundData.question || roundData.Question);
      console.log('📝 Round number:', roundData.roundNumber || roundData.RoundNumber);
      
      // Normalizar dados (pode vir com PascalCase ou camelCase)
      const rawQuestion = roundData.question || roundData.Question;
      const round = roundData.roundNumber || roundData.RoundNumber || 1;
      const roundId = rawQuestion?.roundId || roundData.roundId || roundData.RoundId || null;

      if (!rawQuestion) {
        console.error('? No question data in roundstarted event!');
        return;
      }

      const rawOptions = Array.isArray(rawQuestion.options)
        ? (rawQuestion.options as Array<QuestionOption | string>)
        : [];

      const normalizedOptions = rawOptions.map((option: QuestionOption | string) => (
        typeof option === 'string'
          ? { id: option, text: option }
          : { id: option.id, text: option.text }
      ));

      const normalizedQuestion: Question = {
        ...rawQuestion,
        options: normalizedOptions,
        roundId,
      };

      console.log('? Setting question:', normalizedQuestion);
      setCurrentQuestion(normalizedQuestion);
      setRoundNumber(round);
      setCurrentRoundId(roundId);
      setTimeLeft(rawQuestion.timeLimit ?? 30);
      setHasAnswered(false);
      setSelectedAnswer(null);

      // Se for pergunta de ordenacao, inicializar array
      if (rawQuestion.type === 'Ordering' && normalizedOptions.length > 0) {
        setOrderingItems(normalizedOptions);
        setSelectedAnswer(normalizedOptions.map(option => option.id));
      } else {
        setOrderingItems([]);
      }
      setSessionStatus('question');
      
      console.log('✅ Session status changed to: question');
    });

    newConnection.on('roundended', () => {
      console.log('⏸️ Round ended');
      setSessionStatus('waiting-next');
      setCurrentQuestion(null);
      setSelectedAnswer(null);
      setHasAnswered(false);
      setCurrentRoundId(null);
    });

    newConnection.on('sessionended', () => {
      console.log('🏁 Session ended');
      setSessionStatus('finished');
      setCurrentQuestion(null);
      setCurrentRoundId(null);
    });

    newConnection.on('HostDisconnected', () => {
      setModalConfig({
        isOpen: true,
        title: 'Sessão Encerrada',
        message: 'O anfitrião saiu da sessão',
        type: 'alert',
      });
      setSessionStatus('finished');
    });

    /* ---------- CONNECTAR ---------- */

    try {
      await newConnection.start();
      console.log('🔌 Player connected to hub');

      console.log('📡 Invoking JoinPlayerByCode:', {
        sessionCode: sessionCode || data.sessionId,
        playerName: data.playerName,
        playerId: data.playerId
      });

      await newConnection.invoke(
        'JoinPlayerByCode',
        sessionCode || data.sessionId,
        data.playerName,
        data.playerId
      );

      setConnection(newConnection);
    } catch (error) {
      console.error('❌ Player connection error:', error);
      setModalConfig({
        isOpen: true,
        title: 'Erro de Conexão',
        message: 'Não foi possível conectar ao servidor',
        type: 'error',
      });
    }
  };

  /* =====================================================
     MODAL HANDLERS
  ====================================================== */

  const handleModalConfirm = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
    navigate('/join-session');
  };

  /* =====================================================
     SUBMIT ANSWER
  ====================================================== */

  const submitAnswer = async () => {
    if (!selectedAnswer || hasAnswered || !connection) return;

    setHasAnswered(true);

    const targetSessionId =
      playerData?.sessionId || confirmedSessionId || sessionCode;
    if (!targetSessionId || !currentRoundId || !playerData?.playerId || !currentQuestion) return;

    const isOrderingAnswer = Array.isArray(selectedAnswer);
    const payload = {
      optionId: isOrderingAnswer ? null : selectedAnswer,
      orderedOptionIds: isOrderingAnswer ? selectedAnswer : null,
      timeRemaining: timeLeft,
      timeTotal: currentQuestion.timeLimit ?? 30,
      basePoints: currentQuestion.points ?? 0,
    };

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/GameSession/${targetSessionId}/round/${currentRoundId}/answer-with-score/${playerData.playerId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (response.ok) {
        const data = await response.json();
        setLastPoints(typeof data?.points === 'number' ? data.points : 0);
      }
    } catch (error) {
      console.error('Erro ao enviar resposta:', error);
    }

    await connection.invoke(
      'PlayerAnswered',
      targetSessionId,
      connection.connectionId
    );
  };

  /* =====================================================
     RENDER
  ====================================================== */

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const options = currentQuestion.options ?? [];

    if (currentQuestion.type === 'MultipleChoice') {
      return (
        <div className="space-y-3">
          {options.map((option, i) => (
            <button
              key={option.id}
              disabled={hasAnswered}
              onClick={() => setSelectedAnswer(option.id)}
              className={`w-full p-5 rounded-2xl border-2 font-semibold text-lg transition-all duration-300 transform hover:scale-[1.02] ${
                selectedAnswer === option.id
                  ? 'border-yellow-400 bg-yellow-400/30 shadow-lg shadow-yellow-400/50'
                  : 'border-white/30 bg-white/10 hover:border-white/50 hover:bg-white/15'
              } ${hasAnswered ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="inline-block w-8 h-8 rounded-full bg-white/20 mr-3 text-center leading-8">
                {String.fromCharCode(65 + i)}
              </span>
              {option.text}
            </button>
          ))}
        </div>
      );
    }

    if (currentQuestion.type === 'TrueFalse') {
      const trueFalseOptions = options.length === 2
        ? options
        : [
          { id: 'true', text: 'Verdadeiro' },
          { id: 'false', text: 'Falso' }
        ];

      return (
        <div className="grid grid-cols-2 gap-4">
          {trueFalseOptions.map(option => (
            <button
              key={option.id}
              disabled={hasAnswered}
              onClick={() => setSelectedAnswer(option.id)}
              className={`p-8 rounded-2xl border-2 font-bold text-xl transition-all duration-300 transform hover:scale-105 ${
                selectedAnswer === option.id
                  ? 'border-yellow-400 bg-yellow-400/30 shadow-lg shadow-yellow-400/50'
                  : 'border-white/30 bg-white/10 hover:border-white/50 hover:bg-white/15'
              } ${hasAnswered ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {option.text.trim().charAt(0).toUpperCase()}
              <div className="text-sm mt-2">{option.text}</div>
            </button>
          ))}
        </div>
      );
    }

    if (currentQuestion.type === 'Ordering') {
      return (
        <div className="space-y-4">
          <div className="rounded-xl bg-white/10 px-5 py-4 text-sm border border-white/20">
            <p className="text-center text-white/90 font-semibold">
              ?? Arrasta para ordenar (1 = primeiro, {orderingItems.length} = ultimo)
            </p>
          </div>

          <div className="space-y-3">
            {orderingItems.map((item, index) => (
              <div
                key={item.id}
                data-order-index={index}
                className={`flex items-center justify-between rounded-xl border-2 px-5 py-4 text-white transition-all duration-300 touch-none ${
                  draggingIndex === index
                    ? "opacity-60 border-yellow-400/50 bg-yellow-400/20"
                    : hasAnswered
                    ? "opacity-50 cursor-not-allowed border-white/20 bg-white/5"
                    : "border-white/30 bg-white/10 hover:bg-white/15 hover:border-white/50 cursor-move"
                }`}
                draggable={!hasAnswered}
                onDragStart={(event) => {
                  if (hasAnswered) return;
                  dragIndexRef.current = index;
                  setDraggingIndex(index);
                  event.dataTransfer.effectAllowed = "move";
                  const preview = buildDragPreview(item.text);
                  event.dataTransfer.setDragImage(preview, 20, 20);
                  requestAnimationFrame(() => preview.remove());
                }}
                onDragOver={(event) => {
                  if (hasAnswered) return;
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  if (hasAnswered) return;
                  event.preventDefault();
                  const fromIndex = dragIndexRef.current;
                  if (fromIndex === null || fromIndex === index) return;
                  moveOrderingItem(fromIndex, index);
                  dragIndexRef.current = null;
                  setDraggingIndex(null);
                }}
                onDragEnd={() => {
                  dragIndexRef.current = null;
                  setDraggingIndex(null);
                }}
                onTouchStart={(event) => {
                  if (hasAnswered) return;
                  dragIndexRef.current = index;
                  setDraggingIndex(index);
                }}
                onTouchMove={(event) => {
                  if (hasAnswered) return;
                  const touch = event.touches[0];
                  const target = document.elementFromPoint(
                    touch.clientX,
                    touch.clientY
                  ) as HTMLElement | null;
                  const droppable = target?.closest("[data-order-index]") as HTMLElement | null;
                  if (!droppable) return;
                  const nextIndex = Number(droppable.dataset.orderIndex ?? index);
                  const fromIndex = dragIndexRef.current;
                  if (fromIndex === null || fromIndex === nextIndex) return;
                  moveOrderingItem(fromIndex, nextIndex);
                  dragIndexRef.current = nextIndex;
                  setDraggingIndex(nextIndex);
                }}
                onTouchEnd={() => {
                  dragIndexRef.current = null;
                  setDraggingIndex(null);
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
                    {index + 1}
                  </span>
                  <span>{item.text}</span>
                </div>
                <span className="text-white/60 text-sm">Arrasta</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText="Voltar"
        onConfirm={handleModalConfirm}
        onCancel={() => {}}
      />

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center text-white p-6">
        {/* Debug Info */}
        <div className="fixed top-4 right-4 bg-black/50 text-white text-xs p-2 rounded-lg backdrop-blur-sm z-50">
          <div>Status: {sessionStatus}</div>
          <div>Question: {currentQuestion ? '✓' : '✗'}</div>
          <div>Round: {roundNumber}</div>
        </div>

        {sessionStatus === 'waiting' && (
          <div className="text-center">
            <div className="text-6xl mb-6 animate-pulse">🧠</div>
            <h1 className="text-3xl font-bold">A aguardar início do quiz...</h1>
            <p className="text-gray-400 mt-2">O anfitrião vai começar em breve</p>
          </div>
        )}

        {sessionStatus === 'waiting-next' && (
          <div className="text-center">
            <div className="text-6xl mb-6 animate-bounce">⏳</div>
            <h1 className="text-3xl font-bold">A preparar próxima pergunta...</h1>
          </div>
        )}

        {sessionStatus === 'finished' && (
          <div className="text-center">
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-4xl font-bold mb-4">Quiz Terminado!</h1>
            <p className="text-gray-300">Obrigado por jogares</p>
          </div>
        )}

        {sessionStatus === 'question' && currentQuestion && (
          <div className="max-w-3xl w-full">
            {/* Header with Round and Timer */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <div className="text-lg">
                  <span className="text-gray-400">Pergunta</span>
                  <span className="ml-2 font-bold text-2xl text-yellow-400">
                    {roundNumber}
                  </span>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
                    {timeLeft}s
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    timeLeft <= 5 ? 'bg-red-400' : 'bg-yellow-400'
                  }`}
                  style={{
                    width: `${(timeLeft / (currentQuestion.timeLimit || 30)) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mb-6 border border-white/20">
              <h2 className="text-2xl font-bold text-center leading-relaxed">
                {currentQuestion.title}
              </h2>
            </div>

            {/* Answers */}
            {renderQuestion()}

            {/* Submit Button */}
            {selectedAnswer && !hasAnswered && (
              <button
                onClick={submitAnswer}
                className="mt-6 w-full bg-gradient-to-r from-yellow-400 to-pink-500 p-4 rounded-2xl font-bold text-xl shadow-lg shadow-yellow-400/50 hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                Confirmar Resposta ✓
              </button>
            )}

            {/* Answer Submitted */}
            {hasAnswered && (
              <div className="mt-6 bg-green-500/20 border-2 border-green-500/50 rounded-2xl p-4 text-center">
                <span className="text-green-400 text-xl font-semibold">
                  ✓ Resposta enviada com sucesso!
                </span>
              </div>
            )}
          </div>
        )}

        {/* Fallback para estados inesperados */}
        {sessionStatus !== 'waiting' && 
         sessionStatus !== 'waiting-next' && 
         sessionStatus !== 'finished' && 
         sessionStatus !== 'question' && (
          <div className="text-center">
            <div className="text-6xl mb-6">🤔</div>
            <h1 className="text-3xl font-bold">Estado desconhecido</h1>
            <p className="text-gray-400 mt-2">Status: {sessionStatus}</p>
          </div>
        )}
      </div>
    </>
  );
};

export default PlayerSessionPage;
