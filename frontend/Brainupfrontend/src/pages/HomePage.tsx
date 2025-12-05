import type { FC } from "react";

const HomePage: FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-pink-600 relative overflow-hidden">
      {/* Elementos decorativos de fundo */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      <div className="relative min-h-screen flex flex-col justify-center items-center text-white px-4 py-12">
        {/* Header com logo/badge */}
        <div className="mb-8 animate-bounce-slow">
          <div className="bg-white/20 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/30">
            <div className="text-6xl">🧠</div>
          </div>
        </div>

        {/* Título principal */}
        <h1 className="text-6xl md:text-7xl font-black mb-4 text-center drop-shadow-2xl animate-fade-in-up tracking-tight">
          Brain<span className="text-yellow-300">Up</span>
        </h1>
        
        {/* Subtítulo */}
        <p className="text-xl md:text-2xl mb-4 text-center max-w-2xl drop-shadow-lg font-light animate-fade-in-up animation-delay-200">
          O Quiz Mais Divertido do Momento! 🚀
        </p>
        
        <p className="text-base md:text-lg mb-12 text-center max-w-xl text-white/90 animate-fade-in-up animation-delay-300">
          Teste seu conhecimento, desafie amigos e mostre quem é o verdadeiro campeão!
        </p>

        {/* Botões de ação */}
        <div className="flex flex-col sm:flex-row gap-4 mb-12 animate-fade-in-up animation-delay-400">
          <button className="group bg-white text-purple-600 font-bold py-4 px-10 rounded-2xl shadow-2xl hover:shadow-purple-400/50 hover:scale-105 transition-all duration-300 flex items-center gap-2">
            <span className="text-2xl group-hover:animate-wiggle">👤</span>
            Login
          </button>
          <button className="group bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold py-4 px-10 rounded-2xl shadow-2xl hover:shadow-yellow-400/50 hover:scale-105 transition-all duration-300 flex items-center gap-2">
            <span className="text-2xl group-hover:animate-wiggle">✨</span>
            Criar Conta
          </button>
        </div>

        {/* Features cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl animate-fade-in-up animation-delay-500">
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="font-bold text-lg mb-2">Tempo Real</h3>
            <p className="text-sm text-white/80">Jogue ao vivo com amigos</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
            <div className="text-4xl mb-3">🏆</div>
            <h3 className="font-bold text-lg mb-2">Rankings</h3>
            <p className="text-sm text-white/80">Compete pelo topo</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-105">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="font-bold text-lg mb-2">Diversos Temas</h3>
            <p className="text-sm text-white/80">Milhares de perguntas</p>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-16 text-sm text-white/70 text-center max-w-md animate-fade-in-up animation-delay-600">
          🔒 100% gratuito e seguro • Milhares de jogadores online
        </p>
      </div>
    </div>
  );
};

export default HomePage;
