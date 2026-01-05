import React from "react";
import { useNavigate } from "react-router-dom";

export default function PaperSelect() {
  const navigate = useNavigate();

  const handleSelect = (course) => {
    localStorage.setItem("selectedCourse", course);
    navigate("/mode-select");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "white",
        padding: 20,
        textAlign: "center",
      }}
    >
      <h1 style={{ color: "#FFD700" }}>Select Paper</h1>

      <div
        style={{
          marginTop: 40,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          alignItems: "center",
        }}
      >
        <button
          onClick={() => handleSelect("medical")}
          style={{
            padding: "15px 30px",
            background: "#111",
            borderRadius: 10,
            border: "1px solid #FFD700",
            color: "white",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          Medical Paper
        </button>

        <button
          onClick={() => handleSelect("engineering")}
          style={{
            padding: "15px 30px",
            background: "#111",
            borderRadius: 10,
            border: "1px solid #FFD700",
            color: "white",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          Engineering Paper
        </button>
      </div>
    </div>
  );
}
