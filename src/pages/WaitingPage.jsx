import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function WaitingPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const roomId = location.state?.roomId;
  const paperType = location.state?.paperType;
  const mode = Number(location.state?.mode); // ensure it's a number

  const [studentsCount, setStudentsCount] = useState(1);
  const [status, setStatus] = useState("waiting");

  useEffect(() => {
    if (!roomId || !paperType || !mode || isNaN(mode)) {
      navigate("/");
      return;
    }

    const ref = doc(db, "examRooms", roomId);

    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();

      const count = Array.isArray(data.students)
        ? data.students.filter(Boolean).length
        : 0;

      setStudentsCount(count);
      setStatus(data.status);

      // ✅ Only start exam when status is "started" AND students are complete
      if (data.status === "started" && count === mode) {
        navigate("/exam", {
          state: { roomId, paperType, mode }
        });
      }
    });

    return () => unsub();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "white",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 20
      }}
    >
      <h2 style={{ color: "#FFD700" }}>
        {paperType === "medical" ? "🩺 Medical Paper" : "🛠️ Engineering Paper"}
      </h2>

      <h3 style={{ marginTop: 10 }}>Mode: {mode} Students</h3>

      <p style={{ marginTop: 30, fontSize: 18 }}>
        {status === "started" && studentsCount < mode
          ? "Group started early — waiting for others..."
          : "Waiting for other students..."}
      </p>

      <p style={{ marginTop: 10, opacity: 0.7 }}>
        {studentsCount} / {mode} joined
      </p>

      <p style={{ marginTop: 40, opacity: 0.5 }}>Room ID: {roomId}</p>
    </div>
  );
}
