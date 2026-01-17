import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import QuizBuilderPage from "./pages/QuizBuilderPage";
import HomeSessionPage from "./pages/HomeSessionPage";
import WaitingSessionPage from "./pages/WaitingSessionPage";
import VerQuiz from "./pages/VerQuiz";
import QuizEditorPage from "./pages/QuizEditorPage";
import JoinSessionPage from "./pages/JoinSessionPage";
import PlayerSessionPage from "./pages/PlayerSessionPage";
import HostSessionPage from "./pages/HostSessionPage";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/session" element={<HomeSessionPage />} />
        <Route path="/quiz-builder" element={<QuizBuilderPage />} />
        <Route path="/session-waiting" element={<WaitingSessionPage />} />
        <Route path="/ver-quiz" element={<VerQuiz />} />
        <Route path="/quiz-editor/:quizId" element={<QuizEditorPage />} />
        <Route path="/waiting-session/:sessionId" element={<WaitingSessionPage />} />
        <Route path="/join-session" element={<JoinSessionPage />} />
        <Route path="/player-session/:sessionCode" element={<PlayerSessionPage />} />
        <Route path="/host-session/:sessionId" element={<HostSessionPage />} />
      </Routes>
    </Router>
  );
};

export default App;
