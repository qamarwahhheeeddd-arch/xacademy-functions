// src/hooks/useCamera.js
import { useEffect, useRef } from "react";

export function useCamera(onTrackEndWarning) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
      // 🔹 Ask for BOTH camera + mic
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });

      // ✅ If user ALLOWED → stream available
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // 🔹 If camera/mic stops during exam → warning
      stream.getTracks().forEach((track) => {
        track.onended = () => {
          if (onTrackEndWarning) {
            onTrackEndWarning(
              "Camera/Mic stopped or blocked. This is not allowed during the exam."
            );
          }
        };
      });
    } catch (err) {
      console.error("Media error:", err);

      // ❌ User clicked "Deny" or "Never Allow"
      if (err.name === "NotAllowedError" || err.name === "SecurityError") {
        // Direct redirect to home, no exam access
        window.location.href = "/";
        return;
      }

      // ❌ No camera/mic device found or other issues
      if (onTrackEndWarning) {
        onTrackEndWarning(
          "Camera/Mic access denied or not available. Exam requires them ON."
        );
      }
    }
  };

  useEffect(() => {
    startCamera();

    // Cleanup: stop all tracks when leaving the page
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [onTrackEndWarning]);

  return {
    videoRef,
    streamRef,
    restartCamera: startCamera, // used after break to restart camera
  };
}