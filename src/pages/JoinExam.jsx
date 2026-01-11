// src/pages/JoinExamPage.jsx
import React, { useEffect, useState } from "react";
import { joinExamRoom } from "../services/examRoomService";
import useVideoRoom from "../hooks/useVideoRoom";

export default function JoinExamPage() {
  const [roomId, setRoomId] = useState(null);
  const [localVideoRef, remoteVideoRef, start] = useVideoRoom();

  useEffect(() => {
    async function init() {
      console.log("🔍 DEBUG: JoinExam mounted");

      const state = { paperType: "medical", mode: 2 };
      console.log("🔍 DEBUG: Received state:", state);

      const userId = "user_" + Math.random().toString(36).substring(2, 10);
      console.log("🔍 DEBUG: Generated userId:", userId);

      const result = await joinExamRoom({
        paperType: state.paperType,
        userId,
        mode: state.mode,
      });

      console.log("🚀 DEBUG: Room joined successfully:", result.roomId);

      setRoomId(result.roomId);
      start(result.roomId); // IMPORTANT FIX
    }

    init();
  }, []);

  return (
    <div>
      <h1>Exam Page</h1>

      <video ref={localVideoRef} autoPlay muted playsInline />
      <video ref={remoteVideoRef} autoPlay playsInline />
    </div>
  );
}
