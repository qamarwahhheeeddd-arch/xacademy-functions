// src/App.jsx
import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation
} from "react-router-dom";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Forgot from "./pages/Forgot";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import ExamPage from "./pages/ExamPage";

// ⭐ ADD THESE TWO IMPORTS ⭐
import ModeSelect from "./pages/ModeSelect";
import JoinExam from "./pages/JoinExam";

// ---------------- PROTECTED ROUTE ----------------
function ProtectedRoute({ children }) {
  const [user, setUser] = useState(undefined);
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
    });
    return () => unsub();
  }, []);

  if (user === undefined) {
    return (
      <div className="page-container">
        <h2>Loading...</h2>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
}

// ---------------- MAIN APP ----------------
export default function App() {
  return (
    <Routes>

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/mode-select"
        element={
          <ProtectedRoute>
            <ModeSelect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/join"
        element={
          <ProtectedRoute>
            <JoinExam />
          </ProtectedRoute>
        }
      />

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot" element={<Forgot />} />

      <Route
        path="/exam"
        element={
          <ProtectedRoute>
            <ExamPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}