// src/components/ExamUI.jsx
import React from "react";
import Timer from "./Timer";
import CameraMonitor from "./CameraMonitor";

const MAX_HEARTS = 5;

export default function ExamUI({
  videoRef,
  remoteStreams,   // ⭐ NEW
  hearts,
  warnings,
  maxWarnings,
  question,
  currentIndex,
  totalQuestions,
  options,
  selectedOption,
  onOptionClick,
  score,
  questionTimer,
  showEndOverlay,
  endMessage,

  breakActive,
  breakTimer,
}) {
  const heartsDisplay =
    "❤".repeat(hearts) + "♡".repeat(MAX_HEARTS - hearts);

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.badge}>Hearts: {heartsDisplay}</div>
        <div style={styles.badge}>
          Warnings: {warnings}/{maxWarnings}
        </div>

        <Timer seconds={breakActive ? breakTimer : questionTimer} />
      </div>

      {/* ⭐ VIDEO GRID (local + remote students) */}
      <div style={styles.videoGrid}>
        {/* Local camera */}
        <div style={styles.videoBox}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={styles.video}
          />
          <p style={styles.videoLabel}>You</p>
        </div>

        {/* Remote students */}
        {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <div key={peerId} style={styles.videoBox}>
            <video
              autoPlay
              playsInline
              style={styles.video}
              ref={(el) => {
                if (el && stream) el.srcObject = stream;
              }}
            />
            <p style={styles.videoLabel}>Student: {peerId}</p>
          </div>
        ))}
      </div>

      {/* ⭐ BREAK MODE OR QUESTION MODE */}
      <div style={styles.questionBox}>
        {breakActive ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <h2>Short Break</h2>
            <p>Next questions will start in: {breakTimer} sec</p>
          </div>
        ) : (
          <>
            <h3>
              Question {currentIndex + 1} of {totalQuestions}
            </h3>
            <p style={styles.questionText}>{question}</p>

            <div style={styles.optionsBox}>
              {options.map((opt) => (
                <button
                  key={opt}
                  style={{
                    ...styles.optionButton,
                    ...(selectedOption === opt ? styles.selectedOption : {}),
                  }}
                  onClick={() => onOptionClick(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div style={styles.resultBox}>
              <p>
                Current Score: {score} / {totalQuestions}
              </p>
            </div>
          </>
        )}
      </div>

      {showEndOverlay && (
        <div style={styles.overlay}>
          <div style={styles.overlayBox}>
            <h2>{endMessage}</h2>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "16px",
    background: "#0f172a",
    color: "#e5e7eb",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    position: "relative",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
  },

  badge: {
    padding: "8px 12px",
    background: "#111827",
    borderRadius: "8px",
    border: "1px solid #1f2937",
    fontSize: "14px",
  },

  /* ⭐ VIDEO GRID */
  videoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    width: "100%",
  },

  videoBox: {
    position: "relative",
    background: "#000",
    borderRadius: "8px",
    overflow: "hidden",
    border: "1px solid #1f2937",
  },

  video: {
    width: "100%",
    height: "140px",
    objectFit: "cover",
    background: "#000",
  },

  videoLabel: {
    position: "absolute",
    bottom: "4px",
    left: "4px",
    padding: "2px 6px",
    background: "rgba(0,0,0,0.6)",
    fontSize: "12px",
    borderRadius: "4px",
  },

  questionBox: {
    flex: 1,
    background: "#020617",
    borderRadius: "12px",
    border: "1px solid #1f2937",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  questionText: {
    fontSize: "16px",
    fontWeight: "500",
  },

  optionsBox: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  optionButton: {
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #374151",
    background: "#020617",
    color: "#e5e7eb",
    cursor: "pointer",
  },

  selectedOption: {
    background: "#1d4ed8",
    borderColor: "#2563eb",
  },

  resultBox: {
    marginTop: "20px",
    padding: "8px",
    borderRadius: "8px",
    background: "#111827",
    border: "1px solid #1f2937",
    fontSize: "14px",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },

  overlayBox: {
    background: "#020617",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #1f2937",
    textAlign: "center",
    minWidth: "260px",
  },
};
