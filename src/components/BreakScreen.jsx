// src/components/BreakScreen.jsx
import React from "react";

export default function BreakScreen({ heartsDisplay, warningsText, timeLeft }) {
  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div style={styles.badge}>Hearts: {heartsDisplay}</div>
        <div style={styles.badge}>{warningsText}</div>
      </div>
      <div style={styles.questionBox}>
        <h3>Short Break</h3>
        <p>Next questions will start in: {timeLeft} sec</p>
      </div>
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
};