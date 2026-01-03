const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/*
===========================================================
  1) JOIN EXAM  (MAIN GROUPING LOGIC)
===========================================================
*/
exports.joinExamHttp = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const { paperType, studentId, mode } = req.body;
    if (!paperType || !studentId || !mode)
      return res.status(400).json({ success: false, error: "Missing fields" });

    const roomsCol = db.collection("examRooms");

    // Find existing waiting room
    const qSnap = await roomsCol
      .where("paperType", "==", paperType)
      .where("status", "==", "waiting")
      .where("maxStudents", "==", mode)
      .get();

    let targetRoom = null;

    qSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const students = data.students || [];
      if (students.length < mode) targetRoom = docSnap.ref;
    });

    // If room found → join it
    if (targetRoom) {
      const roomData = (await targetRoom.get()).data();
      const currentStudents = roomData.students || [];

      if (!currentStudents.includes(studentId)) {
        currentStudents.push(studentId);
      }

      const status = currentStudents.length === mode ? "started" : "waiting";

      await targetRoom.update({
        students: currentStudents,
        status,
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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await newRoomRef.set(newRoomData);

    return res.json({
      success: true,
      roomId: newRoomRef.id,
      status: "waiting",
    });
  } catch (err) {
    console.error("joinExamHttp error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/*
===========================================================
  2) LEAVE EXAM (Student leaves room)
===========================================================
*/
exports.leaveExam = functions.https.onRequest(async (req, res) => {
  try {
    const { roomId, studentId } = req.body;

    if (!roomId || !studentId)
      return res.status(400).json({ success: false, error: "Missing fields" });

    const roomRef = db.collection("examRooms").doc(roomId);
    const roomData = (await roomRef.get()).data();

    if (!roomData) return res.json({ success: false, error: "Room not found" });

    const updated = (roomData.students || []).filter((s) => s !== studentId);

    await roomRef.update({
      students: updated,
      status: updated.length === 0 ? "ended" : "waiting",
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("leaveExam error:", err);
    return res.status(500).json({ success: false });
  }
});

/*
===========================================================
  3) GET ROOM STATUS (Frontend polling)
===========================================================
*/
exports.getRoomStatus = functions.https.onRequest(async (req, res) => {
  try {
    const { roomId } = req.query;

    if (!roomId) return res.status(400).json({ success: false });

    const roomRef = db.collection("examRooms").doc(roomId);
    const roomData = (await roomRef.get()).data();

    if (!roomData) return res.json({ success: false, error: "Room not found" });

    return res.json({ success: true, data: roomData });
  } catch (err) {
    console.error("getRoomStatus error:", err);
    return res.status(500).json({ success: false });
  }
});

/*
===========================================================
  4) FINISH EXAM (Student submits exam)
===========================================================
*/
exports.finishExam = functions.https.onRequest(async (req, res) => {
  try {
    const { roomId, studentId, score } = req.body;

    if (!roomId || !studentId || score === undefined)
      return res.status(400).json({ success: false });

    const roomRef = db.collection("examRooms").doc(roomId);

    await roomRef.update({
      [`results.${studentId}`]: score,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("finishExam error:", err);
    return res.status(500).json({ success: false });
  }
});

/*
===========================================================
  5) AUTO DELETE OLD ROOMS (Every 24 hours)
===========================================================
*/
exports.autoDeleteOldRooms = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async () => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    const qSnap = await db
      .collection("examRooms")
      .where("createdAt", "<", new Date(cutoff))
      .get();

    const batch = db.batch();

    qSnap.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();
    return null;
  });

/*
===========================================================
  6) STUDENT PROGRESS UPDATE (Anti-cheat placeholder)
===========================================================
*/
exports.updateProgress = functions.https.onRequest(async (req, res) => {
  try {
    const { roomId, studentId, progress } = req.body;

    if (!roomId || !studentId)
      return res.status(400).json({ success: false });

    await db
      .collection("examRooms")
      .doc(roomId)
      .update({
        [`progress.${studentId}`]: progress,
      });

    return res.json({ success: true });
  } catch (err) {
    console.error("updateProgress error:", err);
    return res.status(500).json({ success: false });
  }
});