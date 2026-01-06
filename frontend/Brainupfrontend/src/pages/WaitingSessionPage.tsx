import type { FC } from "react";

const WaitingSessionPage: FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 text-white">
      <div className="flex min-h-screen w-full items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl rounded-3xl border border-white/20 bg-white/10 p-8 text-center backdrop-blur-md shadow-2xl">
          <div className="text-xs uppercase tracking-[0.4em] text-white/60">
            BrainUp
          </div>
          <h1 className="mt-4 text-3xl font-black">
            Aguardar inicio do quiz
          </h1>
          <p className="mt-3 text-base text-white/70">
            O anfitriao ainda nao iniciou. Mantem-te nesta pagina.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4 text-sm text-white/70">
            <span className="h-2 w-2 rounded-full bg-yellow-300 animate-pulse" />
            <span>A aguardar o inicio...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingSessionPage;
