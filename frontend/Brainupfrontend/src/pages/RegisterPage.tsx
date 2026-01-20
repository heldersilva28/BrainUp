import type { FC } from "react";
import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const RegisterPage: FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5027";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("As palavras-passe nao coincidem.");
      return;
    }

    const normalizedEmail = email.trim();
    const roleId = 2;

    try {
      setIsSubmitting(true);
      await axios.post(`${apiBaseUrl}/api/auth/register`, {
        username: normalizedEmail,
        email: normalizedEmail,
        password,
        roleId: roleId,
      });
      navigate("/login");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message =
          typeof err.response?.data === "string"
            ? err.response.data
            : "Registo falhou.";
        setError(message);
      } else {
        setError("Registo falhou.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-pink-600 flex items-center justify-center relative overflow-hidden px-4">

      {/* Elementos decorativos */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float-slow"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-float"></div>

      {/* Container do Formulário */}
      <div
        className="relative z-10 bg-white/20 backdrop-blur-md rounded-3xl p-10 shadow-2xl w-full max-w-md 
                  opacity-0 animate-scale-in max-h-[90vh] overflow-y-auto overflow-x-hidden pb-6"
        style={{ animationFillMode: "forwards" }}
      >

        {/* Ícone animado */}
        <div
          className="flex justify-center mb-6 opacity-0 animate-fade-in-down"
          style={{ animationFillMode: "forwards", animationDelay: "0.1s" }}
        >
          <div className="bg-white/20 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/30 
                          hover:scale-110 hover:rotate-6 transition-all duration-500 ease-bounce-in cursor-pointer">
            <div className="text-6xl animate-bounce-slow">🧠</div>
          </div>
        </div>

        {/* Título */}
        <h1
          className="text-4xl font-black text-white text-center mb-4 drop-shadow-lg opacity-0 animate-fade-in-down"
          style={{ animationFillMode: "forwards", animationDelay: "0.2s" }}
        >
          Brain<span className="text-yellow-300 inline-block hover:animate-wiggle">Up</span>
        </h1>

        {/* Subtítulo */}
        <p
          className="text-white/80 text-center mb-8 opacity-0 animate-fade-in-up"
          style={{ animationFillMode: "forwards", animationDelay: "0.4s" }}
        >
          Faça o registo para continuar
        </p>

        {/* Formulário */}
        {error && (
          <p className="text-red-200 text-center text-sm mb-2">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/*ZONA COM SCROLL (apenas os campos) */}
          <div className="flex flex-col gap-6 max-h-[35vh] overflow-y-auto overflow-x-hidden pr-2">

            {/* Email */}
            <div
              className="flex flex-col opacity-0 animate-fade-in-up"
              style={{ animationFillMode: "forwards", animationDelay: "0.6s" }}
            >
              <label className="text-white/80 mb-2" htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="p-4 rounded-xl bg-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1 transition-all duration-300 hover:scale-105"
                placeholder="seu@email.com"
                required
              />
            </div>

            {/* Password */}
            <div
              className="flex flex-col opacity-0 animate-fade-in-up"
              style={{ animationFillMode: "forwards", animationDelay: "0.8s" }}
            >
              <label className="text-white/80 mb-2" htmlFor="password">Palavra-Passe</label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="p-4 pr-12 rounded-xl w-full bg-white/20 text-white placeholder-white/50
                             focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1
                             transition-all duration-300 hover:scale-105"
                  placeholder="********"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white
                             transition-all duration-300 hover:scale-110"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-6 h-6" />
                  ) : (
                    <EyeIcon className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirmar Password */}
            <div
              className="flex flex-col opacity-0 animate-fade-in-up"
              style={{ animationFillMode: "forwards", animationDelay: "0.8s" }}
            >
              <label className="text-white/80 mb-2" htmlFor="confirmPassword">Confirmar Palavra-Passe</label>

              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (e.target.value !== password) {
                      e.target.setCustomValidity("As palavras-passe não coincidem!");
                    } else {
                      e.target.setCustomValidity("");
                    }
                  }}
                  className="p-4 pr-12 rounded-xl w-full bg-white/20 text-white placeholder-white/50
                             focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1
                             transition-all duration-300 hover:scale-105"
                  placeholder="********"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white
                             transition-all duration-300 hover:scale-110"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="w-6 h-6" />
                  ) : (
                    <EyeIcon className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>

          </div>
          {/*FIM DO BLOCO COM SCROLL */}

          {/* Botão de Registo — Fixo */}
          <div
            className="opacity-0 animate-fade-in-up w-full"
            style={{ animationFillMode: "forwards", animationDelay: "1s" }}
          >
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full group relative bg-gradient-to-r from-yellow-400 to-orange-500
                         text-white font-bold py-4 px-10 rounded-2xl shadow-2xl hover:shadow-yellow-400/50
                         hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-bounce-in
                         flex items-center justify-center gap-2 overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-orange-400
                              opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative text-2xl group-hover:animate-wiggle">✨</span>
              <span className="relative">
                {isSubmitting ? "A registar..." : "Registar"}
              </span>
            </button>
          </div>
        </form>

        {/* Footer */}
        <p
          className="mt-6 text-white/70 text-center opacity-0 animate-fade-in-up"
          style={{ animationFillMode: "forwards", animationDelay: "1.2s" }}
        >
          Já tem Conta?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-yellow-300 font-bold cursor-pointer hover:underline"
          >
            Inicie Sessão
          </span>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
