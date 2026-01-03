// src/pages/ExamPage.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import ExamUI from "../components/ExamUI";
import BreakScreen from "../components/BreakScreen";
import { useCamera } from "../hooks/useCamera";
import { useAntiCheat } from "../hooks/useAntiCheat";
import { useFaceDetection } from "../hooks/useFaceDetection";
import { joinExamRoom, listenExamRoom } from "../services/examRoomService";

// ====== IMPORT MCQ SETS ======
// MEDICAL
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

// ENGINEERING
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
const BREAK_SECONDS = 90;

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

  // ===== ROOM STATES =====
  const [roomId, setRoomId] = useState(null);
  const [examStarted, setExamStarted] = useState(false);
  const [roomLoading, setRoomLoading] = useState(true);
  const [roomStatus, setRoomStatus] = useState("joining");

  // ===== ANTI‑CHEAT =====
  const handleMaxWarnings = useCallback(() => {
    endExam("warnings");
  }, []);

  const { warnings, addWarning, MAX_WARNINGS } = useAntiCheat(handleMaxWarnings);

  // ===== CAMERA =====
  const { videoRef, streamRef, restartCamera } = useCamera(addWarning);

  // ===== FACE DETECTION =====
  useFaceDetection(videoRef, addWarning, !breakActive);

  // ===== JOIN ROOM =====
  useEffect(() => {
    const course = localStorage.getItem("selectedCourse");
    if (!course) {
      alert("No course selected.");
      navigate("/");
      return;
    }

    const paperType =
      course === "medical"
        ? "medical"
        : course === "engineering"
        ? "engineering"
        : "general";

    const userId = getOrCreateUserId();
    let unsub;

    async function setupRoom() {
      try {
        setRoomLoading(true);
        setRoomStatus("joining");

        const rid = await joinExamRoom(paperType, userId);
        setRoomId(rid);
        setRoomStatus("waiting");

        unsub = listenExamRoom(rid, (data) => {
          if (data.status === "started") {
            setExamStarted(true);
            setRoomStatus("started");
          }
        });
      } catch (e) {
        console.error("Room join error:", e);
        alert("Error joining exam room");
      } finally {
        setRoomLoading(false);
      }
    }

    setupRoom();
    return () => unsub && unsub();
  }, [navigate]);

  // ===== LOAD QUESTIONS =====
  useEffect(() => {
    const course = localStorage.getItem("selectedCourse");
    if (!course) return;

    let examSeq = [];

    if (course === "medical") {
      const medSets = [
        medBiologyB1, medBiologyB2, medBiologyB3, medBiologyB4, medBiologyB5,
        medChemistryCh1, medChemistryCh2, medChemistryCh3, medChemistryCh4, medChemistryCh5,
        medEnglishE1, medEnglishE2, medEnglishE3, medEnglishE4, medEnglishE5,
        medPhysicsP1, medPhysicsP2, medPhysicsP3, medPhysicsP4, medPhysicsP5,
      ];

      const medNewsSets = [medNewsN1, medNewsN2, medNewsN3, medNewsN4, medNewsN5];

      medSets.forEach((set) => examSeq = examSeq.concat(pickRandomFive(set)));
      medNewsSets.forEach((set) => examSeq = examSeq.concat(pickRandomFive(set)));
    }

    if (course === "engineering") {
      const engSets = [
        engEnglishE1, engEnglishE2, engEnglishE3, engEnglishE4, engEnglishE5,
        engComputerC1, engComputerC2, engComputerC3, engComputerC4, engComputerC5,
        engMathM1, engMathM2, engMathM3, engMathM4, engMathM5,
        engPhysicsP1, engPhysicsP2, engPhysicsP3, engPhysicsP4, engPhysicsP5,
      ];

      const engNewsSets = [engNewsN1, engNewsN2, engNewsN3, engNewsN4, engNewsN5];

      engSets.forEach((set) => examSeq = examSeq.concat(pickRandomFive(set)));
      engNewsSets.forEach((set) => examSeq = examSeq.concat(pickRandomFive(set)));
    }

    setQuestions(examSeq);
    setCurrentIndex(0);
    setQuestionTimer(QUESTION_TIME_SECONDS);
  }, [navigate]);

  // ===== TIMER RESET =====
  useEffect(() => {
    if (breakActive || examEnded) return;
    setQuestionTimer(QUESTION_TIME_SECONDS);
    setSelectedOption(null);
  }, [currentIndex, breakActive, examEnded]);

  // ===== QUESTION TIMER COUNTDOWN =====
  useEffect(() => {
    if (breakActive || examEnded) return;
    if (questionTimer <= 0) return;

    const interval = setInterval(() => {
      setQuestionTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [questionTimer, breakActive, examEnded]);

  // ===== TIMER HIT ZERO =====
  useEffect(() => {
    if (examEnded || breakActive) return;
    if (questionTimer !== 0) return;

    if (!selectedOption) {
      setHearts((prev) => {
        const next = prev - 1;
        if (next <= 0) endExam("hearts");
        return next;
      });
    }

    goToNextQuestion();
  }, [questionTimer, examEnded, breakActive, selectedOption]);

  // ===== ANSWER CLICK =====
  function handleOptionClick(option) {
    if (examEnded || breakActive) return;

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

    goToNextQuestion();
  }

  // ===== NEXT QUESTION =====
  function goToNextQuestion() {
    setCurrentIndex((prev) => {
      const next = prev + 1;

      if (next >= questions.length) {
        endExam("winner");
        return prev;
      }

      const nextNumber = next + 1;
      if (nextNumber > 1 && (nextNumber - 1) % 10 === 0) {
        startBreak();
      }

      return next;
    });
  }

  // ===== BREAK =====
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
    if (reason === "timeout-all") msg = "Go and Prepare yourself for success 🏆";

    setEndMessage(msg);
    setShowEndOverlay(true);

    setTimeout(() => navigate("/"), 3000);
  }

  // ===== UI ORDER =====

  // 1) WAITING FOR ROOM
  if (roomLoading || !examStarted) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        textAlign: "center",
      }}>
        <div>
          <h2>Waiting for other students...</h2>
          <p style={{ marginTop: 8 }}>
            Paper type: <strong>{localStorage.getItem("selectedCourse")}</strong>
          </p>
          <p style={{ marginTop: 4 }}>
            Status: {roomStatus === "joining" ? "Joining room" : "Waiting for group (4 students)"}
          </p>
        </div>
      </div>
    );
  }

  // 2) QUESTIONS LOADING
  if (questions.length === 0) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#e5e7eb",
        padding: 16
      }}>
        <h2>Loading exam...</h2>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const heartsDisplay = "❤".repeat(hearts) + "♡".repeat(MAX_HEARTS - hearts);
  const warningsText = `Warnings: ${warnings}/${MAX_WARNINGS}`;

  // 3) BREAK SCREEN
  if (breakActive) {
    return (
      <BreakScreen
        heartsDisplay={heartsDisplay}
        warningsText={warningsText}
        timeLeft={breakTimer}
      />
    );
  }

  // 4) NORMAL EXAM UI
  return (
    <ExamUI
      videoRef={videoRef}
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