import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import "./ModeSelect.css"; // optional for animation

export default function ModeSelect() {
  const navigate = useNavigate();
  const location = useLocation();

  const paperType = location.state?.paperType;

  useEffect(() => {
    if (!paperType) {
      navigate("/");
    }
  }, [paperType, navigate]);

  const handleMode = (mode) => {
    navigate("/join", {
      state: {
        paperType,
        mode,
      },
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#fff",
        padding: "30px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Top Label */}
      <div
        style={{
          background: "#FFD700",
          color: "#000",
          padding: "8px 16px",
          borderRadius: "8px",
          fontWeight: "bold",
          marginBottom: "30px",
        }}
      >
        {paperType === "medical" ? "🩺 Medical Paper" : "🛠️ Engineering Paper"}
      </div>

      <h2 style={{ marginBottom: "20px" }}>Select Mode</h2>

      {/* Mode Options */}
      <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
        {/* 2 Students */}
        <div
          onClick={() => handleMode(2)}
          className="mode-card"
          style={{
            background: "#1e293b",
            border: "2px solid #FFD700",
            borderRadius: "12px",
            padding: "30px",
            width: "220px",
            textAlign: "center",
            cursor: "pointer",
            transition: "transform 0.3s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <h3 style={{ color: "#FFD700" }}>👥 2 Students</h3>
          <p style={{ marginTop: "10px", opacity: 0.8 }}>
            Group of 2 students will start together.
          </p>
        </div>

        {/* 4 Students */}
        <div
          onClick={() => handleMode(4)}
          className="mode-card"
          style={{
            background: "#1e293b",
            border: "2px solid #FFD700",
            borderRadius: "12px",
            padding: "30px",
            width: "220px",
            textAlign: "center",
            cursor: "pointer",
            transition: "transform 0.3s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <h3 style={{ color: "#FFD700" }}>👨‍👩‍👧‍👦 4 Students</h3>
          <p style={{ marginTop: "10px", opacity: 0.8 }}>
            Group of 4 students will start together.
          </p>
        </div>
      </div>
    </div>
  );
}
