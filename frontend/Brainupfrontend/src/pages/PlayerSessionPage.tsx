import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import ConfirmModal from '../components/ConfirmModal';

interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
  correctOrder?: number;
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

interface LeaderboardEntry {
  playerName: string;
  score: number;
  rank: number;
}

const PlayerSessionPage: React.FC = () => {
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const navigate = useNavigate();
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5027';

  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [sessionStatus, setSessionStatus] =
    useState<'waiting' | 'question' | 'waiting-next' | 'round-results' | 'finished'>('waiting');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [roundNumber, setRoundNumber] = useState(0);
  const [playerData, setPlayerData] = useState<any>(null);
  const [confirmedSessionId, setConfirmedSessionId] = useState<string | null>(null);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [, setLastPoints] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<{
    isCorrect: boolean;
    correctAnswer: any;
    earnedPoints: number;
  } | null>(null);
  const [playerLeaderboard, setPlayerLeaderboard] = useState<LeaderboardEntry | null>(null);
  const [topLeaderboard, setTopLeaderboard] = useState<LeaderboardEntry[]>([]);
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

  // Reconnection states
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('connected');
  const maxReconnectAttempts = 5;

  /* =====================================================
     TIMER
  ====================================================== */
  useEffect(() => {
    if (timeLeft > 0 && sessionStatus === 'question') {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, sessionStatus]);

  /* =====================================================
     PERSIST STATE TO LOCALSTORAGE
  ====================================================== */
  useEffect(() => {
    if (sessionStatus === 'question' && currentQuestion && confirmedSessionId) {
      const stateToSave = {
        sessionStatus,
        currentQuestion,
        currentRoundId,
        roundNumber,
        timeLeft,
        hasAnswered,
        selectedAnswer,
        confirmedSessionId,
        timestamp: Date.now()
      };
      localStorage.setItem('brainup_player_state', JSON.stringify(stateToSave));
    }
  }, [sessionStatus, currentQuestion, currentRoundId, roundNumber, timeLeft, hasAnswered, selectedAnswer, confirmedSessionId]);

  /* =====================================================
     RESTORE STATE AFTER REFRESH
  ====================================================== */
  const restorePlayerState = async () => {
    const savedState = localStorage.getItem('brainup_player_state');
    if (!savedState) return false;

    try {
      const state = JSON.parse(savedState);

      // Check if state is still valid (not older than 5 minutes)
      const age = Date.now() - (state.timestamp || 0);
      if (age > 5 * 60 * 1000) {
        console.log('⚠️ Saved state is too old, ignoring');
        localStorage.removeItem('brainup_player_state');
        return false;
      }

      // Verify session is still active
      const targetSessionId = state.confirmedSessionId || sessionCode;
      if (!targetSessionId) return false;

      try {
        const sessionCheck = await fetch(`${apiBaseUrl}/api/GameSession/${targetSessionId}`);
        if (!sessionCheck.ok) {
          console.log('⚠️ Session no longer exists');
          localStorage.removeItem('brainup_player_state');

          // Show error modal for ended session
          setModalConfig({
            isOpen: true,
            title: 'Sessão Terminada',
            message: 'Esta sessão já foi encerrada pelo anfitrião.',
            type: 'error',
          });

          return false;
        }

        // Check if session is active (API returns true/false)
        const isActive = await sessionCheck.json();

        if (isActive === false) {
          console.log('⚠️ Session is no longer active');
          localStorage.removeItem('brainup_player_state');
          setSessionStatus('finished');

          setModalConfig({
            isOpen: true,
            title: 'Sessão Terminada',
            message: 'Este quiz já terminou.',
            type: 'alert',
          });

          return false;
        }

        console.log('✅ Session is active:', isActive);
      } catch (err) {
        console.error('Error checking session:', err);
        return false;
      }

      // Restore state
      console.log('✅ Restoring player state after refresh:', state);

      if (state.currentQuestion) {
        // Fetch full question details with correct answers
        try {
          const questionRes = await fetch(`${apiBaseUrl}/api/Questions/${state.currentQuestion.id}`);
          if (questionRes.ok) {
            const optionsRes = await fetch(`${apiBaseUrl}/api/Questions/${state.currentQuestion.id}/options`);

            if (optionsRes.ok) {
              const options = await optionsRes.json();
              const enrichedOptions = (state.currentQuestion.options || []).map((opt: any) => {
                const fullOpt = options.find((o: any) => o.id === opt.id);
                return {
                  ...opt,
                  isCorrect: fullOpt?.isCorrect,
                  correctOrder: fullOpt?.correctOrder
                };
              });

              state.currentQuestion.options = enrichedOptions;

              // Restore ordering items if it's an ordering question
              if (state.currentQuestion.type === 'Ordering' && state.selectedAnswer && Array.isArray(state.selectedAnswer)) {
                const orderedItems = state.selectedAnswer.map((id: string) =>
                  enrichedOptions.find((opt: any) => opt.id === id)
                ).filter(Boolean);
                setOrderingItems(orderedItems);
              }
            }
          }
        } catch (err) {
          console.error('Error fetching question details:', err);
        }

        setCurrentQuestion(state.currentQuestion);
      }

      setSessionStatus(state.sessionStatus);
      setCurrentRoundId(state.currentRoundId);
      setRoundNumber(state.roundNumber);
      setTimeLeft(state.timeLeft);
      setHasAnswered(state.hasAnswered);
      setSelectedAnswer(state.selectedAnswer);
      setConfirmedSessionId(state.confirmedSessionId);

      return true;
    } catch (error) {
      console.error('Error restoring player state:', error);
      localStorage.removeItem('brainup_player_state');
      return false;
    }
  };

  /* =====================================================
     RECONNECTION LOGIC
  ====================================================== */
  const attemptReconnection = async (data: any, attemptNumber: number = 1) => {
    if (attemptNumber > maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      setModalConfig({
        isOpen: true,
        title: 'Conexão Perdida',
        message: 'Não foi possível reconectar ao servidor. Por favor, volta a entrar na sessão.',
        type: 'error',
      });
      setConnectionStatus('disconnected');
      setIsReconnecting(false);
      return;
    }

    console.log(`🔄 Reconnection attempt ${attemptNumber}/${maxReconnectAttempts}`);
    setIsReconnecting(true);
    setConnectionStatus('reconnecting');
    setReconnectAttempts(attemptNumber);

    // Wait before attempting (exponential backoff)
    const delay = Math.min(1000 * Math.pow(2, attemptNumber - 1), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await connectToHub(data, true);
      console.log('✅ Reconnection successful');
      setIsReconnecting(false);
      setReconnectAttempts(0);
      setConnectionStatus('connected');
    } catch (error) {
      console.error(`❌ Reconnection attempt ${attemptNumber} failed:`, error);
      attemptReconnection(data, attemptNumber + 1);
    }
  };

  /* =====================================================
     LOAD PLAYER + CONNECT
  ====================================================== */
  useEffect(() => {
    if (hasConnectedRef.current) {
      console.log('⚠️ Connection already initiated, skipping...');
      return;
    }

    const stored = localStorage.getItem('brainup_player');
    if (!stored) {
      console.log('❌ No player data found, redirecting...');
      navigate('/join-session');
      return;
    }

    try {
      const data = JSON.parse(stored);

      // Validação mais robusta
      if (!data || typeof data !== 'object') {
        console.log('❌ Invalid player data structure');
        localStorage.removeItem('brainup_player');
        navigate('/join-session');
        return;
      }

      if (!data.playerName || typeof data.playerName !== 'string') {
        console.log('❌ Missing or invalid playerName');
        localStorage.removeItem('brainup_player');
        navigate('/join-session');
        return;
      }

      if (!data.sessionId || typeof data.sessionId !== 'string') {
        console.log('❌ Missing or invalid sessionId');
        localStorage.removeItem('brainup_player');
        navigate('/join-session');
        return;
      }

      // Garantir playerId
      const storedPlayerId = data.playerId || localStorage.getItem('brainup_player_id');
      const playerId = storedPlayerId && typeof storedPlayerId === 'string'
        ? storedPlayerId
        : crypto.randomUUID();

      if (!storedPlayerId) {
        localStorage.setItem('brainup_player_id', playerId);
      }

      // Atualizar dados se necessário
      const normalizedData = {
        ...data,
        playerId,
        playerName: data.playerName.trim(),
        sessionId: data.sessionId.trim()
      };

      if (JSON.stringify(data) !== JSON.stringify(normalizedData)) {
        localStorage.setItem('brainup_player', JSON.stringify(normalizedData));
      }

      console.log('✅ Player data loaded:', {
        playerName: normalizedData.playerName,
        sessionId: normalizedData.sessionId,
        playerId: normalizedData.playerId
      });

      hasConnectedRef.current = true;
      setPlayerData(normalizedData);

      // Try to restore state before connecting
      restorePlayerState().then(restored => {
        if (restored) {
          console.log('✅ State restored, reconnecting...');
        }
        connectToHub(normalizedData);
      });
    } catch (error) {
      console.error('❌ Error parsing player data:', error);
      localStorage.removeItem('brainup_player');
      localStorage.removeItem('brainup_player_id');
      navigate('/join-session');
    }
  }, [navigate]);

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
  const connectToHub = async (data: any, isReconnect: boolean = false) => {
    if (!data || !data.playerName || !data.sessionId || !data.playerId) {
      console.error('❌ Invalid data passed to connectToHub');
      setModalConfig({
        isOpen: true,
        title: 'Erro',
        message: 'Dados de jogador inválidos',
        type: 'error',
      });
      return;
    }

    // Check if session exists and is active before connecting
    try {
      const sessionCheck = await fetch(`${apiBaseUrl}/api/GameSession/${data.sessionId}`);

      if (!sessionCheck.ok) {
        console.error('❌ Session does not exist');
        setModalConfig({
          isOpen: true,
          title: 'Sessão Não Encontrada',
          message: 'Esta sessão não existe ou já foi encerrada.',
          type: 'error',
        });
        return;
      }

      // API returns true if active, false if finished
      const isActive = await sessionCheck.json();
      console.log('🔍 Session active status:', isActive);

      if (isActive === false) {
        console.error('❌ Session is not active (finished)');
        setSessionStatus('finished');
        setModalConfig({
          isOpen: true,
          title: 'Sessão Terminada',
          message: 'Este quiz já terminou. Não é possível entrar.',
          type: 'alert',
        });
        return;
      }

      console.log('✅ Session is active, proceeding to connect');
    } catch (err) {
      console.error('❌ Error checking session:', err);
      setModalConfig({
        isOpen: true,
        title: 'Erro de Conexão',
        message: 'Não foi possível verificar o estado da sessão.',
        type: 'error',
      });
      return;
    }

    try {
      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${apiBaseUrl}/gameHub`)
        .configureLogging(signalR.LogLevel.Information)
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            if (retryContext.elapsedMilliseconds < 60000) {
              return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 10000);
            }
            return null;
          }
        })
        .build();

      // Handle reconnection events
      newConnection.onreconnecting((error) => {
        console.log('🔄 Connection lost, attempting to reconnect...', error);
        setConnectionStatus('reconnecting');
        setIsReconnecting(true);
      });

      newConnection.onreconnected(async (connectionId) => {
        console.log('✅ Reconnected successfully:', connectionId);
        setConnectionStatus('connected');
        setIsReconnecting(false);
        setReconnectAttempts(0);

        // Rejoin session after reconnection
        const codeToUse = sessionCode || data.sessionId;
        try {
          await newConnection.invoke('JoinPlayerByCode', codeToUse, data.playerName, data.playerId);

          // Restore state if available
          await restorePlayerState();
        } catch (err) {
          console.error('❌ Failed to rejoin after reconnect:', err);
        }
      });

      newConnection.onclose((error) => {
        console.log('❌ Connection closed:', error);
        setConnectionStatus('disconnected');

        // Attempt manual reconnection if not already reconnecting
        if (!isReconnecting && playerData) {
          attemptReconnection(playerData);
        }
      });

      newConnection.on('JoinedSuccessfully', (confirmedSessionId: string) => {
        console.log('✅ Joined successfully:', confirmedSessionId);
        setConfirmedSessionId(confirmedSessionId);
        setConnectionStatus('connected');

        // Only set to waiting if we don't have a restored state
        const savedState = localStorage.getItem('brainup_player_state');
        if (!savedState) {
          setSessionStatus('waiting');
        }

        if (isReconnect) {
          setModalConfig({
            isOpen: true,
            title: 'Reconectado',
            message: 'Reconexão bem-sucedida!',
            type: 'success',
          });
          setTimeout(() => setModalConfig(prev => ({ ...prev, isOpen: false })), 2000);
        }
      });

      newConnection.on('sessionstarted', () => {
        console.log('🎮 Session started - aguardando primeira pergunta');
        setSessionStatus('waiting');
      });

      newConnection.on('roundstarted', async (roundData: any) => {
        console.log('📝 Round started:', roundData);

        // Clear any saved state when a new round starts
        localStorage.removeItem('brainup_player_state');

        const rawQuestion = roundData.question || roundData.Question;
        const round = roundData.roundNumber || roundData.RoundNumber || 1;
        const roundId = rawQuestion?.roundId || roundData.roundId || roundData.RoundId || null;

        if (!rawQuestion) {
          console.error('❌ No question data in roundstarted event!');
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

        // Buscar informação completa da pergunta
        try {
          const questionRes = await fetch(`${apiBaseUrl}/api/Questions/${rawQuestion.id}`);
          if (questionRes.ok) {
            const optionsRes = await fetch(`${apiBaseUrl}/api/Questions/${rawQuestion.id}/options`);

            if (optionsRes.ok) {
              const options = await optionsRes.json();
              const enrichedOptions = normalizedOptions.map(opt => {
                const fullOpt = options.find((o: any) => o.id === opt.id);
                return {
                  ...opt,
                  isCorrect: fullOpt?.isCorrect,
                  correctOrder: fullOpt?.correctOrder
                };
              });

              const normalizedQuestion: Question = {
                ...rawQuestion,
                options: enrichedOptions,
                roundId,
              };

              setCurrentQuestion(normalizedQuestion);
              setRoundNumber(round);
              setCurrentRoundId(roundId);
              setTimeLeft(rawQuestion.timeLimit ?? 30);
              setHasAnswered(false);
              setSelectedAnswer(null);
              setAnswerResult(null);
              setPlayerLeaderboard(null);
              setTopLeaderboard([]);

              if (rawQuestion.type === 'Ordering' && enrichedOptions.length > 0) {
                setOrderingItems(enrichedOptions);
                setSelectedAnswer(enrichedOptions.map(option => option.id));
              } else {
                setOrderingItems([]);
              }

              setSessionStatus('question');
              return;
            }
          }
        } catch (err) {
          console.error('⚠️ Error fetching question details:', err);
        }

        // Fallback
        const normalizedQuestion: Question = {
          ...rawQuestion,
          options: normalizedOptions,
          roundId,
        };

        setCurrentQuestion(normalizedQuestion);
        setRoundNumber(round);
        setCurrentRoundId(roundId);
        setTimeLeft(rawQuestion.timeLimit ?? 30);
        setHasAnswered(false);
        setSelectedAnswer(null);
        setAnswerResult(null);

        if (rawQuestion.type === 'Ordering' && normalizedOptions.length > 0) {
          setOrderingItems(normalizedOptions);
          setSelectedAnswer(normalizedOptions.map(option => option.id));
        } else {
          setOrderingItems([]);
        }

        setSessionStatus('question');
      });

      newConnection.on('roundended', async () => {
        console.log('⏸️ Round ended - fetching final leaderboard');

        // Clear saved state when round ends
        localStorage.removeItem('brainup_player_state');

        // Aguardar 2 segundos para garantir que os dados foram processados no backend
        console.log('⏳ Waiting 2s before fetching final leaderboard...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Buscar leaderboard atualizado com retry logic
        await fetchRoundLeaderboard();

        setSessionStatus('round-results');
      });

      newConnection.on('sessionended', () => {
        console.log('🏁 Session ended');
        localStorage.removeItem('brainup_player_state');
        setSessionStatus('finished');
        setCurrentQuestion(null);
        setCurrentRoundId(null);

        // Show modal when session ends
        setModalConfig({
          isOpen: true,
          title: 'Sessão Terminada',
          message: 'O quiz terminou! Obrigado pela participação.',
          type: 'success',
        });
      });

      newConnection.on('HostDisconnected', () => {
        localStorage.removeItem('brainup_player_state');
        setModalConfig({
          isOpen: true,
          title: 'Sessão Encerrada',
          message: 'O anfitrião saiu da sessão e o quiz foi encerrado.',
          type: 'alert',
        });
        setSessionStatus('finished');
      });

      newConnection.on('JoinError', (message: string) => {
        console.error('❌ Join error:', message);

        // Check if error is about session being finished
        const isFinishedError = message && (
          message.toLowerCase().includes('terminada') ||
          message.toLowerCase().includes('finished') ||
          message.toLowerCase().includes('encerrada')
        );

        setModalConfig({
          isOpen: true,
          title: isFinishedError ? 'Sessão Terminada' : 'Erro ao Entrar',
          message: message || 'Código inválido ou sessão inexistente',
          type: isFinishedError ? 'alert' : 'error',
        });

        if (isFinishedError) {
          setSessionStatus('finished');
        }
      });

      await newConnection.start();
      console.log(isReconnect ? '🔄 Player reconnected to hub' : '🔌 Player connected to hub');

      const codeToUse = sessionCode || data.sessionId;
      console.log('🎮 Joining session with:', {
        code: codeToUse,
        playerName: data.playerName,
        playerId: data.playerId
      });

      await newConnection.invoke(
        'JoinPlayerByCode',
        codeToUse,
        data.playerName,
        data.playerId
      );

      setConnection(newConnection);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('❌ Player connection error:', error);

      if (!isReconnect) {
        setModalConfig({
          isOpen: true,
          title: 'Erro de Conexão',
          message: error instanceof Error ? error.message : 'Não foi possível conectar ao servidor',
          type: 'error',
        });
      }

      throw error;
    }
  };

  /* =====================================================
     FETCH LEADERBOARD
  ====================================================== */
  const fetchRoundLeaderboard = async (retryCount = 0, maxRetries = 3) => {
    const targetSessionId = playerData?.sessionId || confirmedSessionId || sessionCode;
    if (!targetSessionId || !playerData?.playerId) {
      console.log('⚠️ Missing data for leaderboard fetch:', { targetSessionId, playerId: playerData?.playerId });
      return;
    }

    try {
      console.log(`📊 [Attempt ${retryCount + 1}/${maxRetries + 1}] Fetching leaderboard for session:`, targetSessionId);

      const res = await fetch(`${apiBaseUrl}/api/GameSession/${targetSessionId}/leaderboard`);
      if (!res.ok) {
        console.error('❌ Leaderboard fetch failed:', res.status, res.statusText);
        
        // Retry if not the last attempt
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying in ${(retryCount + 1) * 500}ms...`);
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 500));
          return fetchRoundLeaderboard(retryCount + 1, maxRetries);
        }
        return;
      }

      const data = await res.json();
      console.log('📊 Raw leaderboard data:', data);

      const entries: LeaderboardEntry[] = Array.isArray(data)
        ? data.map((entry: any, index: number) => {
            const playerName = entry?.player ?? entry?.Player ?? entry?.playerName ?? entry?.PlayerName ?? 'Jogador';
            const score = Number(entry?.score ?? entry?.Score ?? entry?.totalScore ?? entry?.TotalScore ?? 0);

            console.log(`  Player ${index + 1}:`, { playerName, score, raw: entry });

            return {
              playerName,
              score,
              rank: index + 1
            };
          })
        : [];

      console.log('📊 Processed entries:', entries);

      // Verificar se temos dados válidos
      if (entries.length === 0) {
        console.warn('⚠️ Leaderboard está vazio');
        
        // Retry if not the last attempt
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying in ${(retryCount + 1) * 500}ms...`);
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 500));
          return fetchRoundLeaderboard(retryCount + 1, maxRetries);
        }
      }

      // Encontrar jogador atual (case-insensitive) em toda a lista
      const currentPlayerName = playerData.playerName.toLowerCase().trim();
      const currentPlayer = entries.find(e =>
        e.playerName.toLowerCase().trim() === currentPlayerName
      );

      console.log('👤 Current player:', {
        searchName: currentPlayerName,
        found: currentPlayer
      });

      // Se não encontrou o jogador, criar entrada com rank baseado no tamanho da lista
      if (!currentPlayer && playerData.playerName) {
        const fallbackPlayer: LeaderboardEntry = {
          playerName: playerData.playerName,
          score: 0,
          rank: entries.length + 1
        };
        setPlayerLeaderboard(fallbackPlayer);
        console.log('⚠️ Player not found in leaderboard, using fallback:', fallbackPlayer);
      } else {
        setPlayerLeaderboard(currentPlayer || null);
      }

      // Top 3 continua igual
      setTopLeaderboard(entries.slice(0, 3));
    } catch (err) {
      console.error('❌ Erro ao carregar leaderboard:', err);

      // Retry if not the last attempt
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying in ${(retryCount + 1) * 500}ms...`);
        await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 500));
        return fetchRoundLeaderboard(retryCount + 1, maxRetries);
      }

      // Fallback em caso de erro
      if (playerData.playerName) {
        const fallbackPlayer: LeaderboardEntry = {
          playerName: playerData.playerName,
          score: 0,
          rank: 1
        };
        setPlayerLeaderboard(fallbackPlayer);
      }
    }
  };

  /* =====================================================
     SUBMIT ANSWER
  ====================================================== */
  const submitAnswer = async () => {
    if (!selectedAnswer || hasAnswered || !connection) {
      console.log('⚠️ Cannot submit:', { selectedAnswer, hasAnswered, connection: !!connection });
      return;
    }

    setHasAnswered(true);

    // Clear saved state after submitting answer
    localStorage.removeItem('brainup_player_state');

    const targetSessionId = playerData?.sessionId || confirmedSessionId || sessionCode;

    if (!targetSessionId) {
      console.error('❌ No session ID available');
      return;
    }

    if (!currentRoundId) {
      console.error('❌ No round ID available');
      return;
    }

    if (!playerData?.playerId) {
      console.error('❌ No player ID available');
      return;
    }

    if (!currentQuestion) {
      console.error('❌ No current question');
      return;
    }

    const isOrderingAnswer = Array.isArray(selectedAnswer);
    const payload = {
      optionId: isOrderingAnswer ? null : selectedAnswer,
      orderedOptionIds: isOrderingAnswer ? selectedAnswer : null,
      timeRemaining: timeLeft,
      timeTotal: currentQuestion.timeLimit ?? 30,
      basePoints: currentQuestion.points ?? 0,
    };

    console.log('📤 Submitting answer:', {
      targetSessionId,
      currentRoundId,
      playerId: playerData.playerId,
      payload
    });

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/GameSession/${targetSessionId}/round/${currentRoundId}/answer-with-score/${playerData.playerId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      console.log('📥 Answer response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📥 Answer response data:', data);

        const earnedPoints = typeof data?.points === 'number' ? data.points : 0;
        setLastPoints(earnedPoints);

        // Determinar se acertou (guardar para mostrar nos resultados)
        let isCorrect = false;
        let correctAnswer: any = null;

        if (currentQuestion.type === 'Ordering') {
          const correctOrder = currentQuestion.options
            ?.filter(opt => opt.correctOrder !== undefined)
            .sort((a, b) => (a.correctOrder ?? 0) - (b.correctOrder ?? 0))
            .map(opt => opt.id);

          isCorrect = JSON.stringify(selectedAnswer) === JSON.stringify(correctOrder);
          correctAnswer = correctOrder;
        } else {
          const correctOpt = currentQuestion.options?.find(opt => opt.isCorrect === true);
          isCorrect = selectedAnswer === correctOpt?.id;
          correctAnswer = correctOpt?.id;
        }

        console.log('✅ Answer result:', { isCorrect, earnedPoints, correctAnswer });

        setAnswerResult({
          isCorrect,
          correctAnswer,
          earnedPoints
        });

        // Aguardar 1 segundo para dar tempo ao backend processar
        console.log('⏳ Waiting 1s before fetching leaderboard...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Buscar leaderboard atualizado com retry logic
        //await fetchRoundLeaderboard();

        // Mudar para estado de espera (não mostrar feedback ainda)
        setSessionStatus('waiting-next');
      } else {
        const errorText = await response.text();
        console.error('❌ Answer submission failed:', errorText);
      }
    } catch (error) {
      console.error('❌ Erro ao enviar resposta:', error);
    }

    try {
      await connection.invoke(
        'PlayerAnswered',
        targetSessionId,
        connection.connectionId
      );
      console.log('✅ PlayerAnswered signal sent');
    } catch (error) {
      console.error('❌ Error sending PlayerAnswered signal:', error);
    }
  };

  /* =====================================================
     MODAL HANDLERS
  ====================================================== */
  const handleModalConfirm = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));

    // If session is finished, clean up and redirect
    if (sessionStatus === 'finished') {
      localStorage.removeItem('brainup_player');
      localStorage.removeItem('brainup_player_state');
      localStorage.removeItem('brainup_player_id');
    }

    navigate('/join-session');
  };

  /* =====================================================
     RENDER QUESTION
  ====================================================== */
  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const options = currentQuestion.options ?? [];

    if (currentQuestion.type === 'MultipleChoice') {
      return (
        <div className="space-y-3 md:space-y-4">
          {options.map((option, i) => {
            const isSelected = selectedAnswer === option.id;

            return (
              <button
                key={option.id}
                disabled={hasAnswered}
                onClick={() => !hasAnswered && setSelectedAnswer(option.id)}
                className={`
                  group relative w-full p-5 md:p-6 rounded-2xl border-2 font-semibold text-base md:text-lg
                  transition-all duration-300 transform
                  ${isSelected
                    ? 'border-yellow-400 bg-gradient-to-r from-yellow-400/30 to-orange-400/30 shadow-xl shadow-yellow-400/30 scale-[1.02]'
                    : 'border-white/30 bg-gradient-to-br from-white/10 to-white/5 hover:border-white/50 hover:from-white/15 hover:to-white/10 hover:scale-[1.02] active:scale-95'
                  }
                  ${hasAnswered ? 'cursor-default opacity-75' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center gap-4">
                  <div className={`
                    flex-shrink-0 flex items-center justify-center
                    w-10 h-10 md:w-12 md:h-12 rounded-xl
                    text-base md:text-lg font-black
                    transition-all duration-300
                    ${isSelected
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg'
                      : 'bg-white/20 text-white/90 group-hover:bg-white/30'
                    }
                  `}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="text-left flex-1">{option.text}</span>
                  {isSelected && (
                    <div className="flex-shrink-0 text-yellow-400 text-2xl animate-bounce">
                      ✓
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    if (currentQuestion.type === 'TrueFalse') {
      const trueFalseOptions = options.length === 2
        ? options
        : [
          { id: 'true', text: 'Verdadeiro', isCorrect: false },
          { id: 'false', text: 'Falso', isCorrect: false }
        ];

      return (
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          {trueFalseOptions.map(option => {
            const isSelected = selectedAnswer === option.id;
            const optionText = option.text.trim().toLowerCase();
            const isTrue = optionText === 'verdadeiro' || optionText === 'true';

            return (
              <button
                key={option.id}
                disabled={hasAnswered}
                onClick={() => !hasAnswered && setSelectedAnswer(option.id)}
                className={`
                  group relative p-8 md:p-10 rounded-2xl border-2 font-bold text-lg md:text-xl
                  transition-all duration-300 transform
                  ${isSelected
                    ? isTrue
                      ? 'border-green-400 bg-gradient-to-br from-green-400/30 to-emerald-500/20 shadow-xl shadow-green-400/30 scale-105'
                      : 'border-red-400 bg-gradient-to-br from-red-400/30 to-rose-500/20 shadow-xl shadow-red-400/30 scale-105'
                    : 'border-white/30 bg-gradient-to-br from-white/10 to-white/5 hover:border-white/50 hover:from-white/15 hover:to-white/10 hover:scale-105 active:scale-95'
                  }
                  ${hasAnswered ? 'cursor-default opacity-75' : 'cursor-pointer'}
                `}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`
                    text-5xl md:text-6xl transition-all duration-300
                    ${isSelected ? 'scale-110 drop-shadow-lg' : 'group-hover:scale-110'}
                  `}>
                    {isTrue ? '✓' : '✗'}
                  </div>
                  <div className="text-sm md:text-base font-semibold">{option.text}</div>
                  {isSelected && (
                    <div className="absolute top-3 right-3 text-yellow-400 text-2xl animate-bounce">
                      ⭐
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    if (currentQuestion.type === 'Ordering') {
      return (
        <div className="space-y-4">
          <div className="rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 px-5 py-4 text-sm md:text-base backdrop-blur-sm">
            <p className="text-center text-white font-semibold flex items-center justify-center gap-2">
              <span className="text-2xl">🔀</span>
              Arrasta para ordenar (1 = primeiro, {orderingItems.length} = último)
            </p>
          </div>

          <div className="space-y-3">
            {orderingItems.map((item, index) => {
              return (
                <div
                  key={item.id}
                  data-order-index={index}
                  className={`
                    group relative flex items-center justify-between
                    rounded-xl border-2 px-5 py-4 md:px-6 md:py-5
                    text-white transition-all duration-300 touch-none
                    ${draggingIndex === index
                      ? 'opacity-60 border-yellow-400/50 bg-gradient-to-r from-yellow-400/30 to-orange-400/20 scale-95 rotate-2'
                      : hasAnswered
                      ? 'opacity-75 cursor-not-allowed border-white/20 bg-gradient-to-br from-white/5 to-white/2'
                      : 'border-white/30 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 hover:border-white/50 cursor-move hover:scale-[1.02] active:scale-95'
                    }
                  `}
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
                  onTouchStart={() => {
                    if (hasAnswered) return;
                    dragIndexRef.current = index;
                    setDraggingIndex(index);
                  }}
                  onTouchMove={(event) => {
                    if (hasAnswered) return;
                    const touch = event.touches[0];
                    const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
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
                  <div className="flex items-center gap-4">
                    <div className={`
                      flex items-center justify-center
                      w-10 h-10 md:w-12 md:h-12 rounded-xl
                      text-base md:text-lg font-black
                      transition-all duration-300
                      ${draggingIndex === index
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg'
                        : 'bg-white/20 text-white/90 group-hover:bg-white/30'
                      }
                    `}>
                      {index + 1}
                    </div>
                    <span className="text-sm md:text-base font-medium">{item.text}</span>
                  </div>
                  {!hasAnswered && (
                    <div className="flex-shrink-0 text-white/40 text-xl md:text-2xl group-hover:text-white/60 transition-colors">
                      ⋮⋮
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return null;
  };

  /* =====================================================
     RENDER
  ====================================================== */
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

      {/* Reconnection Banner */}
      {(isReconnecting || connectionStatus === 'reconnecting') && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            <span className="font-semibold">
              A reconectar... (Tentativa {reconnectAttempts}/{maxReconnectAttempts})
            </span>
          </div>
        </div>
      )}

      {/* Connection Lost Banner */}
      {connectionStatus === 'disconnected' && !isReconnecting && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">Conexão perdida</span>
            <button
              onClick={() => playerData && attemptReconnection(playerData)}
              className="ml-4 px-4 py-1 bg-white text-red-600 rounded-lg font-semibold hover:bg-red-50 transition"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )}

      <div className={`min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center text-white p-4 ${isReconnecting ? 'pt-20' : ''}`}>

        {sessionStatus === 'waiting' && (
          <div className="text-center animate-fadeIn">
            <div className="text-5xl md:text-7xl mb-6 animate-pulse drop-shadow-2xl">🧠</div>
            <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-6 md:p-8 shadow-2xl max-w-lg mx-auto">
              <h1 className="text-2xl md:text-3xl font-black mb-3 bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                A aguardar início...
              </h1>
              <p className="text-gray-300 text-sm md:text-base">O anfitrião vai começar em breve</p>
            </div>
          </div>
        )}

        {sessionStatus === 'waiting-next' && (
          <div className="text-center animate-fadeIn">
            <div className="text-5xl md:text-7xl mb-6 animate-bounce drop-shadow-2xl">⏳</div>
            <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-6 md:p-8 shadow-2xl max-w-lg mx-auto">
              <h1 className="text-2xl md:text-3xl font-black mb-3 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                Resposta enviada!
              </h1>
              <p className="text-gray-300 text-sm md:text-base">A aguardar outros jogadores...</p>
            </div>
          </div>
        )}

        {sessionStatus === 'finished' && (
          <div className="text-center animate-fadeIn">
            <div className="text-5xl md:text-7xl mb-6 drop-shadow-2xl">🎉</div>
            <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-6 md:p-8 shadow-2xl max-w-lg mx-auto">
              <h1 className="text-2xl md:text-4xl font-black mb-3 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
                Quiz Terminado!
              </h1>
              <p className="text-gray-300 text-sm md:text-base mb-6">Obrigado por jogares</p>

              <button
                onClick={() => {
                  localStorage.removeItem('brainup_player');
                  localStorage.removeItem('brainup_player_state');
                  localStorage.removeItem('brainup_player_id');
                  navigate('/join-session');
                }}
                className="
                  rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 
                  px-6 py-2.5 text-base font-bold text-white 
                  shadow-lg hover:scale-105 active:scale-95 
                  transition-all duration-300
                "
              >
                Jogar Novamente
              </button>
            </div>
          </div>
        )}

        {sessionStatus === 'question' && currentQuestion && (
          <div className="max-w-4xl w-full animate-fadeIn">
            {/* Header Card */}
            <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-2xl p-3 md:p-5 mb-3 md:mb-4 border border-white/20 shadow-2xl">
              <div className="flex justify-between items-center mb-2 md:mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg px-3 py-1.5 shadow-lg">
                    <span className="text-xs md:text-sm font-bold text-white">
                      Pergunta {roundNumber}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`
                    text-3xl md:text-4xl font-black transition-all duration-300
                    ${timeLeft <= 5
                      ? 'text-red-400 animate-pulse scale-110 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]'
                      : 'text-yellow-400 drop-shadow-lg'
                    }
                  `}>
                    {timeLeft}s
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative w-full bg-black/20 rounded-full h-2 md:h-2.5 overflow-hidden shadow-inner">
                <div
                  className={`
                    absolute top-0 left-0 h-full rounded-full
                    transition-all duration-1000 ease-linear
                    ${timeLeft <= 5
                      ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                      : 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                    }
                  `}
                  style={{
                    width: `${(timeLeft / (currentQuestion.timeLimit || 30)) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-2xl p-4 md:p-6 mb-3 md:mb-4 border border-white/20 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-xl">
                  <span className="text-xl md:text-2xl">❓</span>
                </div>
                <h2 className="text-base md:text-xl lg:text-2xl font-bold leading-snug flex-1">
                  {currentQuestion?.title}
                </h2>
              </div>
            </div>

            {/* Options */}
            {renderQuestion()}

            {/* Submit Button */}
            {selectedAnswer && !hasAnswered && (
              <button
                onClick={submitAnswer}
                className="
                  mt-4 w-full
                  bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500
                  p-3.5 md:p-4 rounded-xl
                  font-black text-base md:text-lg text-white
                  shadow-2xl shadow-yellow-500/50
                  hover:shadow-yellow-500/70 hover:scale-[1.02]
                  active:scale-95
                  transition-all duration-300
                  border-2 border-yellow-300/50
                  animate-pulse
                "
              >
                <span className="flex items-center justify-center gap-2">
                  <span>Confirmar Resposta</span>
                  <span className="text-2xl">✓</span>
                </span>
              </button>
            )}
            {/* Answer Submitted */}
            {hasAnswered && (
              <div className="mt-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-400/50 rounded-xl p-3.5 backdrop-blur-sm shadow-xl">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl animate-bounce">✓</span>
                  <span className="text-green-300 text-sm md:text-base font-bold">
                    Resposta enviada com sucesso!
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Round Results */}
        {sessionStatus === 'round-results' && (
          <div className="max-w-3xl w-full animate-fadeIn overflow-y-auto max-h-screen py-4">
            <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-white/20 shadow-2xl">
              <div className="text-center mb-4 md:mb-6">
                <div className="text-4xl md:text-5xl mb-3 drop-shadow-2xl animate-bounce">🏆</div>
                <h2 className="text-xl md:text-2xl font-black mb-2 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
                  Resultados da Ronda
                </h2>
              </div>

              {/* Answer Result */}
              {answerResult && (
                <div className={`
                  mb-4 rounded-2xl p-4 md:p-5 border-2 shadow-2xl backdrop-blur-sm
                  ${answerResult.isCorrect
                    ? 'bg-gradient-to-br from-green-500/30 to-emerald-600/20 border-green-400/50'
                    : 'bg-gradient-to-br from-red-500/30 to-rose-600/20 border-red-400/50'
                  }
                `}>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-4xl md:text-5xl drop-shadow-2xl">
                        {answerResult.isCorrect ? '✓' : '✗'}
                      </span>
                      <div className="text-center">
                        <div className={`
                          text-xl md:text-2xl font-black mb-1
                          ${answerResult.isCorrect ? 'text-green-200' : 'text-red-200'}
                        `}>
                          {answerResult.isCorrect ? 'Correto!' : 'Incorreto'}
                        </div>
                      </div>
                    </div>

                    {/* Points Summary */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t-2 border-white/20">
                      <div className="text-center bg-black/20 rounded-xl p-3 backdrop-blur-sm">
                        <div className="text-xs md:text-sm text-white/70 mb-1 font-semibold">
                          Pontos desta ronda
                        </div>
                        <div className={`
                          text-2xl md:text-3xl font-black drop-shadow-lg
                          ${answerResult.isCorrect ? 'text-green-300' : 'text-red-300'}
                        `}>
                          +{answerResult.earnedPoints}
                        </div>
                      </div>
                      <div className="text-center bg-black/20 rounded-xl p-3 backdrop-blur-sm">
                        <div className="text-xs md:text-sm text-white/70 mb-1 font-semibold">
                          Pontos totais
                        </div>
                        <div className="text-2xl md:text-3xl font-black text-yellow-300 drop-shadow-lg">
                          {playerLeaderboard?.score || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Player Position */}
              {playerLeaderboard && (
                <div className={`
                  mb-4 rounded-2xl p-4 md:p-5 border-2 shadow-2xl backdrop-blur-sm
                  ${playerLeaderboard.rank === 1
                    ? 'bg-gradient-to-br from-yellow-400/40 to-yellow-600/20 border-yellow-400/60'
                    : playerLeaderboard.rank === 2
                    ? 'bg-gradient-to-br from-gray-300/40 to-gray-400/20 border-gray-300/60'
                    : playerLeaderboard.rank === 3
                    ? 'bg-gradient-to-br from-amber-600/40 to-amber-700/20 border-amber-600/60'
                    : 'bg-gradient-to-br from-white/15 to-white/5 border-white/30'
                  }
                `}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`
                        text-3xl md:text-4xl font-black drop-shadow-2xl
                        ${playerLeaderboard.rank <= 3 ? 'text-white' : 'text-white/70'}
                      `}>
                        #{playerLeaderboard.rank}
                      </div>
                      <div>
                        <div className="text-xs md:text-sm font-semibold text-white/80 mb-0.5">
                          A tua posição
                        </div>
                        <div className="text-base md:text-xl font-black text-white drop-shadow-lg">
                          {playerData.playerName}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl md:text-3xl font-black text-yellow-300 drop-shadow-lg">
                        {playerLeaderboard.score}
                      </div>
                      <div className="text-xs text-white/60 font-semibold">pontos</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Top 3 */}
              {topLeaderboard.length > 0 && (
              <div className="mb-4">
                <h3 className="text-base md:text-lg font-black mb-3 text-center text-white/90 flex items-center justify-center gap-2">
                  <span className="text-2xl">🥇</span>
                  <span>Top 3</span>
                </h3>

                <div className="space-y-2">
                  {topLeaderboard.map((entry, index) => (
                    <div
                      key={index}
                      className={`
                        flex items-center justify-between rounded-xl p-3 backdrop-blur-sm
                        ${index === 0
                          ? 'bg-gradient-to-r from-yellow-400/30 to-yellow-600/20 border-2 border-yellow-400/60'
                          : index === 1
                          ? 'bg-gradient-to-r from-gray-300/30 to-gray-400/20 border-2 border-gray-300/60'
                          : 'bg-gradient-to-r from-amber-600/30 to-amber-700/20 border-2 border-amber-600/60'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <span className="text-2xl md:text-3xl drop-shadow-lg">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                        <span className="font-bold text-sm md:text-base">
                          {entry.playerName}
                        </span>
                      </div>

                      <span className="text-lg md:text-xl font-black">
                        {entry.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center text-white/60 text-xs md:text-sm animate-pulse font-semibold">
              ⏳ A aguardar próxima pergunta...
            </div>

            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </>
  );
};

export default PlayerSessionPage;
