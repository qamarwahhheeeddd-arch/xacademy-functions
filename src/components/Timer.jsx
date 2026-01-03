// src/components/Timer.jsx
import React from "react";

export default function Timer({ seconds }) {
  const secs = seconds.toString().padStart(2, "0");

  return (
    <div style={styles.badge}>
      Time: 00:{secs}
    </div>
  );
}

const styles = {
  badge: {
    padding: "8px 12px",
    background: "#111827",
    borderRadius: "8px",
    border: "1px solid #1f2937",
    fontSize: "14px",
  },
};