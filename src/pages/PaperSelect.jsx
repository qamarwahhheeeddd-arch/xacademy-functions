import React from "react";
import { useNavigate } from "react-router-dom";

export default function PaperSelect() {
  const navigate = useNavigate();

  const handleSelect = (course) => {
    if (!course) return;
    localStorage.setItem("selectedCourse", course);
    navigate("/mode-select");
  };

  const buttonStyle = {
    padding: "15px 30px",
    background: "#111",
    borderRadius: 10,
    border: "1px solid #FFD700",
    color: "white",
    cursor: "pointer",
    fontSize: 16,
    width: "220px",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "white",
        padding: 20,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <h1 style={{ color: "#FFD700", marginBottom: 40 }}>Select Paper</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <button onClick={() => handleSelect("medical")} style={buttonStyle}>
          Medical Paper
        </button>

        <button onClick={() => handleSelect("engineering")} style={buttonStyle}>
          Engineering Paper
        </button>
      </div>
    </div>
  );
}
