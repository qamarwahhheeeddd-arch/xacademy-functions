import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { joinExamRoom, listenExamRoom } from "../services/examRoomService";

export default function JoinExam() {
  const location = useLocation();
  const navigate = useNavigate();

  const paperType = location.state?.paperType;
  const mode = location.state?.mode;

  const [loading, setLoading] = useState(true);
  const [roomId, setRoomId] = useState(null);

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

    async function join() {
      try {
        const userId = getOrCreateUserId();
        const rid = await joinExamRoom(paperType, userId, mode);
        setRoomId(rid);

        const unsub = listenExamRoom(rid, (data) => {
          if (data?.status === "started") {
            unsub();
            navigate("/exam", {
              state: { roomId: rid, paperType, mode },
            });
          }
        });

        setLoading(false);
      } catch (err) {
        alert("Join failed");
        navigate("/");
      }
    }

    join();
  }, []);

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
      <h1 style={{ color: "#FFD700" }}>Joining Exam...</h1>

      <p>Paper: {paperType}</p>
      <p>Mode: {mode} Students</p>

      {roomId && <p>Room ID: {roomId}</p>}

      <p style={{ marginTop: 40, opacity: 0.7 }}>
        {loading ? "Joining..." : "Waiting for other students..."}
      </p>
    </div>
  );
}
