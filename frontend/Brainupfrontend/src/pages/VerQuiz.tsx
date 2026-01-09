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

const VerQuiz: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quizId = searchParams.get("quizId");

  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

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

  useEffect(() => {
    if (!quizId) {
      setError("Quiz ID não fornecido");
      setLoading(false);
      return;
    }

    fetchQuizData();
  }, [quizId]);

  const fetchQuizData = async () => {
    try {
      setLoading(true);

      // Fetch quiz details
      const quizRes = await authFetch(`${apiBaseUrl}/api/Quizzes/${quizId}`);
      if (!quizRes.ok) {
        throw new Error("Erro ao carregar quiz");
      }
      const quizData: QuizDetails = await quizRes.json();
      setQuiz(quizData);

      // Fetch questions for this quiz
      // Try one of these endpoints based on your backend API:
      // Option 1: /api/Questions/quiz/${quizId}
      // Option 2: /api/Quizzes/${quizId}/Questions (capital Q)
      // Option 3: /api/Questions?quizId=${quizId}
      const questionsRes = await authFetch(
        `${apiBaseUrl}/api/Questions/quiz/${quizId}` // Update this endpoint
      );
      if (!questionsRes.ok) {
        // If questions endpoint fails, still show the quiz with empty questions
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

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case "multiple_choice": return "Escolha Múltipla";
      case "true_false": return "Verdadeiro/Falso";
      case "ordering": return "Ordenação";
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 flex items-center justify-center">
        <div className="text-white text-xl">A carregar quiz...</div>
      </div>
    );
  }

  if (error || !quiz) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
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
            <div className="flex gap-4 text-sm text-white/60">
              <span>{questions.length} {questions.length === 1 ? "pergunta" : "perguntas"}</span>
              <span>•</span>
              <span>Criado em {new Date(quiz.createdAt).toLocaleDateString("pt-PT")}</span>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          {questions.length === 0 ? (
            <div className="rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-md shadow-2xl text-center">
              <p className="text-white/70">Este quiz ainda não tem perguntas.</p>
            </div>
          ) : (
            questions.map((question, index) => (
              <div
                key={question.id}
                className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl"
              >
                {/* Question Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{question.questionText}</h3>
                      <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/40">
                        {getQuestionTypeLabel(question.type)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Options */}
                <div className="ml-14 space-y-2">
                  {question.options.map((option, optIndex) => (
                    <div
                      key={option.id}
                      className={`rounded-xl p-4 transition ${
                        option.isCorrect
                          ? "bg-green-500/20 border border-green-400/40"
                          : "bg-white/5 border border-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          option.isCorrect ? "bg-green-500/40 text-green-200" : "bg-white/10"
                        }`}>
                          {String.fromCharCode(65 + optIndex)}
                        </div>
                        <p className="flex-1">{option.optionText}</p>
                        {option.isCorrect && question.type !== "ordering" && (
                          <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        {question.type === "ordering" && option.correctOrder !== undefined && (
                          <span className="text-xs px-2 py-1 rounded bg-blue-500/30 text-blue-200">
                            Ordem correta: {option.correctOrder}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default VerQuiz;
