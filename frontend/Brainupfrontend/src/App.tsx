import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import QuizBuilderPage from "./pages/QuizBuilderPage";
import HomeSessionPage from "./pages/HomeSessionPage";
import WaitingSessionPage from "./pages/WaitingSessionPage";

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
      </Routes>
    </Router>
  );
};

export default App;
