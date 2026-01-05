import { useNavigate, useLocation } from "react-router-dom";
import { FaUsers } from "react-icons/fa";
import { useEffect } from "react";

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
        background: "#000",
        padding: "20px",
        color: "white",
        textAlign: "center",
      }}
    >
      <h1 style={{ color: "#FFD700" }}>Select Mode</h1>

      <p style={{ opacity: 0.8 }}>
        Paper: <b style={{ color: "#FFD700" }}>{paperType}</b>
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div
          onClick={() => handleMode(2)}
          style={{
            background: "#111",
            padding: "20px",
            borderRadius: "10px",
            cursor: "pointer",
            border: "1px solid #FFD700",
            display: "flex",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <FaUsers color="#FFD700" size={22} />
          <span>2 Students Mode</span>
        </div>

        <div
          onClick={() => handleMode(4)}
          style={{
            background: "#111",
            padding: "20px",
            borderRadius: "10px",
            cursor: "pointer",
            border: "1px solid #FFD700",
            display: "flex",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <FaUsers color="#FFD700" size={22} />
          <span>4 Students Mode</span>
        </div>
      </div>
    </div>
  );
}
