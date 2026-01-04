// src/services/examRoomService.js
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

// ⭐ JOIN ROOM USING BACKEND FUNCTION
export async function joinExamRoom(paperType, userId, mode) {
  try {
      const res = await fetch(
            "https://joinexamroomv2-wgpqbabjv2q-uc.a.run.app",
                  {
                          method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({
                                                    paperType,
                                                              studentId: userId,
                                                                        mode
                                                                                })
                                                                                      }
                                                                                          );

                                                                                              const data = await res.json();
                                                                                                  if (!data.success) throw new Error("Join failed");

                                                                                                      return data.roomId;

                                                                                                        } catch (err) {
                                                                                                            console.error("joinExamRoom error:", err);
                                                                                                                throw err;
                                                                                                                  }
                                                                                                                  }

                                                                                                                  // ⭐ LISTEN TO ROOM STATUS (REALTIME)
                                                                                                                  export function listenExamRoom(roomId, callback) {
                                                                                                                    const ref = doc(db, "examRooms", roomId);

                                                                                                                      return onSnapshot(ref, (snap) => {
                                                                                                                          if (!snap.exists()) return;
                                                                                                                              callback(snap.data());
                                                                                                                                });
                                                                                                                                }