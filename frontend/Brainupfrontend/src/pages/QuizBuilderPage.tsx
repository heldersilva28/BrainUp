import type { FC } from "react";
import { useRef, useState } from "react";

const QuizBuilderPage: FC = () => {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [orderingItems, setOrderingItems] = useState([
    "Descoberta do Brasil",
    "Revolucao Industrial",
    "Primeira Guerra Mundial",
    "Chegada do Homem a Lua",
  ]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const totalQuestions = 3;
  const progressPercent = ((questionIndex + 1) / totalQuestions) * 100;
  const isFirst = questionIndex === 0;
  const isLast = questionIndex === totalQuestions - 1;

  const moveOrderingItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) {
      return;
    }
    setOrderingItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
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
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 text-white">
      <div className="flex min-h-screen w-full flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-md shadow-2xl sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-white/60">
                BrainUp
              </div>
              <h1 className="text-xl font-black sm:text-2xl">
                Historia moderna - Nivel medio
              </h1>
              
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-white/30 bg-white/10 px-3 py-2 text-xs sm:px-4 sm:text-sm">
                Pergunta {questionIndex + 1}/{totalQuestions}
              </div>
              <div className="rounded-2xl bg-white/20 px-3 py-2 text-xs font-semibold sm:px-4 sm:text-sm">
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

        <main className="flex flex-1 items-center justify-center pb-8 sm:pb-10">
          <div className="mx-auto flex w-full max-w-5xl min-h-[520px] flex-col rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl sm:p-8 md:h-[520px]">
            {questionIndex === 0 && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold leading-snug sm:text-3xl">
                      Qual foi o ano do fim da Segunda Guerra Mundial?
                    </h2>
                    <p className="mt-2 text-base text-white/70 sm:text-lg">
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
                        className="relative flex cursor-pointer items-center rounded-xl border border-white/15 bg-white/5 px-5 py-4 pl-12 text-base text-white/80 transition before:absolute before:left-4 before:top-[52%] before:h-6 before:w-6 before:-translate-y-1/2 before:rounded-full before:border-2 before:border-white/40 before:bg-white/5 after:absolute after:left-[1.45rem] after:top-[52%] after:h-3 after:w-3 after:-translate-y-1/2 after:rounded-full after:bg-white/90 after:opacity-0 peer-checked:border-white/50 peer-checked:bg-white/20 peer-checked:text-white peer-checked:after:opacity-100 sm:px-6 sm:py-5 sm:pl-14 sm:text-lg sm:before:left-5 sm:after:left-[1.63rem]"
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
                    <h2 className="text-2xl font-bold leading-snug sm:text-3xl">
                      A Revolucao Francesa comecou em 1789.
                    </h2>
                    <p className="mt-2 text-base text-white/70 sm:text-lg">
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
                        className="relative flex cursor-pointer items-center rounded-xl border border-white/15 bg-white/5 px-5 py-4 pl-12 text-base text-white/80 transition before:absolute before:left-4 before:top-[52%] before:h-6 before:w-6 before:-translate-y-1/2 before:rounded-full before:border-2 before:border-white/40 before:bg-white/5 after:absolute after:left-[1.45rem] after:top-[52%] after:h-3 after:w-3 after:-translate-y-1/2 after:rounded-full after:bg-white/90 after:opacity-0 peer-checked:border-white/50 peer-checked:bg-white/20 peer-checked:text-white peer-checked:after:opacity-100 sm:px-6 sm:py-5 sm:pl-14 sm:text-lg sm:before:left-5 sm:after:left-[1.63rem]"
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
                    <h2 className="text-2xl font-bold leading-snug sm:text-3xl">
                      Indica a ordem correta
                    </h2>
                    
                  </div>
                  <div className="rounded-xl border border-white/30 px-4 py-2 text-sm">
                    30 pts
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-white/10 px-5 py-4 text-sm sm:px-6 sm:text-base">
                  Arrasta para ordenar os eventos:
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  {orderingItems.map((item, index) => (
                    <div
                      key={item}
                      data-order-index={index}
                      className={`flex items-center justify-between rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm transition sm:px-5 sm:py-4 sm:text-base touch-none ${
                        draggingIndex === index ? "opacity-60" : "opacity-100"
                      }`}
                      draggable
                      onDragStart={(event) => {
                        dragIndexRef.current = index;
                        setDraggingIndex(index);
                        event.dataTransfer.effectAllowed = "move";
                        const preview = buildDragPreview(item);
                        event.dataTransfer.setDragImage(preview, 20, 20);
                        requestAnimationFrame(() => {
                          preview.remove();
                        });
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const fromIndex = dragIndexRef.current;
                        if (fromIndex === null || fromIndex === index) {
                          return;
                        }
                        moveOrderingItem(fromIndex, index);
                        dragIndexRef.current = null;
                        setDraggingIndex(null);
                      }}
                      onDragEnd={() => {
                        dragIndexRef.current = null;
                        setDraggingIndex(null);
                      }}
                      onTouchStart={() => {
                        dragIndexRef.current = index;
                        setDraggingIndex(index);
                      }}
                      onTouchMove={(event) => {
                        const touch = event.touches[0];
                        const target = document.elementFromPoint(
                          touch.clientX,
                          touch.clientY
                        ) as HTMLElement | null;
                        const droppable = target?.closest(
                          "[data-order-index]"
                        ) as HTMLElement | null;
                        if (!droppable) {
                          return;
                        }
                        const nextIndex = Number(
                          droppable.dataset.orderIndex ?? index
                        );
                        const fromIndex = dragIndexRef.current;
                        if (fromIndex === null || nextIndex === fromIndex) {
                          return;
                        }
                        moveOrderingItem(fromIndex, nextIndex);
                        dragIndexRef.current = nextIndex;
                      }}
                      onTouchEnd={() => {
                        dragIndexRef.current = null;
                        setDraggingIndex(null);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-white/30 bg-white/10 text-sm font-semibold text-white/70 sm:h-11 sm:w-11 sm:text-base">
                          {index + 1}
                        </div>
                        <span className="text-white/80">{item}</span>
                      </div>
                      <span
                        aria-hidden="true"
                        className="inline-flex flex-col items-center justify-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white/60 cursor-grab active:cursor-grabbing"
                      >
                        <span className="h-0.5 w-5 rounded-full bg-white/50" />
                        <span className="h-0.5 w-5 rounded-full bg-white/50" />
                        <span className="h-0.5 w-5 rounded-full bg-white/50" />
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setQuestionIndex((prev) => Math.max(0, prev - 1))}
                disabled={isFirst}
                className="w-full rounded-2xl border border-white/30 px-6 py-3 text-base font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                Anterior
              </button>
              <div className="w-full text-center text-sm text-white/60 sm:w-auto sm:text-left">
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
                className="w-full rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
