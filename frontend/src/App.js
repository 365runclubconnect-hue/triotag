import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import AdminPanel from "@/pages/AdminPanel";
import Leaderboard from "@/pages/Leaderboard";
import { Toaster } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [token, setToken] = useState(localStorage.getItem("trio_tag_token"));

  const handleLogin = useCallback((newToken) => {
    localStorage.setItem("trio_tag_token", newToken);
    setToken(newToken);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("trio_tag_token");
    setToken(null);
  }, []);

  return (
    <div className="App noise-bg">
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              token ? <Navigate to="/admin" replace /> : <LoginPage api={API} onLogin={handleLogin} />
            }
          />
          <Route
            path="/admin"
            element={
              token ? (
                <AdminPanel api={API} token={token} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/leaderboard"
            element={<Leaderboard api={API} />}
          />
        </Routes>
      </BrowserRouter>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: '#121212',
            border: '1px solid #27272A',
            color: '#FFFFFF',
            fontFamily: 'Manrope, sans-serif',
          },
        }}
      />
    </div>
  );
}

export default App;
