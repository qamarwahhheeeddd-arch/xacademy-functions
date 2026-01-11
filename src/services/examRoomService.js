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
      console.error("❌ joinExamRoom HTTP error:", res.status);
      throw new Error("Network error while joining room");
    }

    let data;
    try {
      data = await res.json();
    } catch (e) {
      console.error("❌ joinExamRoom JSON parse error:", e);
      throw new Error("Invalid server response");
    }

    if (!data.success || !data.roomId) {
      console.error("❌ joinExamRoom backend error:", data);
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
  if (!roomId) {
    console.error("listenExamRoom called without roomId");
    callback(null);
    return () => {};
  }

  const ref = doc(db, "examRooms", roomId);

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }

      const data = snap.data() || {};
      callback(data);
    },
    (error) => {
      console.error("listenExamRoom error:", error);
      callback(null);
    }
  );
}
