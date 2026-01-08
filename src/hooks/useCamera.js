// src/hooks/useCamera.js
import { useEffect, useRef, useState } from "react";

export function useCamera(onTrackEndWarning) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // ⭐ NEW: remote students ki video streams
  const [remoteStreams, setRemoteStreams] = useState({});

  // ⭐ NEW: WebRTC peer connections
  const peersRef = useRef({});

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Camera/mic stop warning
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

      if (err.name === "NotAllowedError" || err.name === "SecurityError") {
        window.location.href = "/";
        return;
      }

      if (onTrackEndWarning) {
        onTrackEndWarning(
          "Camera/Mic access denied or not available. Exam requires them ON."
        );
      }
    }
  };

  // ⭐ NEW: Add remote stream from WebRTC peer
  const addRemoteStream = (peerId, stream) => {
    setRemoteStreams((prev) => ({
      ...prev,
      [peerId]: stream,
    }));
  };

  // ⭐ NEW: Remove remote stream when peer disconnects
  const removeRemoteStream = (peerId) => {
    setRemoteStreams((prev) => {
      const updated = { ...prev };
      delete updated[peerId];
      return updated;
    });
  };

  useEffect(() => {
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      // Stop all peer connections
      Object.values(peersRef.current).forEach((pc) => pc.close());
    };
  }, [onTrackEndWarning]);

  return {
    videoRef,          // local video
    streamRef,         // local stream
    remoteStreams,     // ⭐ all remote students' streams
    peersRef,          // ⭐ WebRTC peer connections
    addRemoteStream,   // ⭐ add remote stream
    removeRemoteStream,// ⭐ remove remote stream
    restartCamera: startCamera,
  };
}
