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
    if (!roomId || !userId) {
      console.warn("useVideoRoom: missing roomId or userId");
      return;
    }

    if (!streamRef.current) {
      console.warn("useVideoRoom: local stream not ready yet");
      return;
    }

    if (!Array.isArray(students) || students.length === 0) {
      console.warn("useVideoRoom: no students list, skipping");
      return;
    }

    const peerIds = students.filter((id) => id && id !== userId);
    if (peerIds.length === 0) {
      console.warn("useVideoRoom: no valid peers to connect to");
      return;
    }

    console.log("useVideoRoom: starting for", {
      roomId,
      userId,
      peers: peerIds,
    });

    const roomRef = doc(db, "examRooms", roomId);
    const offersCol = collection(roomRef, "webrtcOffers");
    const answersCol = collection(roomRef, "webrtcAnswers");
    const candidatesCol = collection(roomRef, "webrtcCandidates");

    const createPeerConnection = (peerId) => {
      const existing = peersRef.current[peerId];

      if (existing && existing.signalingState !== "closed") {
        return existing;
      }

      if (existing && existing.signalingState === "closed") {
        console.warn("PeerConnection was closed, recreating for", peerId);
        try {
          existing.close();
        } catch (_) {}
        delete peersRef.current[peerId];
      }

      console.log("Creating RTCPeerConnection for peer:", peerId);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      peersRef.current[peerId] = pc;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, streamRef.current);
        });
      }

      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream) {
          console.log("Remote stream received from", peerId);
          addRemoteStream(peerId, remoteStream);
        }
      };

      pc.onicecandidate = async (event) => {
        if (!event.candidate) return;
        try {
          const c = event.candidate;
          await addDoc(candidatesCol, {
            from: userId,
            to: peerId,
            candidate: {
              candidate: c.candidate,
              sdpMid: c.sdpMid,
              sdpMLineIndex: c.sdpMLineIndex,
            },
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("Connection state with", peerId, "=>", pc.connectionState);
        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          try {
            pc.close();
          } catch (_) {}
          delete peersRef.current[peerId];
          removeRemoteStream(peerId);
        }
      };

      return pc;
    };

    // Listen for offers TO me
    const offersQ = query(offersCol, where("to", "==", userId));
    const unsubOffers = onSnapshot(offersQ, async (snap) => {
      for (const change of snap.docChanges()) {
        if (change.type !== "added") continue;
        const data = change.doc.data();
        const fromId = data.from;
        const offer = data.offer;

        if (!offer || !offer.type || !offer.sdp) {
          console.warn("Invalid offer data from", fromId, offer);
          continue;
        }

        console.log("Received offer from", fromId);

        const pc = createPeerConnection(fromId);

        try {
          await pc.setRemoteDescription(
            new RTCSessionDescription({
              type: offer.type,
              sdp: offer.sdp,
            })
          );
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          await addDoc(answersCol, {
            from: userId,
            to: fromId,
            answer: {
              type: answer.type,
              sdp: answer.sdp,
            },
            createdAt: serverTimestamp(),
          });

          console.log("Sent answer to", fromId);
        } catch (err) {
          console.error("Error handling offer from", fromId, err);
        }
      }
    });

    // Listen for answers TO me
    const answersQ = query(answersCol, where("to", "==", userId));
    const unsubAnswers = onSnapshot(answersQ, async (snap) => {
      for (const change of snap.docChanges()) {
        if (change.type !== "added") continue;
        const data = change.doc.data();
        const fromId = data.from;
        const answer = data.answer;

        if (!answer || !answer.type || !answer.sdp) {
          console.warn("Invalid answer data from", fromId, answer);
          continue;
        }

        console.log("Received answer from", fromId);

        const pc = peersRef.current[fromId];
        if (!pc) {
          console.warn("No peerConnection for", fromId);
          continue;
        }

        try {
          await pc.setRemoteDescription(
            new RTCSessionDescription({
              type: answer.type,
              sdp: answer.sdp,
            })
          );
        } catch (err) {
          console.error("Error setting remote answer from", fromId, err);
        }
      }
    });

    // Listen for ICE candidates TO me
    const candidatesQ = query(candidatesCol, where("to", "==", userId));
    const unsubCandidates = onSnapshot(candidatesQ, async (snap) => {
      for (const change of snap.docChanges()) {
        if (change.type !== "added") continue;
        const data = change.doc.data();
        const fromId = data.from;
        const candidate = data.candidate;

        const pc = peersRef.current[fromId];
        if (!pc) {
          console.warn("No peerConnection for ICE from", fromId);
          continue;
        }

        if (!candidate || !candidate.candidate) {
          console.warn("Invalid ICE candidate from", fromId, candidate);
          continue;
        }

        try {
          if (!pc.remoteDescription) {
            console.warn(
              "Skipping ICE, remoteDescription null for",
              fromId
            );
            continue;
          }

          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("Added ICE candidate from", fromId);
        } catch (err) {
          console.error("Error adding ICE candidate from", fromId, err);
        }
      }
    });

    // Only one side should create offers (simple deterministic caller)
    const amICaller =
      peerIds.length > 0 &&
      userId === [...peerIds].sort()[0];

    // Create offers FROM me → others
    const initOffers = async () => {
      if (!amICaller) {
        console.log("Not caller, skipping offer creation");
        return;
      }

      for (const peerId of peerIds) {
        const pc = createPeerConnection(peerId);

        if (pc.signalingState !== "stable") {
          console.warn(
            "Skipping offer to",
            peerId,
            "because signalingState is",
            pc.signalingState
          );
          continue;
        }

        console.log("Creating offer to", peerId);

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          await addDoc(offersCol, {
            from: userId,
            to: peerId,
            offer: {
              type: offer.type,
              sdp: offer.sdp,
            },
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
    JSON.stringify(students),
  ]);
}
