// src/pages/JoinExam.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { joinExamRoom } from "../services/examRoomService";

export default function JoinExam() {
  const location = useLocation();
  const navigate = useNavigate();

  const paperType =
    location.state?.paperType || localStorage.getItem("paperType");
  const mode = Number(
    location.state?.mode || localStorage.getItem("mode")
  );

  const [loading, setLoading] = useState(true);

  function getOrCreateUserId() {
    let id = localStorage.getItem("examUserId");
    if (!id) {
      id = "user_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("examUserId", id);
    }
    return id;
  }

  useEffect(() => {
    console.log("🔍 DEBUG: JoinExam mounted");
    console.log("🔍 DEBUG: Received state:", { paperType, mode });

    if (!paperType || !mode || isNaN(mode)) {
      console.log("❌ DEBUG: Missing paperType or mode → redirecting home");
      navigate("/");
      return;
    }

    async function joinRoom() {
      try {
        const userId = getOrCreateUserId();
        console.log("🔍 DEBUG: Generated userId:", userId);

        console.log("🚀 DEBUG: Calling joinExamRoom with:", {
          paperType,
          userId,
          mode,
        });

        const roomId = await joinExamRoom(paperType, userId, mode);

        console.log("✅ DEBUG: Room joined successfully:", roomId);

        navigate("/waiting", {
          state: { roomId, paperType, mode },
        });
      } catch (err) {
        console.error("❌ DEBUG: joinExamRoom error:", err);
        alert("Error joining room");
        navigate("/");
      } finally {
        setLoading(false);
      }
    }

    joinRoom();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: 20,
      }}
    >
      {loading ? "Joining exam room..." : "Redirecting..."}
    </div>
  );
}
