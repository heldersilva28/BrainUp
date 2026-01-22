import type { FC } from "react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useAuthGuard } from "../hooks/useAuthGuard";
import ConfirmModal from "../components/ConfirmModal";

interface QuestionType {
  id: number;
  name: string;
}

interface QuestionSummary {
  id: string;
  text: string;
  type: string;
}

const QuizEditorPage: FC = () => {
  useAuthGuard();
  const navigate = useNavigate();
  const { quizId } = useParams();
  const location = useLocation();
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5027";

  const [quizTitle, setQuizTitle] = useState(
    (location.state as { title?: string })?.title ?? ""
  );
  const [quizDescription, setQuizDescription] = useState(
    (location.state as { description?: string })?.description ?? ""
  );
  const [types, setTypes] = useState<QuestionType[]>([]);
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState<{
    questionText: string;
    typeId: string;
    options: Array<{
      optionText: string;
      isCorrect: boolean;
      correctOrder?: number;
    }>;
  }>({
    questionText: "",
    typeId: "1",
    options: [
      { optionText: "", isCorrect: false },
      { optionText: "", isCorrect: false }
    ]
  });
  const [creating, setCreating] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'alert' | 'error' | 'success';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
    onConfirm: () => {},
  });

  const token = sessionStorage.getItem("brainup_token");

  const showAlert = (title: string, message: string, type: 'alert' | 'error' | 'success' = 'alert') => {
    setModalState({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: () => setModalState(prev => ({ ...prev, isOpen: false })),
    });
  };

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await axios.get(`${apiBaseUrl}/api/QuestionTypes`);
        setTypes(response.data ?? []);
      } catch (err) {
        console.error("Erro ao carregar tipos:", err);
      }
    };

    fetchTypes();
  }, [apiBaseUrl]);

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!quizId || !token) return;
      try {
        const response = await axios.get(`${apiBaseUrl}/api/Quizzes/${quizId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setQuizTitle(response.data?.title ?? quizTitle);
        setQuizDescription(response.data?.description ?? quizDescription);
      } catch (err) {
        console.error("Erro ao carregar quiz:", err);
      }
    };

    const fetchQuestions = async () => {
      if (!quizId || !token) return;
      try {
        const response = await axios.get(
          `${apiBaseUrl}/api/Questions/quiz/${quizId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = response.data ?? [];
        const mapped = data.map((q: { id: string; questionText: string; type: string }) => ({
          id: q.id,
          text: q.questionText,
          type: q.type,
        }));
        setQuestions(mapped);
      } catch (err) {
        console.error("Erro ao carregar perguntas:", err);
      }
    };

    fetchQuiz();
    fetchQuestions();
  }, [apiBaseUrl, quizDescription, quizId, quizTitle, token]);

  const handleAddNewQuestion = () => {
    setShowAddModal(true);
    setNewQuestion({
      questionText: "",
      typeId: "1",
      options: [
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false }
      ]
    });
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setNewQuestion({
      questionText: "",
      typeId: "1",
      options: [
        { optionText: "", isCorrect: false },
        { optionText: "", isCorrect: false }
      ]
    });
  };

  const handleTypeChange = (typeId: string) => {
    if (typeId === "2") { // true_false
      setNewQuestion({
        ...newQuestion,
        typeId,
        options: [
          { optionText: "Verdadeiro", isCorrect: false },
          { optionText: "Falso", isCorrect: false }
        ]
      });
    } else if (typeId === "3") { // ordering
      setNewQuestion({
        ...newQuestion,
        typeId,
        options: [
          { optionText: "", isCorrect: false, correctOrder: 1 },
          { optionText: "", isCorrect: false, correctOrder: 2 }
        ]
      });
    } else { // multiple_choice
      setNewQuestion({
        ...newQuestion,
        typeId,
        options: [
          { optionText: "", isCorrect: false },
          { optionText: "", isCorrect: false }
        ]
      });
    }
  };

  const handleAddOptionToNew = () => {
    const isOrdering = newQuestion.typeId === "3";
    const newOption = {
      optionText: "",
      isCorrect: false,
      ...(isOrdering && { correctOrder: newQuestion.options.length + 1 })
    };
    setNewQuestion({
      ...newQuestion,
      options: [...newQuestion.options, newOption]
    });
  };

  const handleRemoveOptionFromNew = (index: number) => {
    if (newQuestion.options.length <= 2) {
      showAlert('Mínimo de Opções', 'Deve ter pelo menos 2 opções', 'alert');
      return;
    }
    const newOptions = newQuestion.options.filter((_, i) => i !== index);
    setNewQuestion({
      ...newQuestion,
      options: newOptions
    });
  };

  const handleNewOptionChange = (index: number, field: string, value: any) => {
    const newOptions = [...newQuestion.options];
    
    // Para multiple choice e true_false, apenas uma opção pode ser correta
    if (field === "isCorrect" && value === true && (newQuestion.typeId === "1" || newQuestion.typeId === "2")) {
      newOptions.forEach((opt, i) => {
        if (i !== index) {
          opt.isCorrect = false;
        }
      });
    }
    
    newOptions[index] = { ...newOptions[index], [field]: value };
    setNewQuestion({
      ...newQuestion,
      options: newOptions
    });
  };

  const handleCreateQuestion = async () => {
    if (!quizId) {
      showAlert('Erro', 'Quiz inválido', 'error');
      return;
    }

    // Validações
    if (!newQuestion.questionText.trim()) {
      showAlert('Campo Obrigatório', 'O texto da pergunta é obrigatório', 'alert');
      return;
    }

    const validOptions = newQuestion.options.filter(opt => opt.optionText.trim() !== "");
    if (validOptions.length < 2) {
      showAlert('Opções Insuficientes', 'A pergunta deve ter pelo menos 2 opções válidas', 'alert');
      return;
    }

    // Para multiple_choice e true_false, pelo menos uma deve ser correta
    if (newQuestion.typeId !== "3" && !validOptions.some(opt => opt.isCorrect)) {
      showAlert('Resposta Correta', 'Pelo menos uma opção deve ser marcada como correta', 'alert');
      return;
    }

    // Para ordering, verificar se todas têm correctOrder
    if (newQuestion.typeId === "3") {
      const hasInvalidOrder = validOptions.some(opt => !opt.correctOrder);
      if (hasInvalidOrder) {
        showAlert('Ordem Inválida', 'Todas as opções de ordenação devem ter uma ordem definida', 'alert');
        return;
      }
    }

    try {
      setCreating(true);

      // 1. Criar a pergunta
      const questionPayload = {
        questionText: newQuestion.questionText,
        typeId: parseInt(newQuestion.typeId),
        options: validOptions.map(opt => ({
          optionText: opt.optionText,
          isCorrect: newQuestion.typeId === "3" ? null : opt.isCorrect,
          correctOrder: newQuestion.typeId === "3" ? opt.correctOrder : null
        }))
      };

      const createResponse = await axios.post(
        `${apiBaseUrl}/api/Questions`,
        questionPayload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const createdQuestion = createResponse.data;

      // 2. Adicionar a pergunta ao quiz
      const nextOrder = questions.length + 1;
      await axios.post(
        `${apiBaseUrl}/api/Quizzes/${quizId}/questions/add`,
        {
          questionId: createdQuestion.id,
          order: nextOrder
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // 3. Atualizar lista de perguntas
      setQuestions(prev => [...prev, {
        id: createdQuestion.id,
        text: newQuestion.questionText.trim(),
        type: createdQuestion.type ?? "Pergunta"
      }]);

      handleCloseAddModal();
      showAlert('Sucesso', 'Pergunta adicionada ao quiz!', 'success');

    } catch (err) {
      console.error('[handleCreateQuestion] Erro crítico:', err);
      if (axios.isAxiosError(err)) {
        const message = typeof err.response?.data === "string"
          ? err.response.data
          : "Erro ao criar pergunta";
        showAlert('Erro', message, 'error');
      } else {
        showAlert('Erro', 'Erro ao criar pergunta', 'error');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-purple-800 via-indigo-800 to-pink-800 text-white">
      <div className="flex min-h-screen w-full flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <header className="rounded-3xl border border-white/30 bg-gradient-to-br from-white/15 to-white/5 p-8 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-purple-200/70 font-bold">
                Criar quiz
              </p>
              <h1 className="mt-3 text-3xl font-black sm:text-4xl bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                {quizTitle || "Novo quiz"}
              </h1>
              <p className="mt-3 text-base text-white/80 sm:text-lg leading-relaxed">
                {quizDescription || "Passo 2 de 2: adiciona perguntas"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="rounded-2xl border-2 border-white/40 px-6 py-3 text-sm font-bold transition-all duration-300 hover:bg-white/15 hover:scale-105"
              >
                Guardar e sair
              </button>
            </div>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          {/* Seção de informação */}
          <section className="rounded-3xl border border-white/30 bg-gradient-to-br from-white/15 to-white/5 p-8 backdrop-blur-xl shadow-2xl">
            <div className="text-center space-y-6">
              <div className="inline-flex p-6 rounded-full bg-gradient-to-br from-purple-400/30 to-pink-400/30">
                <svg className="h-20 w-20 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-black text-white mb-3">Adiciona Perguntas ao Quiz</h2>
                <p className="text-base text-white/70 leading-relaxed max-w-md mx-auto">
                  Clica no botão abaixo para adicionar uma nova pergunta ao teu quiz. Podes escolher entre diferentes tipos de perguntas.
                </p>
              </div>
              <button
                onClick={handleAddNewQuestion}
                className="rounded-2xl border border-emerald-300/50 bg-gradient-to-r from-emerald-400/30 to-emerald-600/30 px-8 py-4 text-base font-bold text-emerald-50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/30 flex items-center gap-3 mx-auto"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Adicionar Nova Pergunta
              </button>
            </div>
          </section>

          {/* Lista de perguntas */}
          <aside className="rounded-3xl border border-white/30 bg-gradient-to-br from-white/15 to-white/5 p-6 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Perguntas adicionadas</h3>
                <p className="text-sm text-white/70">
                  Organiza antes de publicar
                </p>
              </div>
              <span className="rounded-2xl border border-purple-300/40 bg-gradient-to-br from-purple-400/30 to-purple-600/20 px-4 py-2 text-sm font-bold shadow-lg">
                {questions.length}
              </span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {questions.length === 0 ? (
                <div className="rounded-2xl border border-white/20 bg-white/5 px-6 py-8 text-center">
                  <p className="text-sm text-white/60">Ainda não adicionaste perguntas.</p>
                </div>
              ) : (
                questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="rounded-2xl border border-white/20 bg-gradient-to-r from-white/10 to-white/5 px-5 py-4 hover:bg-white/15 transition-all duration-300 hover:scale-[1.02] shadow-md"
                  >
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <span className="rounded-xl border border-purple-300/40 bg-purple-400/20 px-3 py-1 text-xs font-bold">
                        #{index + 1}
                      </span>
                      <span className="text-xs text-white/60 bg-white/10 px-3 py-1 rounded-lg">
                        {question.type}
                      </span>
                    </div>
                    <p className="text-sm text-white/90 leading-relaxed line-clamp-2">
                      {question.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </aside>
        </main>
      </div>

      {/* Modal Adicionar Pergunta */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-purple-900/95 to-indigo-900/95 rounded-3xl border border-white/30 p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-white">Adicionar Nova Pergunta</h2>
              <button
                onClick={handleCloseAddModal}
                className="rounded-xl p-2 hover:bg-white/10 transition-all"
                disabled={creating}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Tipo de Pergunta */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-white/90 uppercase tracking-wide">
                  Tipo de Pergunta
                </label>
                <select
                  value={newQuestion.typeId}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full rounded-2xl bg-white/25 border-2 border-white/30 px-5 py-4 text-white focus:outline-none focus:ring-4 focus:ring-yellow-300/50 transition-all"
                  disabled={creating}
                >
                  {types.map((type) => (
                    <option key={type.id} value={type.id} className="bg-purple-900">
                      if(type.id === 1) Multiple Choice
                      {type.name}
                      else if(type.id === 2) Verdadeiro/Falso
                      else if(type.id === 3) Ordenação
                    </option>
                  ))}
                </select>
              </div>

              {/* Texto da Pergunta */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-white/90 uppercase tracking-wide">
                  Texto da Pergunta
                </label>
                <textarea
                  value={newQuestion.questionText}
                  onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                  rows={3}
                  className="w-full rounded-2xl bg-white/25 border-2 border-white/30 px-5 py-4 text-white placeholder-white/60 focus:outline-none focus:ring-4 focus:ring-yellow-300/50 transition-all"
                  placeholder="Escreve o texto da pergunta..."
                  disabled={creating}
                />
              </div>

              {/* Opções */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white/90 uppercase tracking-wide">
                    Opções de Resposta
                  </label>
                  {newQuestion.typeId !== "2" && (
                    <button
                      onClick={handleAddOptionToNew}
                      className="rounded-xl border border-emerald-300/50 bg-emerald-400/20 px-4 py-2 text-sm font-bold text-emerald-50 hover:bg-emerald-400/30 transition-all flex items-center gap-2"
                      disabled={creating}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Adicionar Opção
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {newQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-5 py-4">
                      {newQuestion.typeId === "3" ? (
                        // Ordenação
                        <>
                          <input
                            type="number"
                            min={1}
                            value={option.correctOrder || index + 1}
                            onChange={(e) => handleNewOptionChange(index, "correctOrder", parseInt(e.target.value))}
                            className="w-20 rounded-xl bg-white/25 border-2 border-white/30 px-3 py-2 text-white text-center font-bold focus:outline-none focus:ring-2 focus:ring-yellow-300/50"
                            disabled={creating}
                          />
                          <input
                            type="text"
                            value={option.optionText}
                            onChange={(e) => handleNewOptionChange(index, "optionText", e.target.value)}
                            className="flex-1 rounded-xl bg-white/25 border-2 border-white/30 px-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-300/50"
                            placeholder={`Item ${index + 1}`}
                            disabled={creating}
                          />
                        </>
                      ) : (
                        // Multiple Choice ou True/False
                        <>
                          <input
                            type="radio"
                            name="correct-option"
                            checked={option.isCorrect}
                            onChange={(e) => handleNewOptionChange(index, "isCorrect", e.target.checked)}
                            className="h-5 w-5 cursor-pointer accent-yellow-400"
                            disabled={creating}
                          />
                          <input
                            type="text"
                            value={option.optionText}
                            onChange={(e) => handleNewOptionChange(index, "optionText", e.target.value)}
                            className="flex-1 rounded-xl bg-white/25 border-2 border-white/30 px-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-yellow-300/50 disabled:opacity-60 disabled:cursor-not-allowed"
                            placeholder={`Opção ${index + 1}`}
                            disabled={creating || newQuestion.typeId === "2"}
                          />
                        </>
                      )}
                      {newQuestion.typeId !== "2" && newQuestion.options.length > 2 && (
                        <button
                          onClick={() => handleRemoveOptionFromNew(index)}
                          className="rounded-xl border border-red-300/50 bg-red-400/20 px-3 py-2 text-red-50 hover:bg-red-400/30 transition-all"
                          disabled={creating}
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {newQuestion.typeId === "2" && (
                  <p className="text-xs text-white/70 italic bg-white/5 rounded-xl px-4 py-2 border border-white/20 flex items-center gap-2">
                    <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Perguntas Verdadeiro/Falso têm opções fixas. Seleciona a resposta correta clicando no círculo.
                  </p>
                )}
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4 border-t border-white/20">
                <button
                  onClick={handleCloseAddModal}
                  className="flex-1 rounded-2xl border-2 border-white/40 px-6 py-3 font-bold hover:bg-white/10 transition-all"
                  disabled={creating}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateQuestion}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 px-6 py-3 font-bold text-white shadow-xl hover:scale-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Criando...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Criar Pergunta
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação/Alerta */}
      <ConfirmModal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText="OK"
        cancelText="Cancelar"
        onConfirm={modalState.onConfirm}
        onCancel={() => setModalState(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default QuizEditorPage;
