import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { app } from "../firebase";

const db = getFirestore(app);

export async function joinExamRoom(paperType, studentId, mode) {
  const res = await fetch("/joinExamRoomV3", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paperType, studentId, mode }),
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error);
  return data.roomId;
}

export function listenExamRoom(roomId, callback) {
  const ref = doc(db, "examRooms", roomId);
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}
