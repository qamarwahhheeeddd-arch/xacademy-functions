// src/pages/ExamPage.jsx
import { useVideoRoom } from "../hooks/useVideoRoom";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import { db } from "../firebase";

import ExamUI from "../components/ExamUI";
import BreakScreen from "../components/BreakScreen";
import { useCamera } from "../hooks/useCamera";
import { useAntiCheat } from "../hooks/useAntiCheat";
import { useFaceDetection } from "../hooks/useFaceDetection";

// ====== MCQ SETS (same as before) ======
import { medBiologyB1 } from "../Paper data/Medical paper/Biology/B1";
import { medBiologyB2 } from "../Paper data/Medical paper/Biology/B2";
import { medBiologyB3 } from "../Paper data/Medical paper/Biology/B3";
import { medBiologyB4 } from "../Paper data/Medical paper/Biology/B4";
import { medBiologyB5 } from "../Paper data/Medical paper/Biology/B5";

import { medChemistryCh1 } from "../Paper data/Medical paper/Chemistry/Ch1";
import { medChemistryCh2 } from "../Paper data/Medical paper/Chemistry/Ch2";
import { medChemistryCh3 } from "../Paper data/Medical paper/Chemistry/Ch3";
import { medChemistryCh4 } from "../Paper data/Medical paper/Chemistry/Ch4";
import { medChemistryCh5 } from "../Paper data/Medical paper/Chemistry/Ch5";

import { medEnglishE1 } from "../Paper data/Medical paper/English/E1";
import { medEnglishE2 } from "../Paper data/Medical paper/English/E2";
import { medEnglishE3 } from "../Paper data/Medical paper/English/E3";
import { medEnglishE4 } from "../Paper data/Medical paper/English/E4";
import { medEnglishE5 } from "../Paper data/Medical paper/English/E5";

import { medPhysicsP1 } from "../Paper data/Medical paper/Physics/P1";
import { medPhysicsP2 } from "../Paper data/Medical paper/Physics/P2";
import { medPhysicsP3 } from "../Paper data/Medical paper/Physics/P3";
import { medPhysicsP4 } from "../Paper data/Medical paper/Physics/P4";
import { medPhysicsP5 } from "../Paper data/Medical paper/Physics/P5";

import { medNewsN1 } from "../Paper data/Medical paper/News/N1";
import { medNewsN2 } from "../Paper data/Medical paper/News/N2";
import { medNewsN3 } from "../Paper data/Medical paper/News/N3";
import { medNewsN4 } from "../Paper data/Medical paper/News/N4";
import { medNewsN5 } from "../Paper data/Medical paper/News/N5";

import { engEnglishE1 } from "../Paper data/Engineering paper/English/E1";
import { engEnglishE2 } from "../Paper data/Engineering paper/English/E2";
import { engEnglishE3 } from "../Paper data/Engineering paper/English/E3";
import { engEnglishE4 } from "../Paper data/Engineering paper/English/E4";
import { engEnglishE5 } from "../Paper data/Engineering paper/English/E5";

import { engComputerC1 } from "../Paper data/Engineering paper/Computer/C1";
import { engComputerC2 } from "../Paper data/Engineering paper/Computer/C2";
import { engComputerC3 } from "../Paper data/Engineering paper/Computer/C3";
import { engComputerC4 } from "../Paper data/Engineering paper/Computer/C4";
import { engComputerC5 } from "../Paper data/Engineering paper/Computer/C5";

import { engMathM1 } from "../Paper data/Engineering paper/Math/M1";
import { engMathM2 } from "../Paper data/Engineering paper/Math/M2";
import { engMathM3 } from "../Paper data/Engineering paper/Math/M3";
import { engMathM4 } from "../Paper data/Engineering paper/Math/M4";
import { engMathM5 } from "../Paper data/Engineering paper/Math/M5";

import { engPhysicsP1 } from "../Paper data/Engineering paper/Physics/P1";
import { engPhysicsP2 } from "../Paper data/Engineering paper/Physics/P2";
import { engPhysicsP3 } from "../Paper data/Engineering paper/Physics/P3";
import { engPhysicsP4 } from "../Paper data/Engineering paper/Physics/P4";
import { engPhysicsP5 } from "../Paper data/Engineering paper/Physics/P5";

import { engNewsN1 } from "../Paper data/Engineering paper/News/N1";
import { engNewsN2 } from "../Paper data/Engineering paper/News/N2";
import { engNewsN3 } from "../Paper data/Engineering paper/News/N3";
import { engNewsN4 } from "../Paper data/Engineering paper/News/N4";
import { engNewsN5 } from "../Paper data/Engineering paper/News/N5";

// ====== CONSTANTS ======
const MAX_HEARTS = 5;
const QUESTION_TIME_SECONDS = 15;
const BREAK_SECONDS = 10;

// ====== HELPERS ======
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRandomFive(arr) {
  const shuffled = shuffle(arr || []);
  return shuffled.slice(0, Math.min(5, shuffled.length));
}

function getOrCreateUserId() {
  let id = localStorage.getItem("examUserId");
  if (!id) {
    id = "user_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("examUserId", id);
  }
  return id;
}

// ====== COMPONENT ======
export default function ExamPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const paperType = location.state?.paperType;
  const mode = Number(location.state?.mode || 2);
  const roomId = location.state?.roomId;

  const userId = getOrCreateUserId();

  // Guards
  useEffect(() => {
    if (!paperType || !mode || !roomId || isNaN(mode)) {
      navigate("/");
    }
  }, []);

  // ===== STATES =====
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);

  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [score, setScore] = useState(0);

  const [questionTimer, setQuestionTimer] = useState(QUESTION_TIME_SECONDS);
  const [breakActive, setBreakActive] = useState(false);
  const [breakTimer, setBreakTimer] = useState(0);

  const [examEnded, setExamEnded] = useState(false);
  const [endMessage, setEndMessage] = useState("");
  const [showEndOverlay, setShowEndOverlay] = useState(false);

  const hasSubmittedRef = useRef(false);

  // Room sync
  const [roomData, setRoomData] = useState(null);

  // ===== ANTI‑CHEAT =====
  const handleMaxWarnings = useCallback(() => {
    endExam("warnings");
  }, []);

  const { warnings, addWarning, MAX_WARNINGS } =
    useAntiCheat(handleMaxWarnings);

  // ===== CAMERA =====
  // ===== CAMERA + MULTI-VIDEO =====
const {
  videoRef,
  streamRef,
  remoteStreams,
  peersRef,
  addRemoteStream,
  removeRemoteStream,
  restartCamera,
} = useCamera(addWarning);
// ===== WEBRTC VIDEO ROOM =====
useVideoRoom({
  roomId,
  userId,
  streamRef,
  peersRef,
  addRemoteStream,
  removeRemoteStream,
});


  // ===== FACE DETECTION =====
  useFaceDetection(videoRef, addWarning, !breakActive);

  // ===== LOAD QUESTIONS (same for all students) =====
  useEffect(() => {
    let examSeq = [];

    if (paperType === "medical") {
      const medSets = [
        medBiologyB1,
        medBiologyB2,
        medBiologyB3,
        medBiologyB4,
        medBiologyB5,
        medChemistryCh1,
        medChemistryCh2,
        medChemistryCh3,
        medChemistryCh4,
        medChemistryCh5,
        medEnglishE1,
        medEnglishE2,
        medEnglishE3,
        medEnglishE4,
        medEnglishE5,
        medPhysicsP1,
        medPhysicsP2,
        medPhysicsP3,
        medPhysicsP4,
        medPhysicsP5,
      ];

      const medNewsSets = [
        medNewsN1,
        medNewsN2,
        medNewsN3,
        medNewsN4,
        medNewsN5,
      ];

      medSets.forEach(
        (set) => (examSeq = examSeq.concat(pickRandomFive(set)))
      );
      medNewsSets.forEach(
        (set) => (examSeq = examSeq.concat(pickRandomFive(set)))
      );
    }

    if (paperType === "engineering") {
      const engSets = [
        engEnglishE1,
        engEnglishE2,
        engEnglishE3,
        engEnglishE4,
        engEnglishE5,
        engComputerC1,
        engComputerC2,
        engComputerC3,
        engComputerC4,
        engComputerC5,
        engMathM1,
        engMathM2,
        engMathM3,
        engMathM4,
        engMathM5,
        engPhysicsP1,
        engPhysicsP2,
        engPhysicsP3,
        engPhysicsP4,
        engPhysicsP5,
      ];

      const engNewsSets = [
        engNewsN1,
        engNewsN2,
        engNewsN3,
        engNewsN4,
        engNewsN5,
      ];

      engSets.forEach(
        (set) => (examSeq = examSeq.concat(pickRandomFive(set)))
      );
      engNewsSets.forEach(
        (set) => (examSeq = examSeq.concat(pickRandomFive(set)))
      );
    }

    setQuestions(examSeq);
  }, [paperType]);

  // ===== ROOM LISTENER (global sync) =====
  useEffect(() => {
    if (!roomId) return;

    const ref = doc(db, "examRooms", roomId);

    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setRoomData(data);

      // Sync current question index
      if (typeof data.currentQuestion === "number") {
        setCurrentIndex(data.currentQuestion);
      }

      // Sync timer from deadline
      if (data.questionDeadline) {
        const deadline = data.questionDeadline.toDate();
        const now = new Date();
        const diff = Math.max(
          0,
          Math.floor((deadline.getTime() - now.getTime()) / 1000)
        );
        setQuestionTimer(diff);
      }
    });

    return () => unsub();
  }, [roomId]);

  // ===== LOCAL TIMER FALLBACK (just to tick UI) =====
  useEffect(() => {
    if (breakActive || examEnded) return;
    if (questionTimer <= 0) return;

    const interval = setInterval(() => {
      setQuestionTimer((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [questionTimer, breakActive, examEnded]);

  // ===== ANSWER CLICK (write to Firestore answers) =====
  async function handleOptionClick(option) {
    if (examEnded || breakActive) return;
    if (!roomId || !roomData) return;

    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    setSelectedOption(option);

    const correct =
      currentQ.correctAnswer ??
      currentQ.correctOption ??
      currentQ.answer;

    if (option === correct) {
      setScore((s) => s + 1);
    } else {
      setHearts((prev) => {
        const next = prev - 1;
        if (next <= 0) endExam("hearts");
        return next;
      });
    }

    const ref = doc(db, "examRooms", roomId);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const data = snap.data();

      const answers = data.answers || {};
      answers[userId] = option;

      tx.update(ref, { answers });
    });
  }

  // ===== CHECK IF WE SHOULD ADVANCE QUESTION =====
  useEffect(() => {
    if (!roomData || !roomId || examEnded) return;
    if (!roomData.students || !Array.isArray(roomData.students)) return;

    const students = roomData.students.filter(Boolean);
    const answers = roomData.answers || {};
    const deadline = roomData.questionDeadline
      ? roomData.questionDeadline.toDate()
      : null;

    const now = new Date();

    const allAnswered = students.every((sid) => answers[sid]);
    const timeOver = deadline && now >= deadline;

    // Only leader student (first in array) will drive the transition
    const isLeader = students[0] === userId;

    if (!isLeader) return;
    if (!allAnswered && !timeOver) return;

    // Leader moves to next question
    advanceQuestion(students, answers, timeOver);
  }, [roomData, examEnded]);

  // ===== ADVANCE QUESTION (transaction) =====
  async function advanceQuestion(students, answers, timeOver) {
    if (!roomId) return;

    const ref = doc(db, "examRooms", roomId);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const data = snap.data();

      const currentQ = data.currentQuestion || 0;
      const totalQuestions = questions.length;

      // Hearts penalty for those who didn't answer when timeOver
      if (timeOver) {
        // Hearts per student can be stored in room if you want global sync later
        // For now, we only handle local hearts in UI
      }

      const nextQ = currentQ + 1;

      if (nextQ >= totalQuestions) {
        // Exam finished for this room
        tx.update(ref, {
          currentQuestion: currentQ,
          status: "finished",
        });
        return;
      }

      const newDeadline = new Date(
        Date.now() + QUESTION_TIME_SECONDS * 1000
      );

      tx.update(ref, {
        currentQuestion: nextQ,
        questionDeadline: newDeadline,
        answers: {}, // reset answers for next question
      });
    });
  }

  // ===== BREAK LOGIC (local, optional) =====
  function startBreak() {
    setBreakActive(true);
    setBreakTimer(BREAK_SECONDS);
  }

  useEffect(() => {
    if (!breakActive) return;
    if (breakTimer <= 0) {
      setBreakActive(false);
      restartCamera();
      return;
    }

    const interval = setInterval(() => {
      setBreakTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [breakActive, breakTimer, restartCamera]);

  // ===== END EXAM =====
  function endExam(reason) {
    if (hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;

    setExamEnded(true);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    let msg = "";
    if (reason === "warnings") msg = "Go and Be Honest";
    if (reason === "hearts") msg = "Go and Prepare again➡️";
    if (reason === "winner") msg = "😎 Winner vibes only💲";
    if (reason === "timeout-all")
      msg = "Go and Prepare yourself for success 🏆";

    setEndMessage(msg);
    setShowEndOverlay(true);

    setTimeout(() => navigate("/"), 3000);
  }

  // ===== UI ORDER =====

  if (!roomData || roomData.status !== "started") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          color: "#e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          textAlign: "center",
        }}
      >
        <div>
          <h2>Waiting for exam to start...</h2>
          <p style={{ marginTop: 8 }}>
            Room: <strong>{roomId}</strong>
          </p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          color: "#e5e7eb",
          padding: 16,
        }}
      >
        <h2>Loading exam...</h2>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const heartsDisplay =
    "❤".repeat(hearts) + "♡".repeat(MAX_HEARTS - hearts);
  const warningsText = `Warnings: ${warnings}/${MAX_WARNINGS}`;

  if (breakActive) {
    return (
      <BreakScreen
        heartsDisplay={heartsDisplay}
        warningsText={warningsText}
        timeLeft={breakTimer}
      />
    );
  }

  return (
    <ExamUI
      videoRef={videoRef}
      remoteStreams={remoteStreams}
      hearts={hearts}
      warnings={warnings}
      maxWarnings={MAX_WARNINGS}
      question={currentQ.question}
      currentIndex={currentIndex}
      totalQuestions={questions.length}
      options={currentQ.options}
      selectedOption={selectedOption}
      onOptionClick={handleOptionClick}
      score={score}
      questionTimer={questionTimer}
      showEndOverlay={showEndOverlay}
      endMessage={endMessage}
    />
  );
}
