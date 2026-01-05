const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/*
===========================================================
 JOIN EXAM ROOM V3 — Groups by paperType + mode
===========================================================
*/
exports.joinExamRoomV3 = onRequest({ region: "us-central1" }, async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method not allowed");
    }

    const { paperType, studentId, mode } = req.body;

    const maxStudents = Number(mode);

    if (!paperType || !studentId || !maxStudents) {
      return res
        .status(400)
        .json({ success: false, error: "Missing fields" });
    }

    const roomsCol = db.collection("examRooms");

    const qSnap = await roomsCol
      .where("paperType", "==", paperType)
      .where("maxStudents", "==", maxStudents)
      .where("status", "==", "waiting")
      .get();

    let targetRoom = null;

    qSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const students = Array.isArray(data.students) ? data.students : [];
      if (students.length < maxStudents) {
        targetRoom = docSnap.ref;
      }
    });

    if (targetRoom) {
      const roomDoc = await targetRoom.get();
      const roomData = roomDoc.data();
      const students = Array.isArray(roomData.students)
        ? roomData.students
        : [];

      if (!students.includes(studentId)) {
        students.push(studentId);
      }

      const status = students.length === maxStudents ? "started" : "waiting";

      await targetRoom.update({
        students,
        status,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      return res.json({
        success: true,
        roomId: targetRoom.id,
        status,
        studentsCount: students.length,
      });
    }

    const newRoomRef = roomsCol.doc();
    const newRoomData = {
      paperType,
      maxStudents,
      students: [studentId],
      status: "waiting",
      createdAt: admin.firestore.Timestamp.now(),
    };

    await newRoomRef.set(newRoomData);

    return res.json({
      success: true,
      roomId: newRoomRef.id,
      status: "waiting",
      studentsCount: 1,
    });
  } catch (err) {
    console.error("joinExamRoomV3 error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
});
