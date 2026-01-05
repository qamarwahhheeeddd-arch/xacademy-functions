import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import "./ModeSelect.css";

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
    localStorage.setItem("paperType", paperType);
    localStorage.setItem("mode", mode);

    navigate("/join", {
      state: { paperType, mode },
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

      <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
        <ModeCard mode={2} label="👥 2 Students" description="Group of 2 students will start together." handleMode={handleMode} />
        <ModeCard mode={4} label="👨‍👩‍👧‍👦 4 Students" description="Group of 4 students will start together." handleMode={handleMode} />
      </div>
    </div>
  );
}

function ModeCard({ mode, label, description, handleMode }) {
  return (
    <div
      onClick={() => handleMode(mode)}
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
      <h3 style={{ color: "#FFD700" }}>{label}</h3>
      <p style={{ marginTop: "10px", opacity: 0.8 }}>{description}</p>
    </div>
  );
}
