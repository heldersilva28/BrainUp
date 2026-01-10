import type { FC } from "react";

const WaitingSessionPage: FC = () => {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 text-white">
      <div className="flex min-h-screen w-full items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-2xl rounded-3xl border border-white/20 bg-white/10 p-6 text-center backdrop-blur-md shadow-2xl sm:p-8">
          <div className="text-[0.65rem] uppercase tracking-[0.35em] text-white/60 sm:text-xs sm:tracking-[0.4em]">
            BrainUp
          </div>
          <h1 className="mt-4 text-2xl font-black sm:text-3xl">
            Aguardar inicio do quiz
          </h1>
          <p className="mt-3 text-sm text-white/70 sm:text-base">
            O anfitriao ainda nao iniciou. Mantem-te nesta pagina.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3 text-xs text-white/70 sm:gap-4 sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-yellow-300 animate-pulse" />
            <span>A aguardar o inicio...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingSessionPage;
