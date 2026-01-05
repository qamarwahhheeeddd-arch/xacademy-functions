import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { joinExamRoom } from "../services/examRoomService";

export default function JoinExam() {
  const location = useLocation();
  const navigate = useNavigate();

  const paperType = location.state?.paperType;
  const mode = location.state?.mode;

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
    if (!paperType || !mode) {
      navigate("/");
      return;
    }

    async function joinRoom() {
      try {
        const userId = getOrCreateUserId();

        // Backend call → returns roomId
        const roomId = await joinExamRoom(paperType, userId, mode);

        // Go to waiting page
        navigate("/waiting", {
          state: { roomId, paperType, mode }
        });

      } catch (err) {
        alert("Error joining room");
        navigate("/");
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
        fontSize: 20
      }}
    >
      Joining exam room...
    </div>
  );
}
