import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function JoinExam() {
  const location = useLocation();
  const navigate = useNavigate();

  const paperType = location.state?.paperType;
  const mode = location.state?.mode;

  const [loading, setLoading] = useState(true);
  const [roomId, setRoomId] = useState(null);

  // ---------------- JOIN EXAM FUNCTION ----------------
  async function joinExam() {
    try {
      const studentId = auth.currentUser.uid;

      const res = await fetch(
        "https://us-central1-xacademy8-e52db.cloudfunctions.net/joinExamHttp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            paperType,
            mode
          })
        }
      );

      const data = await res.json();

      if (!data.success) {
        alert("Join failed");
        return;
      }

      setRoomId(data.roomId);
      listenToRoom(data.roomId);
      setLoading(false);

    } catch (err) {
      console.error(err);
      alert("Join failed");
    }
  }

  // ---------------- LISTEN TO ROOM STATUS ----------------
  function listenToRoom(roomId) {
    const ref = doc(db, "rooms", roomId);

    onSnapshot(ref, (snap) => {
      const room = snap.data();
      if (!room) return;

      if (room.status === "ready") {
        navigate("/exam", {
          state: {
            roomId,
            paperType
          }
        });
      }
    });
  }

  // ---------------- AUTO JOIN ON PAGE LOAD ----------------
  useEffect(() => {
    if (paperType && mode) {
      joinExam();
    }
  }, []);

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
      <h1 style={{ color: "#FFD700" }}>Join Exam</h1>

      <p style={{ marginTop: "20px" }}>
        Paper: <b style={{ color: "#FFD700" }}>{paperType}</b>
      </p>

      <p>
        Mode: <b style={{ color: "#FFD700" }}>{mode} Students</b>
      </p>

      {loading ? (
        <p style={{ marginTop: "40px", opacity: 0.7 }}>
          Joining exam...
        </p>
      ) : (
        <p style={{ marginTop: "40px", opacity: 0.7 }}>
          Waiting for other students...
        </p>
      )}

      {roomId && (
        <p style={{ marginTop: "20px", opacity: 0.5 }}>
          Room ID: {roomId}
        </p>
      )}
    </div>
  );
}