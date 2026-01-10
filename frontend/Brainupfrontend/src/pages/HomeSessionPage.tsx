import type { FC } from "react";
import { Link } from "react-router-dom";

const HomeSessionPage: FC = () => {
  const players = [
    "Ana Silva",
    "Bruno Costa",
    "Carla Mendes",
    "Diogo Reis",
    "Eva Rocha",
    "Goncalo Pires",
    "Helena Alves",
    "Igor Santos",
  ];

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 text-white">
      <div className="flex min-h-screen w-full flex-col gap-6 px-4 py-8">
        <header className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-white/60">
                BrainUp
              </div>
              <h1 className="text-2xl font-black">Sessao pronta</h1>
              <p className="text-sm text-white/70">
                Aguardando jogadores antes de iniciar
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/30 bg-white/10 px-4 py-2 text-sm">
                Jogadores: 8
              </div>
              <div className="rounded-2xl bg-white/20 px-4 py-2 text-sm font-semibold">
                Tempo: 20 min
              </div>
            </div>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Participantes</h2>
                <p className="text-sm text-white/70">
                  Lista de jogadores na sala
                </p>
              </div>
              <div className="rounded-xl border border-white/30 px-3 py-1 text-xs">
                Online
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {players.map((player) => (
                <div
                  key={player}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80"
                >
                  {player}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
            <div>
              <h2 className="text-xl font-bold">Codigo de acesso</h2>
              <p className="text-sm text-white/70">
                Partilha este codigo com a turma
              </p>
            </div>

            <div className="mt-6 rounded-3xl border border-white/30 bg-white/10 px-6 py-6 text-center">
              <div className="text-xs uppercase tracking-[0.4em] text-white/60">
                Codigo
              </div>
              <div className="mt-2 text-4xl font-black tracking-widest">
                K9Q-42A
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button className="w-full rounded-2xl border border-white/40 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                Copiar codigo
              </button>
              <Link
                to="/quiz-builder"
                className="block w-full rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg transition hover:scale-105"
              >
                Iniciar quiz
              </Link>
            </div>

            <div className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-4 text-xs text-white/70">
              Assim que iniciares, todos os jogadores entram no quiz.
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default HomeSessionPage;
