// src/hooks/useVideoRoom.js
import { useEffect, useRef, useState } from "react";

export default function useVideoRoom() {
  const pcRef = useRef(null);
  const wsRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const startedRef = useRef(false);

  // Helper: safely send JSON over WebSocket
  const sendSignal = (msg) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("WS not ready, dropping message:", msg);
      return;
    }
    try {
      wsRef.current.send(JSON.stringify(msg));
    } catch (e) {
      console.error("WS send error:", e);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        wsRef.current?.close();
      } catch (e) {
        console.error("WS close error:", e);
      }
      try {
        pcRef.current?.close();
      } catch (e) {
        console.error("PC close error:", e);
      }
    };
  }, []);

  const start = async (roomId) => {
    console.log("🎥 DEBUG: useVideoRoom.start called with roomId:", roomId);
    if (!roomId) {
      console.error("❌ No roomId passed to start()");
      return;
    }

    if (startedRef.current) {
      console.log("⚠️ useVideoRoom.start called again, ignoring");
      return;
    }
    startedRef.current = true;

    // 1) Setup WebSocket
    wsRef.current = new WebSocket(
      `wss://xacademy-functions.web.app/ws?roomId=${encodeURIComponent(
        roomId
      )}`
    );

    wsRef.current.onclose = (ev) => {
      console.log("WS closed:", ev.code, ev.reason || "");
    };

    await new Promise((resolve, reject) => {
      wsRef.current.onopen = () => {
        console.log("🔗 WS connected");
        resolve();
      };
      wsRef.current.onerror = (err) => {
        console.error("WS error:", err);
        reject(err);
      };
    });

    // 2) Setup PeerConnection
    pcRef.current = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:157.180.41.49:3478",
          username: "examuser",
          credential: "ExamStrongPass123",
        },
      ],
      iceTransportPolicy: "all",
    });

    pcRef.current.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal({ iceCandidate: e.candidate });
      }
    };

    pcRef.current.onconnectionstatechange = () => {
      const state = pcRef.current.connectionState;
      console.log("🔁 PC state:", state);
      setConnected(state === "connected");

      if (
        state === "failed" ||
        state === "disconnected" ||
        state === "closed"
      ) {
        // optional: you could try to restart here
      }
    };

    pcRef.current.ontrack = (e) => {
      console.log("🎬 ontrack fired");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    // 3) Setup WebSocket message handler (after pcRef exists)
    wsRef.current.onmessage = async (msg) => {
      let data;
      try {
        data = JSON.parse(msg.data);
      } catch (e) {
        console.error("WS message JSON parse error:", e, msg.data);
        return;
      }

      console.log("📩 WS message:", data);

      if (!pcRef.current) return;

      try {
        if (data.answer) {
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
        }

        if (data.offer) {
          await pcRef.current.setRemoteDescription(
            new RTCSessionDescription(data.offer)
          );
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          sendSignal({ answer });
        }

        if (data.iceCandidate) {
          await pcRef.current.addIceCandidate(data.iceCandidate);
        }
      } catch (err) {
        console.error("Signaling handling error:", err, data);
      }
    };

    // 4) Get local media
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
    } catch (err) {
      console.error("Media error:", err);
      return;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    stream.getTracks().forEach((track) => {
      pcRef.current.addTrack(track, stream);
    });

    // 5) Create and send offer
    try {
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      sendSignal({ offer });
      console.log("🚀 Offer sent");
    } catch (err) {
      console.error("Offer/description error:", err);
    }
  };

  return {
    start,
    connected,
    localVideoRef,
    remoteVideoRef,
  };
}
