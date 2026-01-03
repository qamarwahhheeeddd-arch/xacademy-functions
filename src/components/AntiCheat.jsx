// src/components/AntiCheat.jsx
import React from "react";

/**
 * Optional UI component:
 * - Abhi ye sirf warnings ka status dikhata hai.
 * - Saara logic already useAntiCheat hook me hai.
 * - Agar tum chaho to yahan extra messages, logs, etc. show kar sakte ho.
 */

export default function AntiCheatPanel({ warnings, maxWarnings }) {
  return (
    <div style={styles.container}>
      <p style={styles.title}>Anti‑Cheat Monitoring</p>
      <p style={styles.text}>
        Warnings: <span style={styles.badge}>{warnings}</span> / {maxWarnings}
      </p>
      <p style={styles.helper}>
        Any suspicious activity (blur, back, copy, screenshot, gestures) will
        increase warnings and may end the exam.
      </p>
    </div>
  );
}

const styles = {
  container: {
    marginTop: "8px",
    padding: "8px 10px",
    borderRadius: "8px",
    background: "#020617",
    border: "1px solid #1f2937",
    color: "#e5e7eb",
    fontSize: "12px",
  },
  title: {
    fontSize: "12px",
    fontWeight: "600",
    marginBottom: "4px",
    color: "#a5b4fc",
  },
  text: {
    marginBottom: "4px",
  },
  badge: {
    display: "inline-block",
    padding: "2px 6px",
    borderRadius: "999px",
    background: "#b91c1c",
    fontSize: "11px",
  },
  helper: {
    fontSize: "11px",
    color: "#9ca3af",
  },
};