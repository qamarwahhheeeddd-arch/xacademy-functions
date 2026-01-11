// src/hooks/useVideoRoom.js
import { useEffect, useRef, useState } from "react";

export default function useVideoRoom() {
  const wsRef = useRef(null);

  // Multi-peer storage
  const peersRef = useRef({}); // { peerId: RTCPeerConnection }
  const remoteStreamsRef = useRef({}); // { peerId: MediaStream }

  const [remoteStreams, setRemoteStreams] = useState({}); // UI binding
  const [connectedPeers, setConnectedPeers] = useState([]);

  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);

  // Helper: safely send JSON
  const sendSignal = (msg) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify(msg));
  };

  // Cleanup
  useEffect(() => {
    return () => {
      try {
        wsRef.current?.close();
      } catch {}

      Object.values(peersRef.current).forEach((pc) => pc.close());
    };
  }, []);

  // Create PeerConnection for each peer
  const createPeerConnection = (peerId) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:157.180.41.49:3478",
          username: "examuser",
          credential: "ExamStrongPass123",
        },
      ],
    });

    // Local tracks → add to PC
    localStreamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current);
    });

    // ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal({
          type: "ice",
          target: peerId,
          candidate: e.candidate,
        });
      }
    };

    // Remote stream
    pc.ontrack = (e) => {
      const stream = e.streams[0];
      remoteStreamsRef.current[peerId] = stream;

      setRemoteStreams({ ...remoteStreamsRef.current });
    };

    peersRef.current[peerId] = pc;
    return pc;
  };

  // Start WebRTC room
  const start = async (roomId, userId) => {
    console.log("🎥 Multi-peer WebRTC start:", { roomId, userId });

    // 1) Connect WebSocket
    wsRef.current = new WebSocket(
  `ws://157.180.41.49:8080?roomId=${encodeURIComponent(
    roomId
  )}&userId=${encodeURIComponent(userId)}`
);


    wsRef.current.onopen = () => console.log("WS connected");
    wsRef.current.onerror = (err) => console.error("WS error:", err);

    // 2) Local camera
    localStreamRef.current = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }

    // 3) WS message handler
    wsRef.current.onmessage = async (msg) => {
      const data = JSON.parse(msg.data);

      const { type, from, offer, answer, candidate, peers } = data;

      // When server sends list of peers
      if (type === "peers") {
        peers.forEach((peerId) => {
          if (peerId !== userId) {
            createOffer(peerId);
          }
        });
      }

      // New peer joined
      if (type === "new-peer" && from !== userId) {
        createOffer(from);
      }

      // Offer received
      if (type === "offer" && from !== userId) {
        const pc = createPeerConnection(from);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const ans = await pc.createAnswer();
        await pc.setLocalDescription(ans);

        sendSignal({
          type: "answer",
          target: from,
          answer: ans,
        });
      }

      // Answer received
      if (type === "answer" && from !== userId) {
        const pc = peersRef.current[from];
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      }

      // ICE candidate
      if (type === "ice" && from !== userId) {
        const pc = peersRef.current[from];
        if (pc && candidate) {
          await pc.addIceCandidate(candidate);
        }
      }
    };
  };

  // Create offer for a peer
  const createOffer = async (peerId) => {
    const pc = createPeerConnection(peerId);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    sendSignal({
      type: "offer",
      target: peerId,
      offer,
    });
  };

  return {
    start,
    localVideoRef,
    remoteStreams,
  };
}
