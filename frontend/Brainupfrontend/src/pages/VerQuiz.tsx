import type { FC } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthGuard } from "../hooks/useAuthGuard";

interface QuestionOption {
  id?: string;
  optionText: string;
  isCorrect?: boolean;
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

interface QuestionType {
  id: number;
  name: string;
}

interface EditState {
  id: string;
  type: string;
  questionText: string;
  options: QuestionOption[];
}

const createEmptyOptions = () =>
  Array.from({ length: 4 }).map(() => ({
    optionText: "",
    isCorrect: false,
  }));

const createEmptyOrdering = () =>
  Array.from({ length: 4 }).map((_, index) => ({
    optionText: "",
    correctOrder: index + 1,
  }));

const VerQuiz: FC = () => {
  const navigate = useNavigate();
  useAuthGuard();
  const [searchParams] = useSearchParams();
  const quizId = searchParams.get("quizId");

  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [notice, setNotice] = useState<string>("");

  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionTypeId, setNewQuestionTypeId] = useState<number | null>(null);
  const [newOptions, setNewOptions] = useState<QuestionOption[]>(
    createEmptyOptions()
  );
  const [newOrderingOptions, setNewOrderingOptions] =
    useState<QuestionOption[]>(createEmptyOrdering());
  const [newTrueFalseCorrect, setNewTrueFalseCorrect] = useState<
    "true" | "false"
  >("true");
  const [addingQuestion, setAddingQuestion] = useState(false);

  const [editState, setEditState] = useState<EditState | null>(null);
  const [editTrueFalseCorrect, setEditTrueFalseCorrect] = useState<
    "true" | "false"
  >("true");
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5027";

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

  const selectedTypeName = useMemo(() => {
    if (!newQuestionTypeId) return "";
    return (
      questionTypes.find((type) => type.id === newQuestionTypeId)?.name || ""
    );
  }, [newQuestionTypeId, questionTypes]);

  const isOrderingType = (type: string) => {
    const normalized = type.toLowerCase();
    return normalized.includes("order") || normalized.includes("ordem");
  };

  const isTrueFalseType = (type: string) => {
    const normalized = type.toLowerCase();
    return normalized.includes("true") || normalized.includes("false");
  };

  const getQuestionTypeLabel = (type: string) => {
    const normalized = type.toLowerCase();
    if (normalized.includes("multiple")) return "Escolha Multipla";
    if (normalized.includes("true") || normalized.includes("false")) {
      return "Verdadeiro/Falso";
    }
    if (normalized.includes("order")) return "Ordenacao";
    return type;
  };

  useEffect(() => {
    if (!quizId) {
      setError("Quiz ID nao fornecido");
      setLoading(false);
      return;
    }

    fetchQuizData();
  }, [quizId]);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/QuestionTypes`);
        if (!res.ok) return;
        const data: QuestionType[] = await res.json();
        setQuestionTypes(data);
        if (!newQuestionTypeId && data.length > 0) {
          setNewQuestionTypeId(data[0].id);
        }
      } catch (err) {
        console.error("Erro ao carregar tipos:", err);
      }
    };

    fetchTypes();
  }, [apiBaseUrl, newQuestionTypeId]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);

      const quizRes = await authFetch(`${apiBaseUrl}/api/Quizzes/${quizId}`);
      if (!quizRes.ok) {
        throw new Error("Erro ao carregar quiz");
      }
      const quizData: QuizDetails = await quizRes.json();
      setQuiz(quizData);

      const questionsRes = await authFetch(
        `${apiBaseUrl}/api/Questions/quiz/${quizId}`
      );
      if (!questionsRes.ok) {
        console.warn("Erro ao carregar perguntas:", questionsRes.status);
        setQuestions([]);
        return;
      }
      const questionsData: Question[] = await questionsRes.json();
      setQuestions(questionsData);
    } catch (err) {
      console.error("Erro ao carregar dados do quiz:", err);
      setError("Erro ao carregar dados do quiz. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  };

  const reorderQuestions = async (nextQuestions: Question[]) => {
    if (!quizId) return;
    setQuestions(nextQuestions);

    const items = nextQuestions.map((question, index) => ({
      questionId: question.id,
      order: index + 1,
    }));

    try {
      await authFetch(`${apiBaseUrl}/api/Quizzes/${quizId}/questions/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } catch (err) {
      console.error("Erro ao reordenar perguntas:", err);
    }
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= questions.length) return;
    const nextQuestions = [...questions];
    const [moved] = nextQuestions.splice(index, 1);
    nextQuestions.splice(nextIndex, 0, moved);
    reorderQuestions(nextQuestions);
  };

  const removeQuestion = async (questionId: string) => {
    if (!quizId) return;
    try {
      const res = await authFetch(
        `${apiBaseUrl}/api/Quizzes/${quizId}/questions/${questionId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Erro ao remover pergunta");
      const nextQuestions = questions.filter((q) => q.id !== questionId);
      await reorderQuestions(nextQuestions);
    } catch (err) {
      console.error("Erro ao remover pergunta:", err);
      setError("Erro ao remover pergunta.");
    }
  };

  const handleAddQuestion = async () => {
    if (!quizId) return;
    if (!newQuestionText.trim()) {
      setError("Escreve o texto da pergunta.");
      return;
    }
    if (!newQuestionTypeId) {
      setError("Seleciona o tipo de pergunta.");
      return;
    }

    setError("");
    setNotice("");
    setAddingQuestion(true);

    const newTypeName =
      questionTypes.find((type) => type.id === newQuestionTypeId)?.name || "";
    const isOrdering = isOrderingType(newTypeName);
    const isTrueFalse = isTrueFalseType(newTypeName);

    let options: QuestionOption[] = [];
    if (isTrueFalse) {
      options = [
        { optionText: "Verdadeiro", isCorrect: newTrueFalseCorrect === "true" },
        { optionText: "Falso", isCorrect: newTrueFalseCorrect === "false" },
      ];
    } else if (isOrdering) {
      if (newOrderingOptions.some((opt) => !opt.optionText.trim())) {
        setError("Preenche todos os itens.");
        setAddingQuestion(false);
        return;
      }
      options = newOrderingOptions.map((opt, index) => ({
        optionText: opt.optionText.trim(),
        correctOrder: index + 1,
      }));
    } else {
      if (newOptions.some((opt) => !opt.optionText.trim())) {
        setError("Preenche todas as opcoes.");
        setAddingQuestion(false);
        return;
      }
      if (!newOptions.some((opt) => opt.isCorrect)) {
        setError("Seleciona a opcao correta.");
        setAddingQuestion(false);
        return;
      }
      options = newOptions.map((opt) => ({
        optionText: opt.optionText.trim(),
        isCorrect: !!opt.isCorrect,
      }));
    }

    try {
      const questionRes = await authFetch(`${apiBaseUrl}/api/Questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: newQuestionText.trim(),
          typeId: newQuestionTypeId,
          options,
        }),
      });

      if (!questionRes.ok) throw new Error("Erro ao criar pergunta");
      const createdQuestion: Question = await questionRes.json();

      const addRes = await authFetch(
        `${apiBaseUrl}/api/Quizzes/${quizId}/questions/add`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: createdQuestion.id,
            order: questions.length + 1,
          }),
        }
      );
      if (!addRes.ok) throw new Error("Erro ao associar pergunta");

      setQuestions((prev) => [...prev, createdQuestion]);
      setNewQuestionText("");
      setNewOptions(createEmptyOptions());
      setNewOrderingOptions(createEmptyOrdering());
      setNewTrueFalseCorrect("true");
      setNotice("Pergunta adicionada.");
    } catch (err) {
      console.error("Erro ao adicionar pergunta:", err);
      setError("Erro ao adicionar pergunta.");
    } finally {
      setAddingQuestion(false);
    }
  };

  const startEditQuestion = (question: Question) => {
    setEditState({
      id: question.id,
      type: question.type,
      questionText: question.questionText,
      options: question.options.map((opt) => ({ ...opt })),
    });
    if (isTrueFalseType(question.type)) {
      const correct = question.options.find((opt) => opt.isCorrect);
      setEditTrueFalseCorrect(correct?.optionText === "Falso" ? "false" : "true");
    }
  };

  const cancelEditQuestion = () => {
    setEditState(null);
    setSavingQuestionId(null);
    setError("");
  };

  const updateEditOption = (index: number, value: Partial<QuestionOption>) => {
    if (!editState) return;
    setEditState({
      ...editState,
      options: editState.options.map((opt, idx) =>
        idx === index ? { ...opt, ...value } : opt
      ),
    });
  };

  const moveEditOption = (index: number, direction: "up" | "down") => {
    if (!editState) return;
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= editState.options.length) return;
    const nextOptions = [...editState.options];
    const [moved] = nextOptions.splice(index, 1);
    nextOptions.splice(nextIndex, 0, moved);
    const adjusted = isOrderingType(editState.type)
      ? nextOptions.map((opt, idx) => ({ ...opt, correctOrder: idx + 1 }))
      : nextOptions;
    setEditState({ ...editState, options: adjusted });
  };

  const addEditOption = () => {
    if (!editState) return;
    const nextOptions = [
      ...editState.options,
      { optionText: "", isCorrect: false },
    ];
    setEditState({ ...editState, options: nextOptions });
  };

  const removeEditOption = (index: number) => {
    if (!editState) return;
    if (editState.options.length <= 2) return;
    const nextOptions = editState.options.filter((_, idx) => idx !== index);
    setEditState({ ...editState, options: nextOptions });
  };

  const saveEditQuestion = async () => {
    if (!editState) return;
    if (!editState.questionText.trim()) {
      setError("A pergunta nao pode ficar vazia.");
      return;
    }

    setSavingQuestionId(editState.id);
    setError("");
    setNotice("");

    let options: QuestionOption[] = [];
    if (isTrueFalseType(editState.type)) {
      options = [
        { optionText: "Verdadeiro", isCorrect: editTrueFalseCorrect === "true" },
        { optionText: "Falso", isCorrect: editTrueFalseCorrect === "false" },
      ];
    } else if (isOrderingType(editState.type)) {
      options = editState.options.map((opt, index) => ({
        optionText: opt.optionText.trim(),
        correctOrder: index + 1,
      }));
    } else {
      if (!editState.options.some((opt) => opt.isCorrect)) {
        setError("Seleciona a opcao correta.");
        setSavingQuestionId(null);
        return;
      }
      options = editState.options.map((opt) => ({
        optionText: opt.optionText.trim(),
        isCorrect: !!opt.isCorrect,
      }));
    }

    try {
      const res = await authFetch(
        `${apiBaseUrl}/api/Questions/${editState.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionText: editState.questionText.trim(),
            options,
          }),
        }
      );
      if (!res.ok) throw new Error("Erro ao atualizar pergunta");

      const updated: Question = await res.json();
      setQuestions((prev) =>
        prev.map((question) =>
          question.id === updated.id ? updated : question
        )
      );
      setEditState(null);
      setNotice("Pergunta atualizada.");
    } catch (err) {
      console.error("Erro ao atualizar pergunta:", err);
      setError("Erro ao atualizar pergunta.");
    } finally {
      setSavingQuestionId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 flex items-center justify-center">
        <div className="text-white text-xl">A carregar quiz...</div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">
            {error || "Quiz nao encontrado"}
          </div>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-white/80 hover:text-white transition mb-4"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar ao Dashboard
          </button>

          <div className="rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-md shadow-2xl">
            <h1 className="text-3xl font-bold mb-2">{quiz.title}</h1>
            {quiz.description && (
              <p className="text-white/80 mb-4">{quiz.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-white/60">
              <span>
                {questions.length} {questions.length === 1 ? "pergunta" : "perguntas"}
              </span>
              <span>-</span>
              <span>
                Criado em {new Date(quiz.createdAt).toLocaleDateString("pt-PT")}
              </span>
              <button
                type="button"
                onClick={() => setShowAddQuestion((prev) => !prev)}
                className="ml-auto rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30"
              >
                {showAddQuestion ? "Fechar" : "Adicionar pergunta"}
              </button>
            </div>
          </div>
        </div>

        {notice && (
          <div className="mb-6 rounded-2xl border border-emerald-300/40 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
            {notice}
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        {showAddQuestion && (
          <div className="mb-6 rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Nova pergunta</h2>
              <span className="rounded-xl border border-white/30 px-3 py-1 text-xs">
                Adicionar
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/80">
                  Tipo de pergunta
                </label>
                <select
                  value={newQuestionTypeId ?? ""}
                  onChange={(event) => setNewQuestionTypeId(Number(event.target.value))}
                  className="w-full rounded-2xl bg-white/20 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
                >
                  {questionTypes.map((type) => (
                    <option key={type.id} value={type.id} className="text-black">
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/80">
                  Texto da pergunta
                </label>
                <textarea
                  value={newQuestionText}
                  onChange={(event) => setNewQuestionText(event.target.value)}
                  rows={3}
                  className="w-full rounded-2xl bg-white/20 px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  placeholder="Escreve a pergunta principal"
                />
              </div>

              {isOrderingType(selectedTypeName) ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-white/80">
                    Itens da ordenacao
                  </p>
                  {newOrderingOptions.map((option, index) => (
                    <div
                      key={`new-order-${index}`}
                      className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3"
                    >
                      <span className="w-8 text-sm text-white/70">{index + 1}</span>
                      <input
                        type="text"
                        value={option.optionText}
                        onChange={(event) =>
                          setNewOrderingOptions((prev) =>
                            prev.map((opt, idx) =>
                              idx === index
                                ? { ...opt, optionText: event.target.value }
                                : opt
                            )
                          )
                        }
                        className="flex-1 rounded-xl bg-white/20 px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                        placeholder={`Item ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
              ) : isTrueFalseType(selectedTypeName) ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-white/80">
                    Resposta correta
                  </p>
                  {["true", "false"].map((value) => (
                    <label
                      key={value}
                      className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm"
                    >
                      <input
                        type="radio"
                        name="new-true-false"
                        checked={newTrueFalseCorrect === value}
                        onChange={() =>
                          setNewTrueFalseCorrect(value as "true" | "false")
                        }
                        className="h-4 w-4"
                      />
                      <span>{value === "true" ? "Verdadeiro" : "Falso"}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-white/80">
                    Opcoes (marca a correta)
                  </p>
                  {newOptions.map((option, index) => (
                    <div
                      key={`new-option-${index}`}
                      className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3"
                    >
                      <input
                        type="radio"
                        name="new-correct"
                        checked={option.isCorrect}
                        onChange={() =>
                          setNewOptions((prev) =>
                            prev.map((opt, idx) => ({
                              ...opt,
                              isCorrect: idx === index,
                            }))
                          )
                        }
                        className="h-4 w-4"
                      />
                      <input
                        type="text"
                        value={option.optionText}
                        onChange={(event) =>
                          setNewOptions((prev) =>
                            prev.map((opt, idx) =>
                              idx === index
                                ? { ...opt, optionText: event.target.value }
                                : opt
                            )
                          )
                        }
                        className="flex-1 rounded-xl bg-white/20 px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                        placeholder={`Opcao ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white/70">
                  Total de perguntas: {questions.length}
                </div>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  disabled={addingQuestion}
                  className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {addingQuestion ? "A guardar..." : "Adicionar pergunta"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {questions.length === 0 ? (
            <div className="rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-md shadow-2xl text-center">
              <p className="text-white/70">Este quiz ainda nao tem perguntas.</p>
            </div>
          ) : (
            questions.map((question, index) => {
              const isEditing = editState?.id === question.id;
              return (
                <div
                  key={question.id}
                  className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{question.questionText}</h3>
                        <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/40">
                          {getQuestionTypeLabel(question.type)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => moveQuestion(index, "up")}
                        className="rounded-lg border border-white/20 px-3 py-1 text-xs hover:bg-white/10"
                      >Subir</button>
                      <button
                        type="button"
                        onClick={() => moveQuestion(index, "down")}
                        className="rounded-lg border border-white/20 px-3 py-1 text-xs hover:bg-white/10"
                      >Descer</button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-white/80">
                          Texto da pergunta
                        </label>
                        <textarea
                          value={editState?.questionText ?? ""}
                          onChange={(event) =>
                            setEditState((prev) =>
                              prev
                                ? { ...prev, questionText: event.target.value }
                                : prev
                            )
                          }
                          rows={3}
                          className="w-full rounded-2xl bg-white/20 px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                        />
                      </div>

                      {isTrueFalseType(question.type) ? (
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-white/80">
                            Resposta correta
                          </p>
                          {["true", "false"].map((value) => (
                            <label
                              key={value}
                              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm"
                            >
                              <input
                                type="radio"
                                name={`edit-true-false-${question.id}`}
                                checked={editTrueFalseCorrect === value}
                                onChange={() =>
                                  setEditTrueFalseCorrect(value as "true" | "false")
                                }
                                className="h-4 w-4"
                              />
                              <span>{value === "true" ? "Verdadeiro" : "Falso"}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-white/80">
                            Opcoes
                          </p>
                          {editState?.options.map((option, optIndex) => (
                            <div
                              key={`edit-${question.id}-${optIndex}`}
                              className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3"
                            >
                              {!isOrderingType(question.type) && (
                                <input
                                  type="radio"
                                  name={`edit-correct-${question.id}`}
                                  checked={!!option.isCorrect}
                                  onChange={() =>
                                    updateEditOption(optIndex, { isCorrect: true })
                                  }
                                  className="h-4 w-4"
                                />
                              )}
                              {isOrderingType(question.type) && (
                                <span className="text-xs text-white/60 w-6">
                                  {optIndex + 1}
                                </span>
                              )}
                              <input
                                type="text"
                                value={option.optionText}
                                onChange={(event) =>
                                  updateEditOption(optIndex, {
                                    optionText: event.target.value,
                                  })
                                }
                                className="flex-1 rounded-xl bg-white/20 px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                                placeholder={`Opcao ${optIndex + 1}`}
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => moveEditOption(optIndex, "up")}
                                  className="rounded-lg border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
                                >Subir</button>
                                <button
                                  type="button"
                                  onClick={() => moveEditOption(optIndex, "down")}
                                  className="rounded-lg border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
                                >Descer</button>
                                {!isOrderingType(question.type) && (
                                  <button
                                    type="button"
                                    onClick={() => removeEditOption(optIndex)}
                                    className="rounded-lg border border-red-400/40 px-2 py-1 text-xs text-red-200 hover:bg-red-400/20"
                                  >
                                    Remover
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                          {!isOrderingType(question.type) && (
                            <button
                              type="button"
                              onClick={addEditOption}
                              className="rounded-xl border border-white/30 px-4 py-2 text-xs font-semibold hover:bg-white/10"
                            >
                              Adicionar opcao
                            </button>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={saveEditQuestion}
                          disabled={savingQuestionId === question.id}
                          className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingQuestionId === question.id ? "A guardar..." : "Guardar"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditQuestion}
                          className="rounded-2xl border border-white/30 px-6 py-3 text-sm font-semibold transition hover:bg-white/10"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(question.id)}
                          className="rounded-2xl border border-red-400/40 px-6 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-400/20"
                        >
                          Remover do quiz
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="ml-14 space-y-2">
                        {question.options.map((option, optIndex) => (
                          <div
                            key={option.id ?? `${question.id}-opt-${optIndex}`}
                            className={`rounded-xl p-4 transition ${
                              option.isCorrect && !isOrderingType(question.type)
                                ? "bg-green-500/20 border border-green-400/40"
                                : "bg-white/5 border border-white/10"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                option.isCorrect && !isOrderingType(question.type)
                                  ? "bg-green-500/40 text-green-200"
                                  : "bg-white/10"
                              }`}>
                                {String.fromCharCode(65 + optIndex)}
                              </div>
                              <p className="flex-1">{option.optionText}</p>
                              {option.isCorrect && !isOrderingType(question.type) && (
                                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                              {isOrderingType(question.type) && option.correctOrder !== undefined && (
                                <span className="text-xs px-2 py-1 rounded bg-blue-500/30 text-blue-200">
                                  Ordem: {option.correctOrder}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => startEditQuestion(question)}
                          className="rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(question.id)}
                          className="rounded-2xl border border-red-400/40 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-400/20"
                        >
                          Remover do quiz
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default VerQuiz;
