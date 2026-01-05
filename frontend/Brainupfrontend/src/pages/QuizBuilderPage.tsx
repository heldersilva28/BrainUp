import type { FC } from "react";
import { useState } from "react";

const QuizBuilderPage: FC = () => {
  const [questionIndex, setQuestionIndex] = useState(0);
  const totalQuestions = 3;
  const progressPercent = ((questionIndex + 1) / totalQuestions) * 100;
  const isFirst = questionIndex === 0;
  const isLast = questionIndex === totalQuestions - 1;
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 text-white">
      <div className="flex min-h-screen w-full flex-col gap-4 px-4 py-6">
        <header className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-md shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-white/60">
                BrainUp
              </div>
              <h1 className="text-2xl font-black">Historia moderna - Nivel medio</h1>
              
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/30 bg-white/10 px-4 py-2 text-sm">
                Pergunta {questionIndex + 1}/{totalQuestions}
              </div>
              <div className="rounded-2xl bg-white/20 px-4 py-2 text-sm font-semibold">
                12:45
              </div>
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center pb-10">
          <div className="w-full max-w-5xl mx-auto flex h-[520px] flex-col rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-md shadow-2xl">
            {questionIndex === 0 && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold leading-snug">
                      Qual foi o ano do fim da Segunda Guerra Mundial?
                    </h2>
                    <p className="text-lg text-white/70 mt-2">
                      Escolhe a resposta correta
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/30 px-4 py-2 text-sm">
                    20 pts
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    { id: "q1-a", label: "1944" },
                    { id: "q1-b", label: "1945", checked: true },
                    { id: "q1-c", label: "1946" },
                    { id: "q1-d", label: "1950" },
                  ].map((option) => (
                    <div key={option.id} className="relative">
                      <input
                        id={option.id}
                        type="radio"
                        name="q1"
                        defaultChecked={option.checked}
                        className="peer sr-only"
                      />
                      <label
                        htmlFor={option.id}
                        className="relative flex cursor-pointer items-center rounded-xl border border-white/15 bg-white/5 px-6 py-5 pl-14 text-lg text-white/80 transition before:absolute before:left-5 before:top-[52%] before:h-6 before:w-6 before:-translate-y-1/2 before:rounded-full before:border-2 before:border-white/40 before:bg-white/5 after:absolute after:left-[1.63rem] after:top-[52%] after:h-3 after:w-3 after:-translate-y-1/2 after:rounded-full after:bg-white/90 after:opacity-0 peer-checked:border-white/50 peer-checked:bg-white/20 peer-checked:text-white peer-checked:after:opacity-100"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </>
            )}

            {questionIndex === 1 && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold leading-snug">
                      A Revolucao Francesa comecou em 1789.
                    </h2>
                    <p className="text-lg text-white/70 mt-2">
                      Seleciona a opcao correta
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/30 px-4 py-2 text-sm">
                    10 pts
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    { id: "q2-true", label: "Verdadeiro", checked: true },
                    { id: "q2-false", label: "Falso" },
                  ].map((option) => (
                    <div key={option.id} className="relative">
                      <input
                        id={option.id}
                        type="radio"
                        name="q2"
                        defaultChecked={option.checked}
                        className="peer sr-only"
                      />
                      <label
                        htmlFor={option.id}
                        className="relative flex cursor-pointer items-center rounded-xl border border-white/15 bg-white/5 px-6 py-5 pl-14 text-lg text-white/80 transition before:absolute before:left-5 before:top-[52%] before:h-6 before:w-6 before:-translate-y-1/2 before:rounded-full before:border-2 before:border-white/40 before:bg-white/5 after:absolute after:left-[1.63rem] after:top-[52%] after:h-3 after:w-3 after:-translate-y-1/2 after:rounded-full after:bg-white/90 after:opacity-0 peer-checked:border-white/50 peer-checked:bg-white/20 peer-checked:text-white peer-checked:after:opacity-100"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </>
            )}

            {questionIndex === 2 && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold leading-snug">
                      Indica a ordem correta
                    </h2>
                    
                  </div>
                  <div className="rounded-xl border border-white/30 px-4 py-2 text-sm">
                    30 pts
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-white/10 px-6 py-4 text-lg">
                  Escreve 1-4 para ordenar os eventos:
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {[
                    "Descoberta do Brasil",
                    "Revolucao Industrial",
                    "Primeira Guerra Mundial",
                    "Chegada do Homem a Lua",
                  ].map((item, index) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 px-6 py-5 text-lg"
                    >
                      <div className="flex items-center gap-4">
                        <input
                          type="number"
                          min={1}
                          max={4}
                          placeholder={`${index + 1}`}
                          className="h-14 w-16 rounded-lg border-2 border-white/30 bg-white/10 text-center text-lg text-white placeholder-white/40 [text-indent:0.9rem] focus:outline-none focus:ring-2 focus:ring-yellow-300"
                        />
                        <span className="text-white/80">{item}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
              <button
                type="button"
                onClick={() => setQuestionIndex((prev) => Math.max(0, prev - 1))}
                disabled={isFirst}
                className="rounded-2xl border border-white/30 px-6 py-3 text-base font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <div className="text-sm text-white/60">
                As respostas sao guardadas automaticamente
              </div>
              <button
                type="button"
                onClick={() =>
                  setQuestionIndex((prev) =>
                    Math.min(totalQuestions - 1, prev + 1)
                  )
                }
                disabled={isLast}
                className="rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Proxima pergunta
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default QuizBuilderPage;
