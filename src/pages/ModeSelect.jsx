import { useLocation, useNavigate } from "react-router-dom";
import { FaUsers } from "react-icons/fa";

export default function ModeSelect() {
  const location = useLocation();
  const navigate = useNavigate();

  const paperType = location.state?.paperType;

  if (!paperType) {
    return (
      <div style={{ padding: 20, color: "white" }}>
        <h2>No paper selected</h2>
      </div>
    );
  }

  const handleMode = (mode) => {
    navigate("/join", {
      state: { paperType, mode }
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        padding: "20px",
        color: "white",
        textAlign: "center"
      }}
    >
      <h1 style={{ color: "#FFD700", marginBottom: "20px" }}>
        Select Mode
      </h1>

      <p style={{ opacity: 0.8, marginBottom: "30px" }}>
        Paper: <b style={{ color: "#FFD700" }}>{paperType}</b>
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* 2 STUDENTS */}
        <div
          onClick={() => handleMode(2)}
          style={{
            background: "rgba(255,255,255,0.05)",
            borderRadius: "15px",
            padding: "25px",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 0 15px rgba(255,215,0,0.2)",
            cursor: "pointer"
          }}
        >
          <FaUsers size={40} color="#FFD700" />
          <h2 style={{ marginTop: "10px", color: "#FFD700" }}>
            2 Students Mode
          </h2>
        </div>

        {/* 4 STUDENTS */}
        <div
          onClick={() => handleMode(4)}
          style={{
            background: "rgba(255,255,255,0.05)",
            borderRadius: "15px",
            padding: "25px",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 0 15px rgba(255,215,0,0.2)",
            cursor: "pointer"
          }}
        >
          <FaUsers size={40} color="#FFD700" />
          <h2 style={{ marginTop: "10px", color: "#FFD700" }}>
            4 Students Mode
          </h2>
        </div>

      </div>
    </div>
  );
}