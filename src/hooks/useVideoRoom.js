// src/hooks/useVideoRoom.js
import { useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
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
 * - students: array of all student IDs in this room
 */
export function useVideoRoom({
  roomId,
  userId,
  streamRef,
  peersRef,
  addRemoteStream,
  removeRemoteStream,
  students = [],
}) {
  useEffect(() => {
    if (!roomId || !userId) return;
    if (!streamRef.current) {
      console.warn("useVideoRoom: local stream not ready yet");
      return;
    }

    console.log("useVideoRoom: starting for", { roomId, userId, students });

    const roomRef = doc(db, "examRooms", roomId);
    const offersCol = collection(roomRef, "webrtcOffers");
    const answersCol = collection(roomRef, "webrtcAnswers");
    const candidatesCol = collection(roomRef, "webrtcCandidates");

    const createPeerConnection = (peerId) => {
      if (peersRef.current[peerId]) return peersRef.current[peerId];

      console.log("Creating RTCPeerConnection for peer:", peerId);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
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
          console.log("Remote stream received from", peerId);
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
        console.log("Connection state with", peerId, "=>", pc.connectionState);
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          pc.close();
          delete peersRef.current[peerId];
          removeRemoteStream(peerId);
        }
      };

      return pc;
    };

    // 🔹 1) Listen for offers sent TO me
    const offersQ = query(offersCol, where("to", "==", userId));
    const unsubOffers = onSnapshot(offersQ, async (snap) => {
      for (const docChange of snap.docChanges()) {
        if (docChange.type !== "added") continue;
        const data = docChange.doc.data();
        const fromId = data.from;
        const offer = data.offer;

        console.log("Received offer from", fromId);

        const pc = createPeerConnection(fromId);

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

          console.log("Sent answer to", fromId);
        } catch (err) {
          console.error("Error handling offer:", err);
        }
      }
    });

    // 🔹 2) Listen for answers TO my offers
    const answersQ = query(answersCol, where("to", "==", userId));
    const unsubAnswers = onSnapshot(answersQ, async (snap) => {
      for (const docChange of snap.docChanges()) {
        if (docChange.type !== "added") continue;
        const data = docChange.doc.data();
        const fromId = data.from;
        const answer = data.answer;

        console.log("Received answer from", fromId);

        const pc = peersRef.current[fromId];
        if (!pc) continue;

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error("Error setting remote answer:", err);
        }
      }
    });

    // 🔹 3) Listen for ICE candidates TO me
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
          console.log("Added ICE candidate from", fromId);
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      }
    });

    // 🔹 4) INITIATE OFFERS TO OTHER STUDENTS
    const initOffers = async () => {
      if (!Array.isArray(students)) return;

      for (const peerId of students) {
        if (!peerId || peerId === userId) continue;

        console.log("Creating offer to", peerId);

        const pc = createPeerConnection(peerId);

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          await addDoc(offersCol, {
            from: userId,
            to: peerId,
            offer: offer.toJSON(),
            createdAt: serverTimestamp(),
          });

          console.log("Offer sent to", peerId);
        } catch (err) {
          console.error("Error creating offer to", peerId, err);
        }
      }
    };

    initOffers();

    return () => {
      console.log("Cleaning up useVideoRoom listeners");
      unsubOffers();
      unsubAnswers();
      unsubCandidates();
    };
  }, [
    roomId,
    userId,
    streamRef,
    peersRef,
    addRemoteStream,
    removeRemoteStream,
    students,
  ]);
}
