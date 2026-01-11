// src/services/examRoomService.js
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { app } from "../firebase";

const db = getFirestore(app);

// ===============================
//  JOIN ROOM (Gen2 backend call)
// ===============================
export async function joinExamRoom(paperType, studentId, mode) {
  try {
    const res = await fetch(
      "https://us-central1-xacademy8-e52db.cloudfunctions.net/joinExamRoomV4",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperType, studentId, mode }),
      }
    );

    if (!res.ok) {
      throw new Error("Network error while joining room");
    }

    const data = await res.json();

    if (!data.success || !data.roomId) {
      throw new Error(data.error || "Failed to join room");
    }

    return data.roomId;
  } catch (err) {
    console.error("joinExamRoom error:", err);
    throw err;
  }
}

// ===============================
//  LISTEN ROOM (Firestore listener)
// ===============================
export function listenExamRoom(roomId, callback) {
  const ref = doc(db, "examRooms", roomId);

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      callback(snap.data());
    },
    (error) => {
      console.error("listenExamRoom error:", error);
      callback(null);
    }
  );
}
