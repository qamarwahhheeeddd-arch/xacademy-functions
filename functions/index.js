// ===============================
//  GEN2 CLOUD FUNCTIONS (Node 20)
// ===============================
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// Initialize Firebase Admin once
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ===============================
//  JOIN EXAM ROOM (V3)
// ===============================
exports.joinExamRoomV3 = onRequest({ region: "us-central1" }, async (req, res) => {
  try {
    // Allow only POST
    if (req.method !== "POST") {
      return res.status(405).send("Method not allowed");
    }

    const { paperType, studentId, mode } = req.body;
    console.log("JOIN REQUEST:", { paperType, studentId, mode });

    // Validate input
    const maxStudents = Number(mode);
    if (!paperType || !studentId || !mode || isNaN(maxStudents) || maxStudents <= 0) {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid fields",
      });
    }

    const roomsCol = db.collection("examRooms");

    // Find an existing waiting room
    const qSnap = await roomsCol
      .where("paperType", "==", paperType)
      .where("maxStudents", "==", maxStudents)
      .where("status", "==", "waiting")
      .get();

    let targetRoom = null;

    qSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const students = Array.isArray(data.students)
        ? data.students.filter(Boolean)
        : [];

      if (students.length < maxStudents) {
        targetRoom = docSnap.ref;
      }
    });

    // ===============================
    //  JOIN EXISTING ROOM
    // ===============================
    if (targetRoom) {
      const roomDoc = await targetRoom.get();
      const roomData = roomDoc.data();

      const students = Array.isArray(roomData.students)
        ? roomData.students.filter(Boolean)
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

    // ===============================
    //  CREATE NEW ROOM
    // ===============================
    const newRoomRef = roomsCol.doc();

    await newRoomRef.set({
      paperType,
      maxStudents,
      students: [studentId],
      status: "waiting",
      createdAt: admin.firestore.Timestamp.now(),
    });

    return res.json({
      success: true,
      roomId: newRoomRef.id,
      status: "waiting",
      studentsCount: 1,
    });

  } catch (err) {
    console.error("joinExamRoomV3 error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});
