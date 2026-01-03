// src/components/CameraMonitor.jsx
import React from "react";

export default function CameraMonitor({ videoRef }) {
  return (
    <div style={styles.cameraContainer}>
      <p style={styles.cameraLabel}>Camera & Mic Monitoring</p>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={styles.video}
      />
    </div>
  );
}

const styles = {
  cameraContainer: {
    alignSelf: "flex-end",
    background: "#111827",
    padding: "8px",
    borderRadius: "8px",
    border: "1px solid #1f2937",
    width: "180px",
  },
  cameraLabel: {
    fontSize: "12px",
    marginBottom: "4px",
    color: "#9ca3af",
  },
  video: {
    width: "100%",
    borderRadius: "6px",
    backgroundColor: "black",
  },
};