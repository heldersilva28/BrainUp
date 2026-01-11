import type { FC } from "react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useAuthGuard } from "../hooks/useAuthGuard";

interface QuestionType {
  id: number;
  name: string;
}

interface QuestionSummary {
  id: string;
  text: string;
  type: string;
}

const emptyOptions = () =>
  Array.from({ length: 4 }).map(() => ({ text: "", isCorrect: false }));

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
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [multiOptions, setMultiOptions] = useState(emptyOptions());
  const [trueFalseCorrect, setTrueFalseCorrect] = useState<"true" | "false">(
    "true"
  );
  const [orderingOptions, setOrderingOptions] = useState(
    Array.from({ length: 4 }).map((_, index) => ({
      text: "",
      order: index + 1,
    }))
  );
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedTypeName = useMemo(() => {
    return (
      types.find((type) => type.id === selectedTypeId)?.name?.toLowerCase() ??
      ""
    );
  }, [types, selectedTypeId]);

  const isOrdering =
    selectedTypeName.includes("order") || selectedTypeName.includes("ordem");
  const isTrueFalse =
    selectedTypeName.includes("true") ||
    selectedTypeName.includes("false") ||
    selectedTypeName.includes("verdad");

  const token = sessionStorage.getItem("brainup_token");

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
    if (!selectedTypeId && types.length > 0) {
      setSelectedTypeId(types[0].id);
    }
  }, [types, selectedTypeId]);

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

  const handleSaveQuestion = async () => {
    if (!quizId) {
      setError("Quiz invalido.");
      return;
    }
    if (!token) {
      setError("Sessao expirada. Faz login novamente.");
      return;
    }
    if (!questionText.trim()) {
      setError("Escreve o texto da pergunta.");
      return;
    }
    if (!selectedTypeId) {
      setError("Seleciona o tipo de pergunta.");
      return;
    }

    setError(null);
    setNotice(null);
    setIsSaving(true);

    try {
      let options: {
        optionText: string;
        isCorrect?: boolean;
        correctOrder?: number;
      }[] = [];

      if (isTrueFalse) {
        options = [
          { optionText: "Verdadeiro", isCorrect: trueFalseCorrect === "true" },
          { optionText: "Falso", isCorrect: trueFalseCorrect === "false" },
        ];
      } else if (isOrdering) {
        const hasEmpty = orderingOptions.some((opt) => !opt.text.trim());
        if (hasEmpty) {
          setError("Preenche todos os itens da ordem.");
          setIsSaving(false);
          return;
        }
        options = orderingOptions.map((opt) => ({
          optionText: opt.text.trim(),
          correctOrder: opt.order,
        }));
      } else {
        const hasEmpty = multiOptions.some((opt) => !opt.text.trim());
        if (hasEmpty) {
          setError("Preenche todas as opcoes.");
          setIsSaving(false);
          return;
        }
        if (!multiOptions.some((opt) => opt.isCorrect)) {
          setError("Escolhe a resposta correta.");
          setIsSaving(false);
          return;
        }
        options = multiOptions.map((opt) => ({
          optionText: opt.text.trim(),
          isCorrect: opt.isCorrect,
        }));
      }

      const questionResponse = await axios.post(
        `${apiBaseUrl}/api/Questions`,
        {
          questionText: questionText.trim(),
          typeId: selectedTypeId,
          options,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const questionId = questionResponse.data?.id;
      if (!questionId) {
        setError("Nao foi possivel criar a pergunta.");
        return;
      }

      await axios.post(
        `${apiBaseUrl}/api/Quizzes/${quizId}/questions/add`,
        {
          questionId,
          order: questions.length + 1,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setQuestions((prev) => [
        ...prev,
        {
          id: questionId,
          text: questionText.trim(),
          type: questionResponse.data?.type ?? "Pergunta",
        },
      ]);
      setQuestionText("");
      setMultiOptions(emptyOptions());
      setTrueFalseCorrect("true");
      setOrderingOptions(
        Array.from({ length: 4 }).map((_, index) => ({
          text: "",
          order: index + 1,
        }))
      );
      setNotice("Pergunta adicionada ao quiz.");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message =
          typeof err.response?.data === "string"
            ? err.response.data
            : "Erro ao guardar pergunta.";
        setError(message);
      } else {
        setError("Erro ao guardar pergunta.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 text-white">
      <div className="flex min-h-screen w-full flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-md shadow-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                Criar quiz
              </p>
              <h1 className="mt-2 text-2xl font-black sm:text-3xl">
                {quizTitle || "Novo quiz"}
              </h1>
              <p className="mt-2 text-sm text-white/70 sm:text-base">
                {quizDescription || "Passo 2 de 2: adiciona perguntas"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
              >
                Guardar e sair
              </button>
            </div>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Nova pergunta</h2>
                <p className="text-sm text-white/70">
                  Define o tipo e as respostas corretas.
                </p>
              </div>
              <div className="rounded-xl border border-white/30 px-3 py-1 text-xs">
                Passo 2/2
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-300/40 bg-red-300/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}
            {notice && (
              <div className="mt-4 rounded-2xl border border-emerald-300/40 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
                {notice}
              </div>
            )}

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/80">
                  Tipo de pergunta
                </label>
                <select
                  value={selectedTypeId ?? ""}
                  onChange={(event) => setSelectedTypeId(Number(event.target.value))}
                  className="w-full rounded-2xl bg-white/20 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
                >
                  {types.map((type) => (
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
                  value={questionText}
                  onChange={(event) => setQuestionText(event.target.value)}
                  rows={3}
                  className="w-full rounded-2xl bg-white/20 px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  placeholder="Escreve a pergunta principal"
                />
              </div>

              {!isOrdering && !isTrueFalse && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-white/80">
                    Opcoes (marca a correta)
                  </p>
                  {multiOptions.map((option, index) => (
                    <div
                      key={`multi-${index}`}
                      className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3"
                    >
                      <input
                        type="radio"
                        name="multi-correct"
                        checked={option.isCorrect}
                        onChange={() =>
                          setMultiOptions((prev) =>
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
                        value={option.text}
                        onChange={(event) =>
                          setMultiOptions((prev) =>
                            prev.map((opt, idx) =>
                              idx === index ? { ...opt, text: event.target.value } : opt
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

              {isTrueFalse && (
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
                        name="true-false"
                        checked={trueFalseCorrect === value}
                        onChange={() => setTrueFalseCorrect(value as "true" | "false")}
                        className="h-4 w-4"
                      />
                      <span>{value === "true" ? "Verdadeiro" : "Falso"}</span>
                    </label>
                  ))}
                </div>
              )}

              {isOrdering && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-white/80">
                    Itens por ordem correta
                  </p>
                  {orderingOptions.map((option, index) => (
                    <div
                      key={`order-${index}`}
                      className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3"
                    >
                      <input
                        type="number"
                        min={1}
                        max={orderingOptions.length}
                        value={option.order}
                        onChange={(event) =>
                          setOrderingOptions((prev) =>
                            prev.map((opt, idx) =>
                              idx === index
                                ? { ...opt, order: Number(event.target.value) || 1 }
                                : opt
                            )
                          )
                        }
                        className="w-16 rounded-xl bg-white/20 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
                      />
                      <input
                        type="text"
                        value={option.text}
                        onChange={(event) =>
                          setOrderingOptions((prev) =>
                            prev.map((opt, idx) =>
                              idx === index ? { ...opt, text: event.target.value } : opt
                            )
                          )
                        }
                        className="flex-1 rounded-xl bg-white/20 px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                        placeholder={`Item ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white/70">
                  Perguntas guardadas: {questions.length}
                </div>
                <button
                  type="button"
                  onClick={handleSaveQuestion}
                  disabled={isSaving}
                  className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "A guardar..." : "Adicionar pergunta"}
                </button>
              </div>
            </div>
          </section>

          <aside className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Perguntas adicionadas</h3>
                <p className="text-sm text-white/70">
                  Organiza antes de publicar.
                </p>
              </div>
              <span className="rounded-xl border border-white/30 px-3 py-1 text-xs">
                {questions.length}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {questions.length === 0 ? (
                <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-sm text-white/60">
                  Ainda nao adicionaste perguntas.
                </div>
              ) : (
                questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs">
                        {index + 1}
                      </span>
                      <span className="text-xs text-white/60">{question.type}</span>
                    </div>
                    <p className="mt-2 text-sm text-white/80">
                      {question.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-4 text-xs text-white/70">
              ...
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default QuizEditorPage;
