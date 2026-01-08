// src/hooks/useVideoRoom.js
import { useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";

/**
 * useVideoRoom
 * - roomId: Firestore exam room ID
 * - userId: current student's ID
 * - streamRef: local media stream (from useCamera)
 * - peersRef: ref object to store RTCPeerConnections
 * - addRemoteStream: function to add remote stream to UI
 * - removeRemoteStream: function to remove remote stream from UI
 */
export function useVideoRoom({
  roomId,
  userId,
  streamRef,
  peersRef,
  addRemoteStream,
  removeRemoteStream,
}) {
  useEffect(() => {
    if (!roomId || !userId) return;
    if (!streamRef.current) {
      console.warn("useVideoRoom: local stream not ready yet");
    }

    // Signaling collections
    const roomRef = doc(db, "examRooms", roomId);
    const offersCol = collection(roomRef, "webrtcOffers");
    const answersCol = collection(roomRef, "webrtcAnswers");
    const candidatesCol = collection(roomRef, "webrtcCandidates");

    // Helper: create RTCPeerConnection
    const createPeerConnection = (peerId, isInitiator) => {
      if (peersRef.current[peerId]) return peersRef.current[peerId];

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
        ],
      });

      peersRef.current[peerId] = pc;

      // Local tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, streamRef.current);
        });
      }

      // Remote tracks
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream) {
          addRemoteStream(peerId, remoteStream);
        }
      };

      // ICE candidates
      pc.onicecandidate = async (event) => {
        if (!event.candidate) return;
        try {
          await addDoc(candidatesCol, {
            from: userId,
            to: peerId,
            candidate: event.candidate.toJSON(),
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          pc.close();
          delete peersRef.current[peerId];
          removeRemoteStream(peerId);
        }
      };

      return pc;
    };

    // Listen for offers sent to me
    const offersQ = query(offersCol, where("to", "==", userId));
    const unsubOffers = onSnapshot(offersQ, async (snap) => {
      for (const docChange of snap.docChanges()) {
        if (docChange.type !== "added") continue;
        const data = docChange.doc.data();
        const fromId = data.from;
        const offer = data.offer;

        const pc = createPeerConnection(fromId, false);

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          await addDoc(answersCol, {
            from: userId,
            to: fromId,
            answer: answer.toJSON(),
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          console.error("Error handling offer:", err);
        }
      }
    });

    // Listen for answers to my offers
    const answersQ = query(answersCol, where("to", "==", userId));
    const unsubAnswers = onSnapshot(answersQ, async (snap) => {
      for (const docChange of snap.docChanges()) {
        if (docChange.type !== "added") continue;
        const data = docChange.doc.data();
        const fromId = data.from;
        const answer = data.answer;

        const pc = peersRef.current[fromId];
        if (!pc) continue;

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error("Error setting remote answer:", err);
        }
      }
    });

    // Listen for ICE candidates addressed to me
    const candidatesQ = query(candidatesCol, where("to", "==", userId));
    const unsubCandidates = onSnapshot(candidatesQ, async (snap) => {
      for (const docChange of snap.docChanges()) {
        if (docChange.type !== "added") continue;
        const data = docChange.doc.data();
        const fromId = data.from;
        const candidate = data.candidate;

        const pc = peersRef.current[fromId];
        if (!pc) continue;

        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      }
    });

    // Initiate offers to other peers in this room
    const initOffers = async () => {
      try {
        const roomSnap = await roomRef.get?.();
        // If using modular SDK, you’d use getDoc(roomRef) instead.
      } catch (err) {
        console.warn("initOffers: room snapshot skipped (adjust if needed)");
      }

      // NOTE:
      // In a more advanced version, you’d read the list of students from room doc
      // and create offers to each other student (except yourself).
      // For now, we assume offers are created elsewhere or extended later.
    };

    initOffers();

    return () => {
      unsubOffers();
      unsubAnswers();
      unsubCandidates();
    };
  }, [roomId, userId, streamRef, peersRef, addRemoteStream, removeRemoteStream]);
}
