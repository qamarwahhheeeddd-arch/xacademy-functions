import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate, useLocation } from "react-router-dom";

export default function WaitingPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Data passed from previous page
  const { roomId } = location.state || {};

  const [waitingArray, setWaitingArray] = useState([]);
  const [status, setStatus] = useState("waiting");

  useEffect(() => {
    if (!roomId) return;

    const roomRef = doc(db, "examRooms", roomId);

    // Real-time listener
    const unsub = onSnapshot(roomRef, (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();
      setStatus(data.status);

      // Build waiting array
      const arr = Array(data.maxStudents).fill(0);
      for (let i = 0; i < data.students.length; i++) arr[i] = 1;

      setWaitingArray(arr);

      // If room is full → start exam
      if (data.status === "started") {
        navigate("/exam", { state: { roomId } });
      }
    });

    return () => unsub();
  }, [roomId, navigate]);

  return (
    <div style={styles.container}>
      <h2>Waiting for other students...</h2>

      <div style={styles.box}>
        {waitingArray.map((v, i) => (
          <span key={i} style={styles.item}>
            {v}
          </span>
        ))}
      </div>

      <p style={{ marginTop: "20px" }}>
        Status: <strong>{status}</strong>
      </p>
    </div>
  );
}

const styles = {
  container: {
    textAlign: "center",
    marginTop: "80px",
    fontFamily: "Arial",
  },
  box: {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    fontSize: "40px",
    fontWeight: "bold",
    marginTop: "30px",
  },
  item: {
    padding: "10px 20px",
    border: "2px solid black",
    borderRadius: "10px",
  },
};
