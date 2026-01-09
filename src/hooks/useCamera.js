// src/hooks/useCamera.js
import { useEffect, useRef, useState } from "react";

export function useCamera(onTrackEndWarning) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [remoteStreams, setRemoteStreams] = useState({});
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

  const addRemoteStream = (peerId, stream) => {
    setRemoteStreams((prev) => ({
      ...prev,
      [peerId]: stream,
    }));
  };

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

      Object.values(peersRef.current).forEach((pc) => pc.close());
    };
  }, [onTrackEndWarning]);

  return {
    videoRef,
    streamRef,
    remoteStreams,
    peersRef,
    addRemoteStream,
    removeRemoteStream,
    restartCamera: startCamera,
  };
}
