import type { FC } from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthGuard } from "../hooks/useAuthGuard";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';

interface Folder {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  quizCount: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  authorId: string;
  createdAt: string;
  questionsCount: number;
}

interface GameSession {
  id: string;
  quizId: string;
  hostId: string;
  isActive: boolean;
  startedAt: string;
  endedAt: string | null;
}

interface SessionStats {
  sessionId: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  totalPlayers: number;
  totalRounds: number;
  averageAccuracy: number;
  players: PlayerStats[];
  rounds: RoundStats[];
}

interface PlayerStats {
  playerId: string;
  playerName: string;
  totalScore: number;
  totalAnswers: number;
  correctAnswers: number;
  accuracy: number;
  averageResponseTimeSeconds: number;
  rank: number;
}

interface RoundStats {
  roundId: string;
  roundNumber: number;
  totalAnswers: number;
  correctAnswers: number;
  accuracy: number;
  averageResponseTimeSeconds: number;
}

const DashboardPage: FC = () => {
  const navigate = useNavigate();
  useAuthGuard();
  const [activeSection, setActiveSection] = useState<"projects" | "sessions">(
    "projects"
  );
  const [activeProjectTab, setActiveProjectTab] = useState<
    "import" | "library" | "create"
  >("import");
  
  // Session tabs
  const [activeSessionTab, setActiveSessionTab] = useState<"create" | "history">("create");
  
  const [activeFolder, setActiveFolder] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState<string>("");
  const [editingFolderName, setEditingFolderName] = useState("");
  const [deletingFolderId, setDeleteingFolderId] = useState<string>("");
  const [deletingFolderName, setDeletingFolderName] = useState("");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [showDeleteQuizModal, setShowDeleteQuizModal] = useState(false);
  const [deletingQuizId, setDeletingQuizId] = useState<string>("");
  const [deletingQuizName, setDeletingQuizName] = useState("");
  const [showEditQuizModal, setShowEditQuizModal] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string>("");
  const [editingQuizTitle, setEditingQuizTitle] = useState("");
  const [editingQuizDescription, setEditingQuizDescription] = useState("");
  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [newQuizDescription, setNewQuizDescription] = useState("");
  const [createQuizError, setCreateQuizError] = useState<string | null>(null);
  const [createQuizSubmitting, setCreateQuizSubmitting] = useState(false);

  const [sessionFolder, setSessionFolder] = useState<string>("");
  const [sessionQuiz, setSessionQuiz] = useState<string>("");
  const [sessionQuizzes, setSessionQuizzes] = useState<Quiz[]>([]);
  const [sessionQuizzesLoading, setSessionQuizzesLoading] = useState(false);
  const [sessionTimeLimit, setSessionTimeLimit] = useState<number>(30);

  const [draggedQuizId, setDraggedQuizId] = useState<string | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);
  const [openMenuQuizId, setOpenMenuQuizId] = useState<string | null>(null);

  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5027";

  const authFetch = (url: string, options: RequestInit = {}) => {
    const token = sessionStorage.getItem("brainup_token");

    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  };

  const [uploadStatus, setUploadStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'loading' | null;
  }>({ message: '', type: null });

  // Session history states
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    if (activeFolder && activeProjectTab === "library") {
      fetchQuizzes();
    }
  }, [activeFolder, activeProjectTab]);

  useEffect(() => {
    if (sessionFolder) {
      fetchSessionQuizzes();
    } else {
      setSessionQuizzes([]);
      setSessionQuiz("");
    }
  }, [sessionFolder]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuQuizId && !(event.target as Element).closest('.quiz-menu')) {
        setOpenMenuQuizId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuQuizId]);

  useEffect(() => {
    if (activeSection === "sessions" && activeSessionTab === "history") {
      fetchSessions();
    }
  }, [activeSection, activeSessionTab]);

  const fetchFolders = async () => {
    setFoldersLoading(true);
    try {
      const res = await authFetch(`${apiBaseUrl}/api/Folders`);
      if (!res.ok) throw new Error("Erro ao carregar pastas");
      const data: Folder[] = await res.json();
      setFolders(data);
      if (data.length > 0 && !activeFolder) {
        setActiveFolder(data[0].id);
      }
    } catch (err) {
      console.error("Erro ao carregar pastas:", err);
    } finally {
      setFoldersLoading(false);
    }
  };

  const fetchQuizzes = async () => {
    if (!activeFolder) return;
    
    setQuizzesLoading(true);
    try {
      const res = await authFetch(`${apiBaseUrl}/api/Folders/${activeFolder}/quizzes`);
      if (!res.ok) throw new Error("Erro ao carregar quizzes");
      const data: Quiz[] = await res.json();
      setQuizzes(data);
    } catch (err) {
      console.error("Erro ao carregar quizzes:", err);
      setQuizzes([]);
    } finally {
      setQuizzesLoading(false);
    }
  };

  const fetchSessionQuizzes = async () => {
    if (!sessionFolder) return;
    
    setSessionQuizzesLoading(true);
    try {
      const res = await authFetch(`${apiBaseUrl}/api/Folders/${sessionFolder}/quizzes`);
      if (!res.ok) throw new Error("Erro ao carregar quizzes");
      const data: Quiz[] = await res.json();
      setSessionQuizzes(data);
    } catch (err) {
      console.error("Erro ao carregar quizzes:", err);
      setSessionQuizzes([]);
    } finally {
      setSessionQuizzesLoading(false);
    }
  };

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await authFetch(`${apiBaseUrl}/api/GameSession/minesessions`);
      if (!res.ok) throw new Error("Erro ao carregar sessões");
      const data: GameSession[] = await res.json();
      setSessions(data);
    } catch (err) {
      console.error("Erro ao carregar sessões:", err);
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchSessionStats = async (sessionId: string) => {
    setStatsLoading(true);
    try {
      const res = await authFetch(`${apiBaseUrl}/api/GameSession/${sessionId}/stats`);
      if (!res.ok) throw new Error("Erro ao carregar estatísticas");
      const data: SessionStats = await res.json();
      setSessionStats(data);
      setShowStatsModal(true);
    } catch (err) {
      console.error("Erro ao carregar estatísticas:", err);
      alert("Erro ao carregar estatísticas. Tenta novamente.");
    } finally {
      setStatsLoading(false);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const res = await authFetch(`${apiBaseUrl}/api/Folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName }),
      });

      if (!res.ok) throw new Error("Erro ao criar pasta");
      
      setShowCreateModal(false);
      setNewFolderName("");
      fetchFolders();
    } catch (err) {
      console.error("Erro ao criar pasta:", err);
      alert("Erro ao criar pasta. Tenta novamente.");
    }
  };

  const updateFolder = async () => {
    if (!editingFolderName.trim()) return;

    try {
      const res = await authFetch(`${apiBaseUrl}/api/Folders/${editingFolderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingFolderName }),
      });

      if (!res.ok) throw new Error("Erro ao editar pasta");
      
      setShowEditModal(false);
      setEditingFolderId("");
      setEditingFolderName("");
      fetchFolders();
    } catch (err) {
      console.error("Erro ao editar pasta:", err);
      alert("Erro ao editar pasta. Tenta novamente.");
    }
  };

  const deleteFolder = async () => {
    try {
      const res = await authFetch(`${apiBaseUrl}/api/Folders/${deletingFolderId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Erro ao eliminar pasta");
      
      if (activeFolder === deletingFolderId) {
        setActiveFolder("");
      }
      setShowDeleteModal(false);
      setDeleteingFolderId("");
      setDeletingFolderName("");
      fetchFolders();
    } catch (err) {
      console.error("Erro ao eliminar pasta:", err);
      alert("Erro ao eliminar pasta. Tenta novamente.");
    }
  };

  const deleteQuiz = async () => {
    try {
      const res = await authFetch(`${apiBaseUrl}/api/Quizzes/${deletingQuizId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Erro ao eliminar quiz");
      
      setShowDeleteQuizModal(false);
      setDeletingQuizId("");
      setDeletingQuizName("");
      fetchQuizzes();
      fetchFolders();
    } catch (err) {
      console.error("Erro ao eliminar quiz:", err);
      alert("Erro ao eliminar quiz. Tenta novamente.");
    }
  };

  const updateQuiz = async () => {
    if (!editingQuizTitle.trim()) return;

    try {
      const res = await authFetch(`${apiBaseUrl}/api/Quizzes/${editingQuizId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: editingQuizTitle,
          description: editingQuizDescription 
        }),
      });

      if (!res.ok) throw new Error("Erro ao editar quiz");
      
      setShowEditQuizModal(false);
      setEditingQuizId("");
      setEditingQuizTitle("");
      setEditingQuizDescription("");
      
      // Show success message if it was from an import
      if (uploadStatus.type === 'loading' || uploadStatus.message === '') {
        setUploadStatus({ message: 'Quiz importado e configurado com sucesso!', type: 'success' });
        setTimeout(() => setUploadStatus({ message: '', type: null }), 3000);
      }
      
      fetchQuizzes();
    } catch (err) {
      console.error("Erro ao editar quiz:", err);
      alert("Erro ao editar quiz. Tenta novamente.");
    }
  };

  const createQuiz = async () => {
    if (!activeFolder) {
      setCreateQuizError("Seleciona uma pasta primeiro.");
      return;
    }
    if (!newQuizTitle.trim()) {
      setCreateQuizError("Escreve o nome do quiz.");
      return;
    }

    setCreateQuizError(null);
    setCreateQuizSubmitting(true);

    try {
      const res = await authFetch(`${apiBaseUrl}/api/Quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newQuizTitle.trim(),
          description: newQuizDescription.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("Erro ao criar quiz");

      const data = await res.json();
      const quizId = data?.id;
      if (!quizId) throw new Error("Quiz ID em falta");

      const folderRes = await authFetch(
        `${apiBaseUrl}/api/Quizzes/${quizId}/folder?folderId=${activeFolder}`,
        { method: "PUT" }
      );
      if (!folderRes.ok) throw new Error("Erro ao associar pasta");

      const quizTitle = newQuizTitle.trim();
      const quizDescription = newQuizDescription.trim();
      setNewQuizTitle("");
      setNewQuizDescription("");
      navigate(`/quiz-editor/${quizId}`, {
        state: { title: quizTitle, description: quizDescription },
      });
    } catch (err) {
      console.error("Erro ao criar quiz:", err);
      setCreateQuizError("Erro ao criar quiz. Tenta novamente.");
    } finally {
      setCreateQuizSubmitting(false);
    }
  };

  const duplicateQuiz = async (quizId: string) => {
    try {
      setUploadStatus({ message: 'A duplicar quiz...', type: 'loading' });
      
      const res = await authFetch(`${apiBaseUrl}/api/Quizzes/${quizId}/duplicate`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Erro ao duplicar quiz");
      
      setUploadStatus({ message: 'Quiz duplicado com sucesso!', type: 'success' });
      setTimeout(() => setUploadStatus({ message: '', type: null }), 3000);
      
      // Refresh folders and quizzes
      fetchFolders();
      fetchQuizzes();
    } catch (err) {
      console.error("Erro ao duplicar quiz:", err);
      setUploadStatus({ message: 'Erro ao duplicar quiz. Tenta novamente.', type: 'error' });
      setTimeout(() => setUploadStatus({ message: '', type: null }), 3000);
    }
  };

  const moveQuizToFolder = async (quizId: string, folderId: string) => {
    try {
      const res = await authFetch(`${apiBaseUrl}/api/Quizzes/${quizId}/folder?folderId=${folderId}`, {
        method: "PUT",
      });

      if (!res.ok) throw new Error("Erro ao mover quiz");
      
      // Refresh folders and quizzes
      fetchFolders();
      fetchQuizzes();
      
      // Show success message
      setUploadStatus({ message: 'Quiz movido com sucesso!', type: 'success' });
      setTimeout(() => setUploadStatus({ message: '', type: null }), 3000);
    } catch (err) {
      console.error("Erro ao mover quiz:", err);
      setUploadStatus({ message: 'Erro ao mover quiz. Tenta novamente.', type: 'error' });
      setTimeout(() => setUploadStatus({ message: '', type: null }), 3000);
    }
  };

  const handleQuizDragStart = (quizId: string) => {
    setDraggedQuizId(quizId);
  };

  const handleQuizDragEnd = () => {
    setDraggedQuizId(null);
    setDropTargetFolderId(null);
  };

  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    if (draggedQuizId && folderId !== activeFolder) {
      setDropTargetFolderId(folderId);
    }
  };

  const handleFolderDragLeave = () => {
    setDropTargetFolderId(null);
  };

  const handleFolderDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDropTargetFolderId(null);
    
    if (draggedQuizId && folderId !== activeFolder) {
      moveQuizToFolder(draggedQuizId, folderId);
    }
    
    setDraggedQuizId(null);
  };

  const openEditModal = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
    setShowEditModal(true);
  };

  const openDeleteModal = (folder: Folder) => {
    setDeleteingFolderId(folder.id);
    setDeletingFolderName(folder.name);
    setShowDeleteModal(true);
  };

  const openDeleteQuizModal = (quiz: Quiz) => {
    setDeletingQuizId(quiz.id);
    setDeletingQuizName(quiz.title);
    setShowDeleteQuizModal(true);
  };

  const openEditQuizModal = (quiz: Quiz) => {
    setEditingQuizId(quiz.id);
    setEditingQuizTitle(quiz.title);
    setEditingQuizDescription(quiz.description || "");
    setShowEditQuizModal(true);
  };

  const openVerQuizModal = (quiz: Quiz) => {
    navigate(`/ver-quiz?quizId=${quiz.id}`);
  }

  const handleLogout = () => {
    sessionStorage.removeItem("brainup_token");
    navigate("/");
  };

  const uploadFile = (file: File) => {
    if (!activeFolder) {
      setUploadStatus({ message: 'Seleciona uma pasta primeiro!', type: 'error' });
      setTimeout(() => setUploadStatus({ message: '', type: null }), 3000);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploadStatus({ message: 'A carregar ficheiro...', type: 'loading' });

    authFetch(`${apiBaseUrl}/api/Import/questions?folderId=${activeFolder}`, {
      method: "POST",
      body: formData,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erro no upload");
        return res.json();
      })
      .then((data) => {
        console.log("Upload feito com sucesso:", data);
        
        // Don't show success message yet, wait for edit modal to close
        setUploadStatus({ message: '', type: null });
        
        // Refresh folders and quizzes
        fetchFolders();
        fetchQuizzes().then(() => {
          // Find the newly created quiz (it should be the most recent one)
          if (data.quizId) {
            // If API returns the quiz ID
            const newQuiz = quizzes.find(q => q.id === data.quizId);
            if (newQuiz) {
              openEditQuizModal(newQuiz);
            }
          } else {
            // Otherwise, fetch quizzes and open modal for the newest one
            authFetch(`${apiBaseUrl}/api/Folders/${activeFolder}/quizzes`)
              .then(res => res.json())
              .then((updatedQuizzes: Quiz[]) => {
                if (updatedQuizzes.length > 0) {
                  // Get the most recent quiz
                  const newestQuiz = updatedQuizzes.sort((a, b) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  )[0];
                  openEditQuizModal(newestQuiz);
                }
              });
          }
        });
      })
      .catch((err) => {
        console.error("Falha no upload:", err);
        setUploadStatus({ message: 'Erro ao carregar ficheiro. Tenta novamente.', type: 'error' });
        setTimeout(() => setUploadStatus({ message: '', type: null }), 3000);
      });
  };

  const handleFileSelect = () => {
    if (!activeFolder) {
      setUploadStatus({ message: 'Seleciona uma pasta primeiro!', type: 'error' });
      setTimeout(() => setUploadStatus({ message: '', type: null }), 3000);
      return;
    }
    document.getElementById('file-input')?.click();
  };

  const selectedFolderName = folders.find(f => f.id === activeFolder)?.name || "Nenhuma pasta selecionada";

  const createGameSession = async () => {
    if (!sessionQuiz) {
      alert("Seleciona um quiz primeiro");
      return;
    }

    if (!sessionTimeLimit || sessionTimeLimit <= 0) {
      alert("Define um tempo válido por pergunta (mínimo 1 segundo)");
      return;
    }

    try {
      const res = await authFetch(`${apiBaseUrl}/api/GameSession`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          quizId: sessionQuiz,
          timeLimit: sessionTimeLimit 
        }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Erro ao criar sessao.");
      }

      const session = await res.json();
      const sessionId = session?.id;

      if (!sessionId) {
        throw new Error("Sessao invalida.");
      }

      navigate(`/waiting-session/${sessionId}?quizId=${sessionQuiz}&timeLimit=${sessionTimeLimit}`);
    } catch (err) {
      console.error("Erro ao criar sessão:", err);
      alert("Erro ao criar sessão. Tenta novamente.");
    }
  };

  const exportToCSV = () => {
    if (!sessionStats) return;

    // CSV Header
    let csv = "Estatísticas da Sessão\n\n";
    
    // Session Info
    csv += "Informação Geral\n";
    csv += `ID da Sessão,${sessionStats.sessionId}\n`;
    csv += `Início,${new Date(sessionStats.startedAt).toLocaleString('pt-PT')}\n`;
    csv += `Fim,${sessionStats.endedAt ? new Date(sessionStats.endedAt).toLocaleString('pt-PT') : 'Em curso'}\n`;
    csv += `Duração,${Math.round(sessionStats.durationSeconds / 60)} minutos\n`;
    csv += `Total de Jogadores,${sessionStats.totalPlayers}\n`;
    csv += `Total de Rondas,${sessionStats.totalRounds}\n`;
    csv += `Precisão Média,${sessionStats.averageAccuracy.toFixed(2)}%\n\n`;

    // Players Table
    csv += "Jogadores\n";
    csv += "Rank,Nome,Pontuação,Respostas,Corretas,Precisão (%),Tempo Médio (s)\n";
    sessionStats.players.forEach(player => {
      csv += `${player.rank},${player.playerName},${player.totalScore},${player.totalAnswers},${player.correctAnswers},${player.accuracy.toFixed(2)},${player.averageResponseTimeSeconds.toFixed(2)}\n`;
    });

    csv += "\nRondas\n";
    csv += "Ronda,Respostas,Corretas,Precisão (%),Tempo Médio (s)\n";
    sessionStats.rounds.forEach(round => {
      csv += `${round.roundNumber},${round.totalAnswers},${round.correctAnswers},${round.accuracy.toFixed(2)},${round.averageResponseTimeSeconds.toFixed(2)}\n`;
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `session_${sessionStats.sessionId}_stats.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 text-white">
      {/* Stats Modal */}
      {showStatsModal && sessionStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-7xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/20 bg-gradient-to-br from-purple-600 to-indigo-600 shadow-2xl">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-gradient-to-br from-purple-600 to-indigo-600 border-b border-white/20 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">Estatísticas da Sessão</h3>
                  <p className="text-sm text-white/70 mt-1">
                    {new Date(sessionStats.startedAt).toLocaleDateString('pt-PT')} às{' '}
                    {new Date(sessionStats.startedAt).toLocaleTimeString('pt-PT')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowStatsModal(false);
                    setSessionStats(null);
                  }}
                  className="rounded-xl bg-white/20 p-2 transition hover:bg-white/30"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* General Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur-sm">
                  <div className="text-3xl font-black">{sessionStats.totalPlayers}</div>
                  <div className="text-sm text-white/70">Jogadores</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur-sm">
                  <div className="text-3xl font-black">{sessionStats.totalRounds}</div>
                  <div className="text-sm text-white/70">Rondas</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur-sm">
                  <div className="text-3xl font-black">{sessionStats.averageAccuracy.toFixed(1)}%</div>
                  <div className="text-sm text-white/70">Precisão Média</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur-sm">
                  <div className="text-3xl font-black">{formatDuration(sessionStats.durationSeconds)}</div>
                  <div className="text-sm text-white/70">Duração</div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Performance by Round */}
                <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-sm">
                  <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Performance por Ronda
                  </h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={sessionStats.rounds.map(r => ({
                      name: `R${r.roundNumber}`,
                      precisão: parseFloat(r.accuracy.toFixed(1)),
                      tempo: parseFloat(r.averageResponseTimeSeconds.toFixed(1))
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                      <XAxis dataKey="name" stroke="#ffffff80" />
                      <YAxis yAxisId="left" stroke="#10b981" />
                      <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e1b4b', 
                          border: '1px solid #ffffff20',
                          borderRadius: '8px'
                        }} 
                      />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="precisão" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Precisão (%)"
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="tempo" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        name="Tempo Médio (s)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Player Distribution */}
                <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-sm">
                  <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                    Distribuição de Respostas Corretas
                  </h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={sessionStats.players.map((p) => ({
                          name: p.playerName,
                          value: p.correctAnswers
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {sessionStats.players.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e1b4b', 
                          border: '1px solid #ffffff20',
                          borderRadius: '8px'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Top Players Chart */}
                <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-sm">
                  <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    Pontuações dos Jogadores
                  </h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart 
                      data={sessionStats.players.slice(0, 5).map(p => ({
                        name: p.playerName.length > 10 ? p.playerName.substring(0, 10) + '...' : p.playerName,
                        pontos: p.totalScore
                      }))}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#ffffff80"
                        tick={{ fill: '#ffffff80', fontSize: 12 }}
                      />
                      <YAxis 
                        stroke="#ffffff80"
                        tick={{ fill: '#ffffff80', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e1b4b', 
                          border: '1px solid #ffffff20',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }} 
                      />
                      <Bar 
                        dataKey="pontos" 
                        fill="#fbbf24" 
                        name="Pontuação"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Accuracy Comparison */}
                <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-sm">
                  <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Precisão por Jogador
                  </h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart 
                      data={sessionStats.players.map(p => ({
                        name: p.playerName.length > 10 ? p.playerName.substring(0, 10) + '...' : p.playerName,
                        precisão: parseFloat(p.accuracy.toFixed(1))
                      }))}
                      layout="vertical"
                      margin={{ left: 20, right: 20, top: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" horizontal={false} />
                      <XAxis 
                        type="number" 
                        domain={[0, 100]} 
                        stroke="#ffffff80"
                        tick={{ fill: '#ffffff80', fontSize: 12 }}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        stroke="#ffffff80"
                        width={80}
                        tick={{ fill: '#ffffff80', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e1b4b', 
                          border: '1px solid #ffffff20',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number | undefined) => [`${value ?? 0}%`, 'Precisão']}
                      />
                      <Bar 
                        dataKey="precisão" 
                        fill="#ef4444" 
                        name="Precisão (%)"
                        radius={[0, 8, 8, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Players Table */}
              <div className="mb-6">
                <h4 className="text-lg font-bold mb-3">Jogadores</h4>
                <div className="rounded-2xl bg-white/5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white/10">
                        <tr>
                          <th className="px-4 py-3 text-left">Rank</th>
                          <th className="px-4 py-3 text-left">Nome</th>
                          <th className="px-4 py-3 text-right">Pontuação</th>
                          <th className="px-4 py-3 text-right">Respostas</th>
                          <th className="px-4 py-3 text-right">Corretas</th>
                          <th className="px-4 py-3 text-right">Precisão</th>
                          <th className="px-4 py-3 text-right">Tempo Médio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionStats.players.map((player, index) => (
                          <tr key={player.playerId} className={index % 2 === 0 ? 'bg-white/5' : ''}>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                                player.rank === 1 ? 'bg-yellow-500 text-white' :
                                player.rank === 2 ? 'bg-gray-400 text-white' :
                                player.rank === 3 ? 'bg-amber-600 text-white' :
                                'bg-white/20'
                              }`}>
                                {player.rank}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold">{player.playerName}</td>
                            <td className="px-4 py-3 text-right font-bold">{player.totalScore}</td>
                            <td className="px-4 py-3 text-right">{player.totalAnswers}</td>
                            <td className="px-4 py-3 text-right text-green-300">{player.correctAnswers}</td>
                            <td className="px-4 py-3 text-right">{player.accuracy.toFixed(1)}%</td>
                            <td className="px-4 py-3 text-right">{player.averageResponseTimeSeconds.toFixed(2)}s</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Rounds Table */}
              <div className="mb-6">
                <h4 className="text-lg font-bold mb-3">Rondas</h4>
                <div className="rounded-2xl bg-white/5 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white/10">
                        <tr>
                          <th className="px-4 py-3 text-left">Ronda</th>
                          <th className="px-4 py-3 text-right">Respostas</th>
                          <th className="px-4 py-3 text-right">Corretas</th>
                          <th className="px-4 py-3 text-right">Precisão</th>
                          <th className="px-4 py-3 text-right">Tempo Médio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionStats.rounds.map((round, index) => (
                          <tr key={round.roundId} className={index % 2 === 0 ? 'bg-white/5' : ''}>
                            <td className="px-4 py-3 font-semibold">Ronda {round.roundNumber}</td>
                            <td className="px-4 py-3 text-right">{round.totalAnswers}</td>
                            <td className="px-4 py-3 text-right text-green-300">{round.correctAnswers}</td>
                            <td className="px-4 py-3 text-right">{round.accuracy.toFixed(1)}%</td>
                            <td className="px-4 py-3 text-right">{round.averageResponseTimeSeconds.toFixed(2)}s</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Actions - Sticky Footer */}
              <div className="sticky bottom-0 bg-gradient-to-br from-purple-600 to-indigo-600 border-t border-white/20 pt-4 -mx-6 px-6 -mb-6 pb-6 rounded-b-3xl">
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={exportToCSV}
                    className="rounded-xl bg-green-500 px-6 py-3 font-semibold text-white transition hover:bg-green-600 flex items-center gap-2"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Exportar CSV
                  </button>
                  <button
                    onClick={() => {
                      setShowStatsModal(false);
                      setSessionStats(null);
                    }}
                    className="rounded-xl border border-white/40 px-6 py-3 font-semibold transition hover:bg-white/10"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/20 bg-gradient-to-br from-purple-600 to-indigo-600 p-6 shadow-2xl">
            <h3 className="text-xl font-bold">Nova Pasta</h3>
            <p className="mt-1 text-sm text-white/70">Escolhe um nome para a pasta</p>
            
            <input
              type="text"
              placeholder="Nome da pasta"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createFolder()}
              className="mt-4 w-full rounded-2xl bg-white/20 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-green-400"
              autoFocus
            />
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewFolderName("");
                }}
                className="flex-1 rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={createFolder}
                disabled={!newFolderName.trim()}
                className="flex-1 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-600 disabled:opacity-50"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Folder Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/20 bg-gradient-to-br from-purple-600 to-indigo-600 p-6 shadow-2xl">
            <h3 className="text-xl font-bold">Editar Pasta</h3>
            <p className="mt-1 text-sm text-white/70">Escolhe um novo nome</p>
            
            <input
              type="text"
              placeholder="Nome da pasta"
              value={editingFolderName}
              onChange={(e) => setEditingFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && updateFolder()}
              className="mt-4 w-full rounded-2xl bg-white/20 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              autoFocus
            />
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingFolderId("");
                  setEditingFolderName("");
                }}
                className="flex-1 rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={updateFolder}
                disabled={!editingFolderName.trim()}
                className="flex-1 rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-yellow-600 disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/20 bg-gradient-to-br from-purple-600 to-indigo-600 p-6 shadow-2xl">
            <h3 className="text-xl font-bold">Eliminar Pasta</h3>
            <p className="mt-1 text-sm text-white/70">Tens a certeza que queres eliminar esta pasta?</p>
            
            <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-400/10 p-4">
              <p className="text-sm font-semibold text-red-300">{deletingFolderName}</p>
              <p className="mt-1 text-xs text-white/70">Esta ação não pode ser desfeita.</p>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteingFolderId("");
                  setDeletingFolderName("");
                }}
                className="flex-1 rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={deleteFolder}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Quiz Modal */}
      {showDeleteQuizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/20 bg-gradient-to-br from-purple-600 to-indigo-600 p-6 shadow-2xl">
            <h3 className="text-xl font-bold">Eliminar Quiz</h3>
            <p className="mt-1 text-sm text-white/70">Tens a certeza que queres eliminar este quiz?</p>
            
            <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-400/10 p-4">
              <p className="text-sm font-semibold text-red-300">{deletingQuizName}</p>
              <p className="mt-1 text-xs text-white/70">Esta ação não pode ser desfeita.</p>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteQuizModal(false);
                  setDeletingQuizId("");
                  setDeletingQuizName("");
                }}
                className="flex-1 rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={deleteQuiz}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Quiz Modal */}
      {showEditQuizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/20 bg-gradient-to-br from-purple-600 to-indigo-600 p-6 shadow-2xl">
            <h3 className="text-xl font-bold">Editar Quiz</h3>
            <p className="mt-1 text-sm text-white/70">Atualiza o nome e descrição do quiz</p>
            
            <div className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="Nome do quiz"
                value={editingQuizTitle}
                onChange={(e) => setEditingQuizTitle(e.target.value)}
                className="w-full rounded-2xl bg-white/20 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                autoFocus
              />
              
              <textarea
                placeholder="Descrição (opcional)"
                value={editingQuizDescription}
                onChange={(e) => setEditingQuizDescription(e.target.value)}
                rows={3}
                className="w-full rounded-2xl bg-white/20 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowEditQuizModal(false);
                  setEditingQuizId("");
                  setEditingQuizTitle("");
                  setEditingQuizDescription("");
                }}
                className="flex-1 rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={updateQuiz}
                disabled={!editingQuizTitle.trim()}
                className="flex-1 rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-yellow-600 disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-screen w-full gap-6 px-4 py-8">
        <aside className="w-72 h-[calc(100vh-4rem)] shrink-0 sticky top-8 rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl flex flex-col">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.3em] text-white/60">
              BrainUp
            </div>
            <h1 className="text-2xl font-black">Dashboard</h1>
          </div>

          <div className="mb-8">
            <p className="text-sm font-semibold text-white/80">Navegacao</p>
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => setActiveSection("sessions")}
                className={`w-full rounded-2xl px-4 py-3 text-left font-semibold transition ${
                  activeSection === "sessions"
                    ? "bg-white/20 shadow-lg"
                    : "border border-white/30 hover:bg-white/10"
                }`}
              >
                Sessões
                <span className="mt-1 block text-xs text-white/60">
                  Criar e gerir sessões
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("projects")}
                className={`w-full rounded-2xl px-4 py-3 text-left font-semibold transition ${
                  activeSection === "projects"
                    ? "bg-white/20 shadow-lg"
                    : "border border-white/30 hover:bg-white/10"
                }`}
              >
                Projetos
                <span className="mt-1 block text-xs text-white/60">
                  Pastas e quizzes
                </span>
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-white/80">Ações</p>
            <div className="mt-3 space-y-2">
              {activeSection === "sessions" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveSessionTab("create")}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                      activeSessionTab === "create"
                        ? "bg-white/20 text-white shadow-sm"
                        : "text-white/70 hover:bg-white/10"
                    }`}
                  >
                    Criar sessão
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSessionTab("history")}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                      activeSessionTab === "history"
                        ? "bg-white/20 text-white shadow-sm"
                        : "text-white/70 hover:bg-white/10"
                    }`}
                  >
                    Histórico
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveProjectTab("create")}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                      activeProjectTab === "create"
                        ? "bg-white/20 text-white shadow-sm"
                        : "text-white/70 hover:bg-white/10"
                    }`}
                  >
                    Criar quiz
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveProjectTab("import")}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                      activeProjectTab === "import"
                        ? "bg-white/20 text-white shadow-sm"
                        : "text-white/70 hover:bg-white/10"
                    }`}
                  >
                    Importar quiz
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveProjectTab("library")}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                      activeProjectTab === "library"
                        ? "bg-white/20 text-white shadow-sm"
                        : "text-white/70 hover:bg-white/10"
                    }`}
                  >
                    Biblioteca
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-white/20">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-xl bg-red-500/20 px-3 py-2 text-left text-sm font-semibold text-red-300 transition hover:bg-red-500/30 flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Terminar sessão
            </button>
          </div>
        </aside>

        <main className="flex-1 space-y-6">
          {activeSection === "sessions" ? (
            <>
              {activeSessionTab === "create" && (
                <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
                  <div>
                    <h2 className="text-xl font-bold">Criar sessão</h2>
                    <p className="text-sm text-white/70">
                      Escolhe um quiz e define a duração
                    </p>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                        Pasta
                      </p>
                      <select 
                        value={sessionFolder}
                        onChange={(e) => setSessionFolder(e.target.value)}
                        className="mt-2 w-full rounded-2xl bg-white/20 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-300"
                      >
                        <option value="">Selecionar pasta</option>
                        {folders.map((folder) => (
                          <option key={folder.id} value={folder.id}>
                            {folder.name} ({folder.quizCount} quizzes)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                        Quiz
                      </p>
                      <select 
                        value={sessionQuiz}
                        onChange={(e) => setSessionQuiz(e.target.value)}
                        disabled={!sessionFolder || sessionQuizzesLoading}
                        className="mt-2 w-full rounded-2xl bg-white/20 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {sessionQuizzesLoading 
                            ? "A carregar..." 
                            : sessionFolder 
                              ? "Selecionar quiz" 
                              : "Seleciona uma pasta primeiro"}
                        </option>
                        {sessionQuizzes.map((quiz) => (
                          <option key={quiz.id} value={quiz.id}>
                            {quiz.title} ({quiz.questionsCount} perguntas)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                      Tempo por Pergunta (segundos) *
                      </p>
                      <input
                      type="number"
                      min="1"
                      max="300"
                      value={sessionTimeLimit}
                      onChange={(e) => setSessionTimeLimit(parseInt(e.target.value) || 30)}
                      placeholder="Ex: 30"
                      className="mt-2 w-full rounded-2xl bg-white/20 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-300"
                      required
                      />
                      <p className="mt-1 text-xs text-white/60">
                        Tempo que cada jogador tem para responder
                      </p>
                    </div>
                    <button 
                      type="button" 
                      onClick={createGameSession} 
                      disabled={!sessionQuiz || !sessionTimeLimit || sessionTimeLimit <= 0} 
                      className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-green-400 to-blue-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Criar Sessão de Jogo
                    </button>
                  </div>
                </div>
              )}

              {activeSessionTab === "history" && (
                <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold">Histórico de Sessões</h2>
                      <p className="text-sm text-white/70">
                        Todas as tuas sessões de jogo
                      </p>
                    </div>
                    <button
                      onClick={fetchSessions}
                      className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/30"
                    >
                      Atualizar
                    </button>
                  </div>

                  {sessionsLoading ? (
                    <div className="text-center text-sm text-white/60 py-12">
                      A carregar sessões...
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📊</div>
                      <p className="text-white/70">Ainda não criaste nenhuma sessão</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map((session) => (
                        <div
                          key={session.id}
                          className="rounded-2xl border border-white/20 bg-white/5 p-5 hover:bg-white/10 transition"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                                  session.isActive
                                    ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                                    : 'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                                }`}>
                                  {session.isActive ? (
                                    <>
                                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                      Ativa
                                    </>
                                  ) : (
                                    'Terminada'
                                  )}
                                </span>
                                <span className="text-xs text-white/60">
                                  {new Date(session.startedAt).toLocaleDateString('pt-PT')} às{' '}
                                  {new Date(session.startedAt).toLocaleTimeString('pt-PT', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                              </div>
                              <p className="text-xs text-white/50 mt-2">
                                ID: {session.id.substring(0, 8)}...
                              </p>
                            </div>
                            
                            <button
                              onClick={() => fetchSessionStats(session.id)}
                              disabled={statsLoading}
                              className="rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {statsLoading ? 'A carregar...' : 'Ver Detalhes'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
                <section className="grid gap-6 lg:grid-cols-[1.1fr_1.5fr]">
                <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
                  <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Pastas</h2>
                    <p className="text-sm text-white/70">
                    Cria uma pasta por disciplina ou tema
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 rounded-xl bg-green-500 px-3 py-2 text-sm font-semibold transition hover:bg-green-600"
                    title="Nova Pasta"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                  </button>
                  </div>

                  <div className="mt-6 space-y-4">
                  {foldersLoading ? (
                    <div className="text-center text-sm text-white/60">A carregar pastas...</div>
                  ) : folders.length === 0 ? (
                    <div className="text-center text-sm text-white/60">Nenhuma pasta criada ainda</div>
                  ) : (
                    folders.map((folder) => (
                      <div
                        key={folder.id}
                        onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                        onDragLeave={handleFolderDragLeave}
                        onDrop={(e) => handleFolderDrop(e, folder.id)}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-4 transition ${
                          activeFolder === folder.id
                          ? "border-white/40 bg-white/20 shadow-lg"
                          : dropTargetFolderId === folder.id
                          ? "border-green-400/60 bg-green-400/20 shadow-lg scale-105"
                          : "border-white/15 bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <button
                          onClick={() => setActiveFolder(folder.id)}
                          className="flex-1 text-left"
                        >
                          <div className="text-base font-semibold">
                            {folder.name}
                          </div>
                          <p className="text-xs text-white/60">{folder.quizCount} quizzes</p>
                        </button>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(folder)}
                            className="rounded-lg bg-yellow-500/20 p-2 transition hover:bg-yellow-500/40"
                            title="Editar pasta"
                          >
                            <svg className="h-4 w-4 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          
                          <button
                            onClick={() => openDeleteModal(folder)}
                            className="rounded-lg bg-red-500/20 p-2 transition hover:bg-red-500/40"
                            title="Eliminar pasta"
                          >
                            <svg className="h-4 w-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
                    {activeProjectTab === "create" && (
                    <>
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold">Criar quiz</h2>
                        <p className="text-sm text-white/70">
                          Pasta selecionada: {selectedFolderName}
                        </p>
                      </div>
                    </div>

                    {!activeFolder && (
                      <div className="mt-4 rounded-2xl border border-yellow-400/40 bg-yellow-400/10 p-4 text-sm text-yellow-200">
                        Seleciona uma pasta na coluna da esquerda para continuar.
                      </div>
                    )}

                    {createQuizError && (
                      <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-200">
                        {createQuizError}
                      </div>
                    )}

                    <div className="mt-6 space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-white/80">
                          Nome do quiz
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Historia moderna - nivel medio"
                          value={newQuizTitle}
                          onChange={(e) => setNewQuizTitle(e.target.value)}
                          className="w-full rounded-2xl bg-white/20 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-white/80">
                          Descricao (opcional)
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Explica o objetivo do quiz e o tema."
                          value={newQuizDescription}
                          onChange={(e) => setNewQuizDescription(e.target.value)}
                          className="w-full rounded-2xl bg-white/20 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                        />
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="rounded-2xl border border-white/20 bg-white/5 p-4 text-xs text-white/70">
                          Depois vais adicionar as perguntas.
                        </div>
                        <button
                          type="button"
                          onClick={createQuiz}
                          disabled={
                            !activeFolder ||
                            !newQuizTitle.trim() ||
                            createQuizSubmitting
                          }
                          className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {createQuizSubmitting ? "A criar..." : "Continuar"}
                        </button>
                      </div>
                    </div>
                    </>
                    )}

                    {activeProjectTab === "import" && (
                    <>
                    <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold">Importar quiz</h2>
                      <p className="text-sm text-white/70">
                      Pasta atual: {selectedFolderName}
                      </p>
                    </div>
                    </div>

                    <div 
                      className="mt-6 rounded-3xl border border-dashed border-white/40 bg-white/5 p-8 text-center transition-colors hover:bg-white/10"
                      onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-yellow-400');
                      }}
                      onDragLeave={(e) => {
                      e.currentTarget.classList.remove('border-yellow-400');
                      }}
                      onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-yellow-400');
                      const files = e.dataTransfer.files;
                      if (files.length > 0) {
                        uploadFile(files[0]); 
                      }
                      }}
                    >
                    <p className="text-base font-semibold">
                      Larga ficheiros aqui para importar
                    </p>
                    <p className="mt-2 text-sm text-white/70">
                      Escolhe um ficheiro GIFT ou JSON dentro da pasta
                    </p>
                    <input
                      type="file"
                      accept=".gift,.json"
                      className="hidden"
                      id="file-input"
                      onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadFile(file);
                      }}
                    />
                    <button 
                      className="mt-6 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleFileSelect}
                      disabled={uploadStatus.type === 'loading' || !activeFolder}
                    >
                      {uploadStatus.type === 'loading' ? 'A carregar...' : 'Selecionar ficheiro'}
                    </button>
                    </div>

                    {uploadStatus.message && (
                      <div className={`mt-4 rounded-2xl border p-4 ${
                        uploadStatus.type === 'success' 
                          ? 'border-green-400/40 bg-green-400/10 text-green-400'
                          : uploadStatus.type === 'error'
                          ? 'border-red-400/40 bg-red-400/10 text-red-400'
                          : 'border-yellow-400/40 bg-yellow-400/10 text-yellow-400'
                      }`}>
                        <p className="text-sm font-semibold">{uploadStatus.message}</p>
                      </div>
                    )}

                    <div className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-4">
                    <p className="text-sm font-semibold">Sugestao de fluxo</p>
                    <p className="mt-2 text-xs text-white/70">
                      1. Cria a pasta do tema. 2. Entra na pasta. 3. Importa
                      o quiz para manter tudo organizado.
                    </p>
                    </div>
                    </>
                    )}

                    {activeProjectTab === "library" && (
                    <>
                      <div className="flex items-start justify-between">
                      <div>
                      <h2 className="text-xl font-bold">Biblioteca</h2>
                      <p className="text-sm text-white/70">
                      Quizzes da pasta: {selectedFolderName}
                      </p>
                      </div>
                      </div>

                      <div className="mt-6">
                      <input
                      type="text"
                      placeholder="Pesquisar quiz"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-2xl bg-white/15 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                      </div>

                      <div className="mt-4">
                      {quizzesLoading ? (
                      <div className="text-center text-sm text-white/60">A carregar quizzes...</div>
                      ) : !activeFolder ? (
                      <div className="text-center text-sm text-white/60">Seleciona uma pasta primeiro</div>
                      ) : filteredQuizzes.length === 0 ? (
                      <div className="text-center text-sm text-white/60">
                      {searchQuery ? "Nenhum quiz encontrado" : "Nenhum quiz nesta pasta"}
                      </div>
                      ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredQuizzes.map((quiz) => (
                        <div
                        key={quiz.id}
                        draggable
                        onDragStart={() => handleQuizDragStart(quiz.id)}
                        onDragEnd={handleQuizDragEnd}
                        className={`rounded-xl border border-white/20 bg-white/10 p-4 transition hover:bg-white/15 cursor-move ${
                          draggedQuizId === quiz.id ? 'opacity-50 scale-95' : ''
                        }`}
                        >
                        <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                        <h3 className="text-sm font-semibold text-white truncate">
                          {quiz.title}
                        </h3>
                        <p className="text-xs text-white/60 mt-1">
                          {quiz.questionsCount} {quiz.questionsCount === 1 ? 'pergunta' : 'perguntas'}
                        </p>
                        {quiz.description && (
                          <p className="text-xs text-white/50 mt-1 line-clamp-2">
                          {quiz.description}
                          </p>
                        )}
                        </div>
                        
                        <div className="relative quiz-menu">
                        <button
                          onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuQuizId(openMenuQuizId === quiz.id ? null : quiz.id);
                          }}
                          className="rounded-md bg-white/10 p-2 transition hover:bg-white/20"
                          title="Opções"
                        >
                          <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                          </svg>
                        </button>

                        {openMenuQuizId === quiz.id && (
                          <div className="absolute right-0 top-full mt-1 w-40 rounded-xl border border-white/20 bg-gradient-to-br from-purple-600 to-indigo-600 shadow-2xl z-10">
                          <button
                            onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuQuizId(null);
                            openVerQuizModal(quiz);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-white transition hover:bg-white/10 rounded-t-xl"
                          >
                            <svg className="h-4 w-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                            </svg>
                            Ver quiz
                          </button>

                          <button
                            onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuQuizId(null);
                            duplicateQuiz(quiz.id);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-white transition hover:bg-white/10"
                          >
                            <svg className="h-4 w-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 002-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Duplicar
                          </button>

                          <button
                            onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuQuizId(null);
                            openEditQuizModal(quiz);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-white transition hover:bg-white/10"
                          >
                            <svg className="h-4 w-4 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                          </button>
                          
                          <button
                            onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuQuizId(null);
                            openDeleteQuizModal(quiz);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm text-red-300 transition hover:bg-white/10 rounded-b-xl"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Eliminar
                          </button>
                          </div>
                        )}
                        </div>
                        </div>
                        </div>
                      ))}
                      </div>
                      )}
                      </div>
                    </>
                  )}
                </div>
                </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
