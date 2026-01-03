// src/services/examRoomService.js
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

// Random room ID generator
function randomId(len = 8) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

// ⭐ JOIN ROOM (medical/engineering)
export async function joinExamRoom(paperType, userId) {
  const roomsCol = collection(db, "examRooms");

  // Find a room that:
  // - same paperType
  // - status = "waiting"
  // - students < 4
  const q = query(
    roomsCol,
    where("paperType", "==", paperType),
    where("status", "==", "waiting")
  );

  const snap = await getDocs(q);
  let targetRoom = null;

  snap.forEach((d) => {
    const data = d.data();
    if ((data.students || []).length < data.maxStudents) {
      targetRoom = { id: d.id, data };
    }
  });

  // ⭐ If room found → join it
  if (targetRoom) {
    const roomRef = doc(db, "examRooms", targetRoom.id);
    const currentStudents = targetRoom.data.students || [];

    if (!currentStudents.includes(userId)) {
      const updated = [...currentStudents, userId];
      await updateDoc(roomRef, { students: updated });

      // ⭐ If now 4 students → start exam
      if (updated.length === targetRoom.data.maxStudents) {
        await updateDoc(roomRef, { status: "started" });
      }
    }

    return targetRoom.id;
  }

  // ⭐ No room found → create new room
  const newRoomId = `${paperType}-${randomId()}`;
  const newRoomRef = doc(db, "examRooms", newRoomId);

  await setDoc(newRoomRef, {
    paperType,
    roomId: newRoomId,
    maxStudents: 2,
    students: [userId],
    status: "waiting",
    createdAt: Date.now(),
  });

  return newRoomId;
}

// ⭐ LISTEN TO ROOM STATUS
export function listenExamRoom(roomId, callback) {
  const roomRef = doc(db, "examRooms", roomId);
  return onSnapshot(roomRef, (snap) => {
    if (!snap.exists()) return;
    callback(snap.data());
  });
}