import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { app } from "../firebase"; // make sure this exports initialized app

const db = getFirestore(app);

export async function joinExamRoom(paperType, studentId, mode) {
  const res = await fetch("/joinExamRoomV3", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paperType,
      studentId,
      mode,
    }),
  });

  if (!res.ok) {
    throw new Error("Network error joining room");
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "Join failed");
  }

  return data.roomId;
}

export function listenExamRoom(roomId, callback) {
  const ref = doc(db, "examRooms", roomId);
  const unsub = onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback(snap.data());
  });

  return unsub;
}
