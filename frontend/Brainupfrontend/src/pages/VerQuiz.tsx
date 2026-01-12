import type { FC } from "react";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

interface QuestionOption {
  id: string;
  optionText: string;
  isCorrect: boolean;
  correctOrder?: number;
}

interface Question {
  id: string;
  questionText: string;
  type: string;
  options: QuestionOption[];
}

interface QuizDetails {
  id: string;
  title: string;
  description: string;
  authorId: string;
  createdAt: string;
  questionsCount: number;
}

interface EditingQuestion {
  id: string;
  questionText: string;
  typeId: string;
  options: Array<{
    id?: string;
    optionText: string;
    isCorrect: boolean;
    correctOrder?: number;
  }>;
}

const VerQuiz: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quizId = searchParams.get("quizId");

  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingQuestion | null>(null);
  const [saving, setSaving] = useState(false);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5027";

  const authFetch = (url: string, options: RequestInit = {}) => {
    const token = sessionStorage.getItem("brainup_token");
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
    console.log('[useEffect] Quiz ID:', quizId);
    if (!quizId) {
      console.error('[useEffect] Quiz ID não fornecido');
      setError("Quiz ID não fornecido");
      setLoading(false);
      return;
    }

    fetchQuizData();
  }, [quizId]);

  const fetchQuizData = async () => {
    try {
      console.log('[fetchQuizData] Iniciando carregamento de dados do quiz:', quizId);
      setLoading(true);

      const quizRes = await authFetch(`${apiBaseUrl}/api/Quizzes/${quizId}`);
      console.log('[fetchQuizData] Quiz response status:', quizRes.status);
      
      if (!quizRes.ok) {
        const errorText = await quizRes.text();
        console.error('[fetchQuizData] Erro ao carregar quiz:', { status: quizRes.status, error: errorText });
        throw new Error("Erro ao carregar quiz");
      }
      const quizData: QuizDetails = await quizRes.json();
      console.log('[fetchQuizData] Quiz carregado:', quizData);
      setQuiz(quizData);

      const questionsRes = await authFetch(
        `${apiBaseUrl}/api/Questions/quiz/${quizId}`
      );
      console.log('[fetchQuizData] Questions response status:', questionsRes.status);
      
      if (!questionsRes.ok) {
        const errorText = await questionsRes.text();
        console.warn('[fetchQuizData] Erro ao carregar perguntas:', { status: questionsRes.status, error: errorText });
        setQuestions([]);
        return;
      }
      const questionsData: Question[] = await questionsRes.json();
      console.log('[fetchQuizData] Perguntas carregadas:', { count: questionsData.length, questions: questionsData });
      setQuestions(questionsData);

    } catch (err) {
      console.error('[fetchQuizData] Erro crítico:', err);
      setError("Erro ao carregar dados do quiz. Tenta novamente.");
    } finally {
      setLoading(false);
      console.log('[fetchQuizData] Carregamento finalizado');
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case "multiple_choice": return "Escolha Múltipla";
      case "true_false": return "Verdadeiro/Falso";
      case "ordering": return "Ordenação";
      default: return type;
    }
  };

  const handleEditClick = (question: Question) => {
    console.log('[handleEditClick] Editando pergunta:', question);
    setEditingQuestionId(question.id);
    const editData = {
      id: question.id,
      questionText: question.questionText,
      typeId: getTypeIdFromName(question.type),
      options: question.options.map(opt => ({
        id: opt.id,
        optionText: opt.optionText,
        isCorrect: opt.isCorrect,
        correctOrder: opt.correctOrder
      }))
    };
    console.log('[handleEditClick] Dados de edição:', editData);
    setEditingData(editData);
  };

  const handleCancelEdit = () => {
    console.log('[handleCancelEdit] Cancelando edição da pergunta:', editingQuestionId);
    setEditingQuestionId(null);
    setEditingData(null);
  };

  const handleSaveQuestion = async () => {
    if (!editingData) {
      console.warn('[handleSaveQuestion] Nenhum dado de edição disponível');
      return;
    }

    console.log('[handleSaveQuestion] Guardando pergunta:', editingData);

    try {
      setSaving(true);
      
      const updatePayload = {
        questionText: editingData.questionText,
        typeId: editingData.typeId,
      };
      console.log('[handleSaveQuestion] Payload de atualização da pergunta:', updatePayload);
      
      const response = await authFetch(`${apiBaseUrl}/api/Questions/${editingData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload)
      });

      console.log('[handleSaveQuestion] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[handleSaveQuestion] Erro ao atualizar pergunta:', { status: response.status, error: errorText });
        throw new Error("Erro ao atualizar pergunta");
      }

      const questionType = questions.find(q => q.id === editingData.id)?.type;
      console.log('[handleSaveQuestion] Tipo de pergunta:', questionType);

      if (questionType !== "true_false") {
        console.log('[handleSaveQuestion] Atualizando opções:', editingData.options.length);
        for (const [index, option] of editingData.options.entries()) {
          if (option.id) {
            const optionPayload = {
              optionText: option.optionText,
              isCorrect: option.isCorrect,
              correctOrder: option.correctOrder
            };
            console.log(`[handleSaveQuestion] Atualizando opção ${index + 1}:`, optionPayload);
            
            const optionResponse = await authFetch(`${apiBaseUrl}/api/Options/${option.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(optionPayload)
            });

            if (!optionResponse.ok) {
              const errorText = await optionResponse.text();
              console.error(`[handleSaveQuestion] Erro ao atualizar opção ${index + 1}:`, { status: optionResponse.status, error: errorText });
            } else {
              console.log(`[handleSaveQuestion] Opção ${index + 1} atualizada com sucesso`);
            }
          }
        }
      }

      console.log('[handleSaveQuestion] Recarregando dados do quiz');
      await fetchQuizData();
      setEditingQuestionId(null);
      setEditingData(null);
      console.log('[handleSaveQuestion] Pergunta guardada com sucesso');
    } catch (err) {
      console.error('[handleSaveQuestion] Erro crítico:', err);
      alert("Erro ao guardar pergunta. Tenta novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    console.log('[handleDeleteQuestion] Tentando apagar pergunta:', questionId);
    if (!confirm("Tens a certeza que queres apagar esta pergunta?")) {
      console.log('[handleDeleteQuestion] Cancelado pelo utilizador');
      return;
    }

    try {
      console.log('[handleDeleteQuestion] Enviando pedido DELETE');
      const response = await authFetch(`${apiBaseUrl}/api/Questions/${questionId}`, {
        method: "DELETE"
      });

      console.log('[handleDeleteQuestion] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[handleDeleteQuestion] Erro ao apagar pergunta:', { status: response.status, error: errorText });
        throw new Error("Erro ao apagar pergunta");
      }

      console.log('[handleDeleteQuestion] Pergunta apagada com sucesso, recarregando dados');
      await fetchQuizData();
    } catch (err) {
      console.error('[handleDeleteQuestion] Erro crítico:', err);
      alert("Erro ao apagar pergunta. Tenta novamente.");
    }
  };

  const handleAddOption = async () => {
    if (!editingData) {
      console.warn('[handleAddOption] Nenhum dado de edição disponível');
      return;
    }
    
    const questionType = questions.find(q => q.id === editingData.id)?.type;
    console.log('[handleAddOption] Tipo de pergunta:', questionType);
    
    if (questionType === "true_false") {
      console.warn('[handleAddOption] Tentativa de adicionar opção a pergunta Verdadeiro/Falso bloqueada');
      alert("Não podes adicionar opções a perguntas Verdadeiro/Falso");
      return;
    }

    try {
      const payload = {
        optionText: "Nova opção",
        isCorrect: false,
        ...(questionType === "ordering" && { correctOrder: editingData.options.length + 1 })
      };

      console.log('[handleAddOption] Payload:', payload);
      console.log('[handleAddOption] Endpoint:', `${apiBaseUrl}/api/Questions/${editingData.id}/options`);

      const response = await authFetch(`${apiBaseUrl}/api/Questions/${editingData.id}/options`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload)
      });

      console.log('[handleAddOption] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[handleAddOption] Erro do servidor:', { status: response.status, error: errorText, payload });
        throw new Error(`Erro ao adicionar opção: ${response.status} - ${errorText}`);
      }

      const newOption = await response.json();
      console.log('[handleAddOption] Nova opção criada:', newOption);

      setEditingData({
        ...editingData,
        options: [...editingData.options, {
          id: newOption.id,
          optionText: newOption.optionText,
          isCorrect: newOption.isCorrect,
          correctOrder: newOption.correctOrder
        }]
      });
      console.log('[handleAddOption] Estado de edição atualizado');

      console.log('[handleAddOption] Recarregando dados do servidor');
      await fetchQuizData();

    } catch (err) {
      console.error('[handleAddOption] Erro crítico:', err);
      alert(`Erro ao adicionar opção. ${err instanceof Error ? err.message : 'Tenta novamente.'}`);
    }
  };

  const handleRemoveOption = async (optionId: string | undefined, index: number) => {
    console.log('[handleRemoveOption] Removendo opção:', { optionId, index });
    
    if (!editingData || !optionId) {
      console.warn('[handleRemoveOption] Dados insuficientes:', { hasEditingData: !!editingData, optionId });
      return;
    }

    const questionType = questions.find(q => q.id === editingData.id)?.type;
    console.log('[handleRemoveOption] Tipo de pergunta:', questionType);
    
    if (questionType === "true_false") {
      console.warn('[handleRemoveOption] Tentativa de remover opção de pergunta Verdadeiro/Falso bloqueada');
      alert("Não podes remover opções de perguntas Verdadeiro/Falso");
      return;
    }

    if (!confirm("Tens a certeza que queres apagar esta opção?")) {
      console.log('[handleRemoveOption] Cancelado pelo utilizador');
      return;
    }

    try {
      console.log('[handleRemoveOption] Enviando pedido DELETE');
      const response = await authFetch(`${apiBaseUrl}/api/Options/${optionId}`, {
        method: "DELETE"
      });

      console.log('[handleRemoveOption] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[handleRemoveOption] Erro ao apagar opção:', { status: response.status, error: errorText });
        throw new Error("Erro ao apagar opção");
      }

      console.log('[handleRemoveOption] Opção apagada com sucesso, recarregando dados');
      await fetchQuizData();
      
      console.log('[handleRemoveOption] Recarregando dados de edição');
      const updatedQuestion = await authFetch(`${apiBaseUrl}/api/Questions/${editingData.id}`).then(r => r.json());
      console.log('[handleRemoveOption] Pergunta atualizada:', updatedQuestion);
      
      setEditingData({
        id: updatedQuestion.id,
        questionText: updatedQuestion.questionText,
        typeId: getTypeIdFromName(updatedQuestion.type),
        options: updatedQuestion.options
      });
      console.log('[handleRemoveOption] Estado de edição atualizado');
    } catch (err) {
      console.error('[handleRemoveOption] Erro crítico:', err);
      alert("Erro ao apagar opção. Tenta novamente.");
    }
  };

  const handleOptionChange = (index: number, field: string, value: any) => {
    console.log('[handleOptionChange] Alterando opção:', { index, field, value });
    
    if (!editingData) {
      console.warn('[handleOptionChange] Nenhum dado de edição disponível');
      return;
    }
    
    const newOptions = [...editingData.options];
    
    const questionType = questions.find(q => q.id === editingData.id)?.type;
    if (field === "isCorrect" && value === true && questionType !== "ordering") {
      console.log('[handleOptionChange] Desmarcando outras opções corretas');
      newOptions.forEach((opt, i) => {
        if (i !== index) {
          opt.isCorrect = false;
        }
      });
    }
    
    newOptions[index] = { ...newOptions[index], [field]: value };
    console.log('[handleOptionChange] Novas opções:', newOptions);
    setEditingData({ ...editingData, options: newOptions });
  };

  const getTypeIdFromName = (typeName: string): string => {
    const typeMap: Record<string, string> = {
      "multiple_choice": "1",
      "true_false": "2",
      "ordering": "3"
    };
    const typeId = typeMap[typeName] || "1";
    console.log('[getTypeIdFromName] Conversão:', { typeName, typeId });
    return typeId;
  };

  if (loading) {
    console.log('[Render] Estado: loading');
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 flex items-center justify-center">
        <div className="text-white text-xl">A carregar quiz...</div>
      </div>
    );
  }

  if (error || !quiz) {
    console.log('[Render] Estado: error ou quiz não encontrado', { error, hasQuiz: !!quiz });
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">{error || "Quiz não encontrado"}</div>
          <button
            onClick={() => navigate("/dashboard")}
            className="rounded-xl bg-white/20 px-6 py-3 text-white transition hover:bg-white/30"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  console.log('[Render] Estado: normal', { questionsCount: questions.length, editing: editingQuestionId });

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-purple-800 via-indigo-800 to-pink-800 text-white">
      <div className="flex min-h-screen w-full flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="rounded-3xl border border-white/30 bg-gradient-to-br from-white/15 to-white/5 p-8 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:shadow-purple-500/20">
          <button
            onClick={() => navigate("/dashboard")}
            className="mb-6 flex items-center gap-2 text-white/70 transition-all duration-300 hover:text-white hover:translate-x-1 group"
          >
            <svg className="h-5 w-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-semibold">Voltar ao Dashboard</span>
          </button>

          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-purple-200/70 font-bold">
              Visualizar e editar
            </p>
            <h1 className="mt-3 text-3xl font-black sm:text-4xl bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
              {quiz.title}
            </h1>
            {quiz.description && (
              <p className="mt-3 text-base text-white/80 sm:text-lg leading-relaxed">{quiz.description}</p>
            )}
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <div className="rounded-2xl border border-purple-300/40 bg-gradient-to-br from-purple-400/20 to-purple-600/10 px-5 py-2.5 backdrop-blur-sm shadow-lg">
                <span className="font-bold text-lg">{questions.length}</span>{" "}
                <span className="text-purple-100">{questions.length === 1 ? "pergunta" : "perguntas"}</span>
              </div>
              <div className="rounded-2xl border border-indigo-300/40 bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 px-5 py-2.5 backdrop-blur-sm shadow-lg">
                <span className="text-indigo-100">Criado em {new Date(quiz.createdAt).toLocaleDateString("pt-PT")}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Questions List */}
        <main className="space-y-8">
          {questions.length === 0 ? (
            <div className="rounded-3xl border border-white/30 bg-gradient-to-br from-white/10 to-white/5 p-16 backdrop-blur-xl shadow-2xl text-center">
              <div className="inline-flex p-6 rounded-full bg-gradient-to-br from-purple-400/30 to-pink-400/30 mb-6">
                <svg className="h-20 w-20 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-xl font-bold text-white/90 mb-2">Este quiz ainda não tem perguntas.</p>
              <p className="text-base text-white/60">Adiciona perguntas para começar!</p>
            </div>
          ) : (
            questions.map((question, index) => (
              <section
                key={question.id}
                className="rounded-3xl border border-white/30 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-purple-500/20 hover:scale-[1.01]"
              >
                {editingQuestionId === question.id && editingData ? (
                  // Edit Mode
                  <div className="p-8">
                    <div className="flex items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="rounded-2xl border border-purple-300/40 bg-gradient-to-br from-purple-400/30 to-purple-600/20 px-4 py-2 text-sm font-bold shadow-lg">
                          Pergunta {index + 1}
                        </div>
                        <div className="rounded-2xl border border-blue-300/50 bg-gradient-to-r from-blue-400/30 to-cyan-400/30 px-4 py-2 text-xs font-bold text-blue-50 shadow-lg animate-pulse flex items-center gap-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          MODO DE EDIÇÃO
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="mb-6 rounded-2xl border border-red-300/50 bg-gradient-to-r from-red-400/20 to-red-600/20 px-5 py-4 text-sm text-red-50 shadow-lg">
                        {error}
                      </div>
                    )}

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-white/90 uppercase tracking-wide">
                          Texto da pergunta
                        </label>
                        <textarea
                          value={editingData.questionText}
                          onChange={(e) => setEditingData({ ...editingData, questionText: e.target.value })}
                          rows={3}
                          className="w-full rounded-2xl bg-white/25 border-2 border-white/30 px-5 py-4 text-white placeholder-white/60 focus:outline-none focus:ring-4 focus:ring-yellow-300/50 focus:border-yellow-300/50 transition-all duration-300 shadow-inner"
                          placeholder="Escreve a pergunta principal"
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-bold text-white/90 uppercase tracking-wide">
                            Opções de resposta
                          </label>
                          {question.type !== "true_false" && (
                            <button
                              onClick={handleAddOption}
                              className="rounded-2xl border border-emerald-300/50 bg-gradient-to-r from-emerald-400/30 to-emerald-600/30 px-5 py-2.5 text-sm font-bold text-emerald-50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/30 flex items-center gap-2"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Adicionar opção
                            </button>
                          )}
                        </div>

                        <div className="space-y-3">
                          {editingData.options.map((option, optIndex) => (
                            <div
                              key={option.id || optIndex}
                              className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/20 bg-gradient-to-r from-white/10 to-white/5 px-5 py-4 shadow-lg transition-all duration-300 hover:bg-white/15"
                            >
                              {question.type === "ordering" ? (
                                <>
                                  <input
                                    type="number"
                                    min={1}
                                    value={option.correctOrder || optIndex + 1}
                                    onChange={(e) => handleOptionChange(optIndex, "correctOrder", parseInt(e.target.value))}
                                    className="w-20 rounded-xl bg-white/25 border-2 border-white/30 px-3 py-2 text-white text-center font-bold focus:outline-none focus:ring-2 focus:ring-yellow-300/50 transition-all duration-300"
                                  />
                                  <input
                                    type="text"
                                    value={option.optionText}
                                    onChange={(e) => handleOptionChange(optIndex, "optionText", e.target.value)}
                                    className="flex-1 rounded-xl bg-white/25 border-2 border-white/30 px-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-300/50 transition-all duration-300"
                                    placeholder={`Item ${optIndex + 1}`}
                                  />
                                </>
                              ) : (
                                <>
                                  <input
                                    type={question.type === "true_false" ? "checkbox" : "radio"}
                                    name={`correct-${question.id}`}
                                    checked={option.isCorrect}
                                    onChange={(e) => handleOptionChange(optIndex, "isCorrect", e.target.checked)}
                                    className="h-5 w-5 cursor-pointer accent-yellow-400"
                                    disabled={question.type === "true_false"}
                                  />
                                  <input
                                    type="text"
                                    value={option.optionText}
                                    onChange={(e) => handleOptionChange(optIndex, "optionText", e.target.value)}
                                    className="flex-1 rounded-xl bg-white/25 border-2 border-white/30 px-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-300/50 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                                    placeholder={`Opção ${optIndex + 1}`}
                                    disabled={question.type === "true_false"}
                                  />
                                </>
                              )}
                              {question.type !== "true_false" && (
                                <button
                                  onClick={() => handleRemoveOption(option.id, optIndex)}
                                  className="rounded-xl border border-red-300/50 bg-gradient-to-r from-red-400/30 to-red-600/30 px-4 py-2 text-sm font-bold text-red-50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center gap-2"
                                  title="Remover opção"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Remover
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {question.type === "true_false" && (
                          <p className="text-xs text-white/70 italic bg-white/5 rounded-xl px-4 py-2 border border-white/20 flex items-center gap-2">
                            <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            As opções de perguntas Verdadeiro/Falso não podem ser editadas
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end pt-4 border-t border-white/20">
                        <button
                          onClick={handleCancelEdit}
                          className="rounded-2xl border-2 border-white/40 px-8 py-3 text-sm font-bold transition-all duration-300 hover:bg-white/15 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={saving}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSaveQuestion}
                          className="rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 px-8 py-3 text-sm font-bold text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-orange-500/50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 flex items-center justify-center gap-2"
                          disabled={saving}
                        >
                          {saving ? (
                            <>
                              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              A guardar...
                            </>
                          ) : (
                            <>
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                              </svg>
                              Guardar alterações
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="p-8">
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div className="flex items-start gap-4">
                        <div className="rounded-2xl border border-purple-300/40 bg-gradient-to-br from-purple-400/30 to-purple-600/20 px-4 py-2 text-base font-black shadow-lg min-w-[3rem] text-center">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="text-xs rounded-xl border border-indigo-300/50 bg-gradient-to-r from-indigo-400/30 to-indigo-600/20 px-4 py-1.5 font-bold text-indigo-50 shadow-md">
                              {getQuestionTypeLabel(question.type)}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold sm:text-xl text-white leading-relaxed">{question.questionText}</h3>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => handleEditClick(question)}
                          className="rounded-2xl border-2 border-white/40 px-5 py-2.5 text-sm font-bold transition-all duration-300 hover:bg-white/15 hover:scale-105 hover:shadow-lg flex items-center gap-2"
                          title="Editar"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="rounded-2xl border border-red-300/50 bg-gradient-to-r from-red-400/30 to-red-600/30 px-5 py-2.5 text-sm font-bold text-red-50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center gap-2"
                          title="Apagar"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Apagar
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 pl-0 sm:pl-16">
                      {question.options.map((option, optIndex) => (
                        <div
                          key={option.id}
                          className={`rounded-2xl border px-5 py-4 text-sm transition-all duration-300 hover:scale-[1.02] shadow-md ${
                            option.isCorrect || question.type === "ordering"
                              ? "border-emerald-300/50 bg-gradient-to-r from-emerald-400/25 to-emerald-600/20 text-emerald-50 shadow-emerald-500/20"
                              : "border-white/20 bg-gradient-to-r from-white/10 to-white/5 text-white/90"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            {question.type === "ordering" && option.correctOrder !== undefined ? (
                              <>
                                <span className="rounded-xl border border-emerald-300/50 bg-gradient-to-br from-emerald-400/40 to-emerald-600/30 px-3 py-1.5 text-sm font-black shadow-md">
                                  {option.correctOrder}
                                </span>
                                <span className="flex-1 font-medium">{option.optionText}</span>
                              </>
                            ) : (
                              <>
                                {option.isCorrect && (
                                  <div className="flex-shrink-0 p-1 rounded-lg bg-emerald-400/30">
                                    <svg className="h-5 w-5 text-emerald-200" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                                <span className="flex-1 font-medium">{option.optionText}</span>
                                {option.isCorrect && (
                                  <span className="text-xs font-bold bg-emerald-400/30 px-3 py-1 rounded-full flex items-center gap-1">
                                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Correta
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            ))
          )}
        </main>
      </div>
    </div>
  );
};

export default VerQuiz;