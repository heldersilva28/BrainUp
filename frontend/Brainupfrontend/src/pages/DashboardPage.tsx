import type { FC } from "react";
import { useState } from "react";

const DashboardPage: FC = () => {
  const [activeSection, setActiveSection] = useState<"projects" | "sessions">(
    "projects"
  );
  const [activeProjectTab, setActiveProjectTab] = useState<
    "import" | "create" | "library"
  >("import");
  const [activeFolder, setActiveFolder] = useState<string>("Matematica");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const allQuizzes = [
    { name: "Equações básicas", detail: "10 perguntas • Matemática" },
    { name: "Revolução Francesa", detail: "15 perguntas • História" },
    { name: "JavaScript rápido", detail: "8 perguntas • Programação" },
    { name: "Física do movimento", detail: "12 perguntas • Matemática" },
  ];

  const filteredQuizzes = allQuizzes.filter(quiz =>
    quiz.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5027";

// 🔐 Fetch com Bearer Token
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

  const [uploadStatus, setUploadStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'loading' | null;
  }>({ message: '', type: null });

  const uploadFile = (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    setUploadStatus({ message: 'A carregar ficheiro...', type: 'loading' });

    authFetch(`${apiBaseUrl}/api/Import/questions`, {
      method: "POST",
      body: formData,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erro no upload");
        return res.json();
      })
      .then((data) => {
        console.log("Upload feito com sucesso:", data);
        setUploadStatus({ message: 'Ficheiro carregado com sucesso!', type: 'success' });
        setTimeout(() => setUploadStatus({ message: '', type: null }), 3000);
      })
      .catch((err) => {
        console.error("Falha no upload:", err);
        setUploadStatus({ message: 'Erro ao carregar ficheiro. Tenta novamente.', type: 'error' });
        setTimeout(() => setUploadStatus({ message: '', type: null }), 3000);
      });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-indigo-700 to-pink-700 text-white">
      <div className="flex min-h-screen w-full gap-6 px-4 py-8">
        <aside className="w-72 shrink-0 rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.3em] text-white/60">
              BrainUp
            </div>
            <h1 className="text-2xl font-black">Dashboard</h1>
          </div>

          <div className="mb-8">
            <p className="text-sm font-semibold text-white/80">Navegacao</p>
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => setActiveSection("sessions")}
                className={`w-full rounded-2xl px-4 py-3 text-left font-semibold transition ${
                  activeSection === "sessions"
                    ? "bg-white/20 shadow-lg"
                    : "border border-white/30 hover:bg-white/10"
                }`}
              >
                Sessão
                <span className="mt-1 block text-xs text-white/60">
                  Entrar e criar sessões
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection("projects")}
                className={`w-full rounded-2xl px-4 py-3 text-left font-semibold transition ${
                  activeSection === "projects"
                    ? "bg-white/20 shadow-lg"
                    : "border border-white/30 hover:bg-white/10"
                }`}
              >
                Projetos
                <span className="mt-1 block text-xs text-white/60">
                  Pastas e quizzes
                </span>
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-white/80">Ações</p>
            <div className="mt-3 space-y-2">
              {activeSection === "sessions" ? (
                <>
                  <button className="w-full rounded-xl bg-white/20 px-3 py-2 text-left text-sm font-semibold text-white transition hover:bg-white/30">
                    Entrar ou Criar sessão
                  </button>
                 
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveProjectTab("create")}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                      activeProjectTab === "create"
                        ? "bg-white/20 text-white shadow-sm"
                        : "text-white/70 hover:bg-white/10"
                    }`}
                  >
                    Criar quiz
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveProjectTab("import")}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                      activeProjectTab === "import"
                        ? "bg-white/20 text-white shadow-sm"
                        : "text-white/70 hover:bg-white/10"
                    }`}
                  >
                    Importar quiz
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveProjectTab("library")}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                      activeProjectTab === "library"
                        ? "bg-white/20 text-white shadow-sm"
                        : "text-white/70 hover:bg-white/10"
                    }`}
                  >
                    Biblioteca
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 space-y-6">
          {activeSection === "sessions" ? (
            <>
              <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
                  <div>
                    <h2 className="text-xl font-bold">Entrar em sessão</h2>
                    <p className="text-sm text-white/70">
                      Usa o codigo fornecido pelo host
                    </p>
                  </div>

                  <div className="mt-6 space-y-4">
                    <input
                      type="text"
                      placeholder="Codigo da sessão"
                      className="w-full rounded-2xl bg-white/20 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                    <button className="w-full rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105">
                      Entrar
                    </button>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-4">
                    <p className="text-sm font-semibold">Dica</p>
                    <p className="mt-2 text-xs text-white/70">
                      Tambem podes guardar o codigo para voltar a entrar mais
                      tarde.
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
                  <div>
                    <h2 className="text-xl font-bold">Criar sessão</h2>
                    <p className="text-sm text-white/70">
                      Escolhe um quiz e define a duração
                    </p>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                        Quiz
                      </p>
                        <select className="mt-2 w-full rounded-2xl bg-white/20 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-300">
                        <option value="">Selecionar quiz</option>
                        <option value="equacoes">Equações básicas</option>
                        <option value="revolucao">Revolução Francesa</option>
                        <option value="javascript">JavaScript rápido</option>
                        <option value="fisica">Física do movimento</option>
                        </select>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                      Tempo
                      </p>
                      <input
                      type="number"
                      placeholder="Duração em minutos"
                      className="mt-2 w-full rounded-2xl bg-white/20 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>
                    <button className="w-full rounded-2xl border border-white/40 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                      Criar sessão
                    </button>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <>
                <section className="grid gap-6 lg:grid-cols-[1.1fr_1.5fr]">
                <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
                  <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Pastas</h2>
                    <p className="text-sm text-white/70">
                    Cria uma pasta por disciplina ou tema
                    </p>
                  </div>
                  <button className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/30">
                    Nova pasta
                  </button>
                  </div>

                  <div className="mt-6 space-y-4">
                  {[
                    { name: "Matematica", detail: "4 quizzes" },
                    { name: "Historia", detail: "2 quizzes" },
                    { name: "Programacao", detail: "6 quizzes" },
                  ].map((folder) => (
                    <button
                    key={folder.name}
                    onClick={() => setActiveFolder(folder.name)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                      activeFolder === folder.name
                      ? "border-white/40 bg-white/20 shadow-lg"
                      : "border-white/15 bg-white/5 hover:bg-white/10"
                    }`}
                    >
                    <div className="text-base font-semibold">
                      {folder.name}
                    </div>
                    <p className="text-xs text-white/60">{folder.detail}</p>
                    </button>
                  ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-2xl">
                    {activeProjectTab === "import" && (
                    <>
                    <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold">Importar quiz</h2>
                      <p className="text-sm text-white/70">
                      Pasta atual: {activeFolder}
                      </p>
                    </div>
                    </div>

                    <div 
                      className="mt-6 rounded-3xl border border-dashed border-white/40 bg-white/5 p-8 text-center transition-colors hover:bg-white/10"
                      onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-yellow-400');
                      }}
                      onDragLeave={(e) => {
                      e.currentTarget.classList.remove('border-yellow-400');
                      }}
                      onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-yellow-400');
                      const files = e.dataTransfer.files;
                      if (files.length > 0) {
                        uploadFile(files[0]); 
                      }
                      }}
                    >
                    <p className="text-base font-semibold">
                      Larga ficheiros aqui para importar
                    </p>
                    <p className="mt-2 text-sm text-white/70">
                      Escolhe um ficheiro JSON ou CSV dentro da pasta
                    </p>
                    <input
                      type="file"
                      accept=".json,.csv"
                      className="hidden"
                      id="file-input"
                      onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadFile(file);
                      }}
                    />
                    <button 
                      className="mt-6 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105"
                      onClick={() => document.getElementById('file-input')?.click()}
                      disabled={uploadStatus.type === 'loading'}
                    >
                      {uploadStatus.type === 'loading' ? 'A carregar...' : 'Selecionar ficheiro'}
                    </button>
                    </div>

                    {uploadStatus.message && (
                      <div className={`mt-4 rounded-2xl border p-4 ${
                        uploadStatus.type === 'success' 
                          ? 'border-green-400/40 bg-green-400/10 text-green-400'
                          : uploadStatus.type === 'error'
                          ? 'border-red-400/40 bg-red-400/10 text-red-400'
                          : 'border-yellow-400/40 bg-yellow-400/10 text-yellow-400'
                      }`}>
                        <p className="text-sm font-semibold">{uploadStatus.message}</p>
                      </div>
                    )}

                    <div className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-4">
                    <p className="text-sm font-semibold">Sugestao de fluxo</p>
                    <p className="mt-2 text-xs text-white/70">
                      1. Cria a pasta do tema. 2. Entra na pasta. 3. Importa
                      o quiz para manter tudo organizado.
                    </p>
                    </div>
                    </>
                    )}

                  {activeProjectTab === "create" && (
                  <>
                    <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold">Criar quiz</h2>
                      <p className="text-sm text-white/70">
                      Pasta atual: {activeFolder}
                      </p>
                    </div>
                    </div>

                    <div className="mt-6 space-y-4">
                    <input
                      type="text"
                      placeholder="Nome do quiz"
                      className="w-full rounded-2xl bg-white/15 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                    <textarea
                      placeholder="Descricao curta"
                      rows={3}
                      className="w-full rounded-2xl bg-white/15 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/70">
                      Nivel: Intermedio
                      </div>
                      <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/70">
                      Perguntas: 12
                      </div>
                    </div>
                    <button className="w-full rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105">
                      Criar quiz
                    </button>
                    </div>
                  </>
                  )}

                  {activeProjectTab === "library" && (
                  <>
                    <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold">Biblioteca</h2>
                      <p className="text-sm text-white/70">
                      Quizzes da pasta: {activeFolder}
                      </p>
                    </div>
                    </div>

                    <div className="mt-6">
                    <input
                      type="text"
                      placeholder="Pesquisar quiz"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-2xl bg-white/15 px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-300"
                    />
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {filteredQuizzes.map((quiz) => (
                      <div
                      key={quiz.name}
                      className="rounded-2xl border border-white/20 bg-white/10 p-4"
                      >
                      <div className="text-sm font-semibold">
                        {quiz.name}
                      </div>
                      <p className="mt-1 text-xs text-white/60">
                        {quiz.detail}
                      </p>
                      <button className="mt-3 rounded-xl bg-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/30">
                        Abrir
                      </button>
                      </div>
                    ))}
                    </div>
                  </>
                  )}
                </div>
                </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
