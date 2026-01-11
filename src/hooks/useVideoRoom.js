// src/hooks/useVideoRoom.js
import { useEffect, useRef, useState } from "react";

export default function useVideoRoom() {
  const pcRef = useRef(null);
  const wsRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const start = async (roomId) => {
    console.log("🎥 DEBUG: Starting WebRTC with roomId:", roomId);

    wsRef.current = new WebSocket(
      `wss://xacademy-functions.web.app/ws?roomId=${roomId}`
    );

    wsRef.current.onmessage = async (msg) => {
      const data = JSON.parse(msg.data);

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
        wsRef.current.send(JSON.stringify({ answer }));
      }

      if (data.iceCandidate) {
        try {
          await pcRef.current.addIceCandidate(data.iceCandidate);
        } catch (err) {
          console.error("ICE error:", err);
        }
      }
    };

    pcRef.current = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
          urls: "turn:157.180.41.49:3478",
          username: "examuser",
          credential: "ExamStrongPass123",
        },
      ],
    });

    pcRef.current.onicecandidate = (e) => {
      if (e.candidate) {
        wsRef.current.send(JSON.stringify({ iceCandidate: e.candidate }));
      }
    };

    pcRef.current.ontrack = (e) => {
      remoteVideoRef.current.srcObject = e.streams[0];
    };

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    localVideoRef.current.srcObject = stream;

    stream.getTracks().forEach((track) => {
      pcRef.current.addTrack(track, stream);
    });

    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);

    wsRef.current.send(JSON.stringify({ offer }));
  };

  return [localVideoRef, remoteVideoRef, start];
}
