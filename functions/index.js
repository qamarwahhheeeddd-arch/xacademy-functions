const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/*
===========================================================
  JOIN EXAM ROOM V2 — Supports 2 & 4 student modes
  ===========================================================
  */
  exports.joinExamRoomV2 = onRequest({ region: "us-central1" }, async (req, res) => {
    try {
        if (req.method !== "POST") return res.status(405).send("Method not allowed");

            const { paperType, studentId, mode } = req.body;

                if (!paperType || !studentId || !mode) {
                      return res.status(400).json({ success: false, error: "Missing fields" });
                          }

                              const roomsCol = db.collection("examRooms");

                                  // Find waiting room with same paperType + mode
                                      const qSnap = await roomsCol
                                            .where("paperType", "==", paperType)
                                                  .where("maxStudents", "==", mode)
                                                        .where("status", "==", "waiting")
                                                              .get();

                                                                  let targetRoom = null;

                                                                      qSnap.forEach((doc) => {
                                                                            const data = doc.data();
                                                                                  const students = Array.isArray(data.students) ? data.students : [];
                                                                                        if (students.length < mode) targetRoom = doc.ref;
                                                                                            });

                                                                                                // If room found → join it
                                                                                                    if (targetRoom) {
                                                                                                          const roomData = (await targetRoom.get()).data();
                                                                                                                const students = Array.isArray(roomData.students) ? roomData.students : [];

                                                                                                                      if (!students.includes(studentId)) {
                                                                                                                              students.push(studentId);
                                                                                                                                    }

                                                                                                                                          const status = students.length === mode ? "started" : "waiting";

                                                                                                                                                await targetRoom.update({
                                                                                                                                                        students,
                                                                                                                                                                status,
                                                                                                                                                                        updatedAt: admin.firestore.Timestamp.now(),
                                                                                                                                                                              });

                                                                                                                                                                                    return res.json({
                                                                                                                                                                                            success: true,
                                                                                                                                                                                                    roomId: targetRoom.id,
                                                                                                                                                                                                            status,
                                                                                                                                                                                                                  });
                                                                                                                                                                                                                      }

                                                                                                                                                                                                                          // Otherwise create new room
                                                                                                                                                                                                                              const newRoomRef = roomsCol.doc();
                                                                                                                                                                                                                                  const newRoomData = {
                                                                                                                                                                                                                                        paperType,
                                                                                                                                                                                                                                              maxStudents: mode,
                                                                                                                                                                                                                                                    students: [studentId],
                                                                                                                                                                                                                                                          status: "waiting",
                                                                                                                                                                                                                                                                createdAt: admin.firestore.Timestamp.now(),
                                                                                                                                                                                                                                                                    };

                                                                                                                                                                                                                                                                        await newRoomRef.set(newRoomData);

                                                                                                                                                                                                                                                                            return res.json({
                                                                                                                                                                                                                                                                                  success: true,
                                                                                                                                                                                                                                                                                        roomId: newRoomRef.id,
                                                                                                                                                                                                                                                                                              status: "waiting",
                                                                                                                                                                                                                                                                                                  });

                                                                                                                                                                                                                                                                                                    } catch (err) {
                                                                                                                                                                                                                                                                                                        console.error("joinExamRoomV2 error:", err);
                                                                                                                                                                                                                                                                                                            return res.status(500).json({ success: false, error: "Internal server error" });
                                                                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                                                                              });