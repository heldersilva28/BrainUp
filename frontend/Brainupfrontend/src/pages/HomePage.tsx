import type { FC } from "react";
import { useNavigate } from "react-router-dom";


const HomePage: FC = () => {

    const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-pink-600 relative overflow-hidden">
      {/* Elementos decorativos de fundo com animação flutuante */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float"></div>
      <div
        className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-float"
        style={{ animationDelay: '2s' }}
      ></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      
      <div className="relative min-h-screen flex flex-col justify-center items-center text-white px-4 py-12">
        {/* Header com logo/badge - animação de escala */}
        <div
          className="mb-8 animate-scale-in opacity-0"
          style={{ animationFillMode: 'forwards' }}
        >
          <div className="bg-white/20 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/30 hover:scale-110 hover:rotate-6 transition-all duration-500 ease-bounce-in cursor-pointer">
            <div className="text-6xl animate-bounce-slow">🧠</div>
          </div>
        </div>

        {/* Título principal - fade in down */}
        <h1
          className="text-6xl md:text-7xl font-black mb-4 text-center drop-shadow-2xl animate-fade-in-down opacity-0"
          style={{ animationFillMode: 'forwards' }}
        >
          Brain<span className="text-yellow-300 inline-block hover:animate-wiggle">Up</span>
        </h1>
        
        {/* Subtítulo - fade in up com delay */}
        <p
          className="text-xl md:text-2xl mb-4 text-center max-w-2xl drop-shadow-lg font-light opacity-0"
          style={{ animationName: 'fadeInUp', animationDuration: '0.8s', animationTimingFunction: 'ease-out', animationDelay: '0.2s', animationFillMode: 'forwards' }}
        >
          O Quiz Mais Divertido do Momento! 🚀
        </p>
        
        <p
          className="text-base md:text-lg mb-12 text-center max-w-xl text-white/90 opacity-0"
          style={{ animationName: 'fadeInUp', animationDuration: '0.8s', animationTimingFunction: 'ease-out', animationDelay: '0.4s', animationFillMode: 'forwards' }}
        >
          Teste seu conhecimento, desafie amigos e mostre quem é o verdadeiro campeão!
        </p>

        {/* Botões de ação */}
        <div
          className="flex flex-col sm:flex-row gap-4 mb-12 opacity-0"
          style={{ animationName: 'fadeInUp', animationDuration: '0.8s', animationTimingFunction: 'ease-out', animationDelay: '0.6s', animationFillMode: 'forwards' }}
        >
          <button onClick={() => navigate("/login")}
          className="group relative bg-white text-purple-600 font-bold py-4 px-10 rounded-2xl shadow-2xl hover:shadow-purple-400/50 hover:scale-110 hover:-translate-y-1 transition-all duration-300 ease-bounce-in flex items-center justify-center gap-2 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-100 to-pink-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative text-2xl group-hover:animate-wiggle">👤</span>
            <span className="relative">Login</span>
          </button>
          <button onClick={() => navigate("/register")}
          className="group relative bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold py-4 px-10 rounded-2xl shadow-2xl hover:shadow-yellow-400/50 hover:scale-110 hover:-translate-y-1 transition-all duration-300 ease-bounce-in flex items-center justify-center gap-2 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative text-2xl group-hover:animate-wiggle">✨</span>
            <span className="relative">Criar Conta</span>
          </button>
        </div>

        {/* Features cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          <div
            className="animate-scale-in opacity-0 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-500 hover:scale-110 hover:-translate-y-2 cursor-pointer group"
            style={{ animationFillMode: 'forwards', animationDelay: '0.8s' }}
          >
            <div className="text-4xl mb-3 group-hover:animate-bounce-slow">⚡</div>
            <h3 className="font-bold text-lg mb-2 group-hover:text-yellow-300 transition-colors">Tempo Real</h3>
            <p className="text-sm text-white/80">Jogue ao vivo com amigos</p>
          </div>
          
          <div
            className="animate-scale-in opacity-0 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-500 hover:scale-110 hover:-translate-y-2 cursor-pointer group"
            style={{ animationFillMode: 'forwards', animationDelay: '1s' }}
          >
            <div className="text-4xl mb-3 group-hover:animate-bounce-slow">🏆</div>
            <h3 className="font-bold text-lg mb-2 group-hover:text-yellow-300 transition-colors">Rankings</h3>
            <p className="text-sm text-white/80">Compete pelo topo</p>
          </div>
          
          <div
            className="animate-scale-in opacity-0 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-500 hover:scale-110 hover:-translate-y-2 cursor-pointer group"
            style={{ animationFillMode: 'forwards', animationDelay: '1.2s' }}
          >
            <div className="text-4xl mb-3 group-hover:animate-bounce-slow">🎯</div>
            <h3 className="font-bold text-lg mb-2 group-hover:text-yellow-300 transition-colors">Diversos Temas</h3>
            <p className="text-sm text-white/80">Milhares de perguntas</p>
          </div>
        </div>

        {/* Footer info */}
        <p
          className="mt-16 text-sm text-white/70 text-center max-w-md opacity-0"
          style={{ animationName: 'fadeIn', animationDuration: '0.8s', animationTimingFunction: 'ease-out', animationDelay: '1.4s', animationFillMode: 'forwards' }}
        >
          🔒 100% gratuito e seguro • Milhares de jogadores online
        </p>
      </div>
    </div>
  );
};

export default HomePage;
