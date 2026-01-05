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

  async function join() {
    try {
      const userId = getOrCreateUserId();

      const rid = await joinExamRoom(paperType, userId, mode);
      setRoomId(rid);

      listenExamRoom(rid, (data) => {
        if (data.status === "started") {
          navigate("/exam", {
            state: { roomId: rid, paperType, mode },
          });
        }
      });

      setLoading(false);
    } catch (err) {
      console.error(err);
      alert("Join failed");
    }
  }

  useEffect(() => {
    if (paperType && mode) join();
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
      <h1 style={{ color: "#FFD700" }}>Join Exam</h1>

      <p>Paper: <b style={{ color: "#FFD700" }}>{paperType}</b></p>
      <p>Mode: <b style={{ color: "#FFD700" }}>{mode} Students</b></p>

      {loading ? (
        <p style={{ marginTop: "40px", opacity: 0.7 }}>Joining exam...</p>
      ) : (
        <p style={{ marginTop: "40px", opacity: 0.7 }}>
          Waiting for other students...
        </p>
      )}

      {roomId && (
        <p style={{ marginTop: "20px", opacity: 0.5 }}>Room ID: {roomId}</p>
      )}
    </div>
  );
}
