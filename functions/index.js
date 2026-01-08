//===============================
//  GEN2 CLOUD FUNCTIONS (Node 20)
// ===============================
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ===============================
//  JOIN EXAM ROOM (V4) — CLEAN + NO DELAY
// ===============================
exports.joinExamRoomV4 = onRequest({ region: "us-central1" }, async (req, res) => {
  // -------------------------------
  // MANUAL CORS (Gen2 compatible)
  // -------------------------------
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method not allowed");
    }

    const { paperType, studentId, mode } = req.body;
    console.log("JOIN REQUEST:", { paperType, studentId, mode });

    const maxStudents = Number(mode);
    if (!paperType || !studentId || !mode || isNaN(maxStudents) || maxStudents <= 0) {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid fields",
      });
    }

    const roomsCol = db.collection("examRooms");

    // ===============================
    //  FIND WAITING ROOM
    // ===============================
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

      const isFull = students.length === maxStudents;

      const updateData = {
        students,
        updatedAt: admin.firestore.Timestamp.now(),
        currentQuestion: 0,
        answers: {},
        questionDeadline: null,
      };

      // ⭐ INSTANT START — NO DELAY
      if (isFull) {
        updateData.status = "started";
      }

      await targetRoom.update(updateData);

      return res.json({
        success: true,
        roomId: targetRoom.id,
        status: isFull ? "started" : "waiting",
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
      currentQuestion: 0,
      answers: {},
      questionDeadline: null,
      examStartAt: null,
      createdAt: admin.firestore.Timestamp.now(),
    });

    return res.json({
      success: true,
      roomId: newRoomRef.id,
      status: "waiting",
      studentsCount: 1,
    });

  } catch (err) {
    console.error("joinExamRoomV4 error:", err.stack || err.message || err);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});
