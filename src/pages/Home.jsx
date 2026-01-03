import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import "./Home.css";

export default function Home({ user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut(auth);
    localStorage.removeItem("userToken");
  }

  // ----------- Handle Paper Selection -----------
  function startMedicalExam() {
    navigate("/mode-select", {
      state: { paperType: "medical" }
    });
  }

  function startEngineeringExam() {
    navigate("/mode-select", {
      state: { paperType: "engineering" }
    });
  }

  return (
    <div className="home-container">
      <header className="top-bar">
        <div className="top-left">
          <button
            className="menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
        </div>
        <div className="top-center">
          <h2>X-ACADEMY</h2>
        </div>
      </header>

      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="sidebar">
          <p><b>{user?.email}</b></p>
          <button onClick={() => navigate("/profile")}>👤 Profile</button>
          <button onClick={() => navigate("/courses")}>📚 Get Course</button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </aside>
      )}

      {/* Main Content */}
      <main className="main-content">
        <h3>Select Your Paper</h3>

        <div className="paper-buttons">

          {/* MEDICAL PAPER BUTTON */}
          <button
            className="paper-btn"
            onClick={startMedicalExam}
          >
            🩺 Medical Paper
          </button>

          {/* ENGINEERING PAPER BUTTON */}
          <button
            className="paper-btn"
            onClick={startEngineeringExam}
          >
            🛠️ Engineering Paper
          </button>

        </div>
      </main>
    </div>
  );
}