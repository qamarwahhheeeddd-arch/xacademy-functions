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
    if (!roomId || !userId || !Array.isArray(students)) return;

    const peerIds = students.filter((id) => id && id !== userId);
    if (peerIds.length === 0) return;

    console.log("useVideoRoom: starting watcher for", {
      roomId,
      userId,
      peers: peerIds,
    });

    let offersUnsub = null;
    let answersUnsub = null;
    let candidatesUnsub = null;
    let streamCheckInterval = null;
    let initialized = false;

    const roomRef = doc(db, "examRooms", roomId);
    const offersCol = collection(roomRef, "webrtcOffers");
    const answersCol = collection(roomRef, "webrtcAnswers");
    const candidatesCol = collection(roomRef, "webrtcCandidates");

    const createPeerConnection = (peerId) => {
      const existing = peersRef.current[peerId];
      if (existing && existing.signalingState !== "closed") return existing;

      if (existing) {
        try {
          existing.close();
        } catch (_) {}
        delete peersRef.current[peerId];
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          // 🔥 Optional TURN server (add if needed)
          // {
          //   urls: "turn:your.turn.server:3478",
          //   username: "yourUsername",
          //   credential: "yourPassword",
          // },
        ],
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
          await addDoc(candidatesCol, {
            from: userId,
            to: peerId,
            candidate: {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
            },
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("Connection state with", peerId, "=>", pc.connectionState);
        if (pc.connectionState === "failed") {
          try {
            pc.close();
          } catch (_) {}
          delete peersRef.current[peerId];
          removeRemoteStream(peerId);
        }
      };

      return pc;
    };

    const setupSignaling = () => {
      if (initialized) return;
      initialized = true;

      // 🔥 Deterministic caller logic
      const sorted = [...students].filter(Boolean).sort();
      const leaderId = sorted[0];
      const amICaller = leaderId === userId;
      console.log("Caller decision:", { leaderId, userId, amICaller });

      // Listen for offers TO me
      const offersQ = query(offersCol, where("to", "==", userId));
      offersUnsub = onSnapshot(offersQ, async (snap) => {
        for (const change of snap.docChanges()) {
          if (change.type !== "added") continue;
          const data = change.doc.data();
          const fromId = data.from;
          const offer = data.offer;

          if (!offer?.type || !offer?.sdp) continue;

          let pc = createPeerConnection(fromId);

          if (pc.signalingState !== "stable") {
            try {
              pc.close();
            } catch (_) {}
            delete peersRef.current[fromId];
            pc = createPeerConnection(fromId);
          }

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
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
      answersUnsub = onSnapshot(answersQ, async (snap) => {
        for (const change of snap.docChanges()) {
          if (change.type !== "added") continue;
          const data = change.doc.data();
          const fromId = data.from;
          const answer = data.answer;

          const pc = peersRef.current[fromId];
          if (!pc || !answer?.type || !answer?.sdp) continue;

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (err) {
            console.error("Error setting remote answer from", fromId, err);
          }
        }
      });

      // Listen for ICE candidates TO me
      const candidatesQ = query(candidatesCol, where("to", "==", userId));
      candidatesUnsub = onSnapshot(candidatesQ, async (snap) => {
        for (const change of snap.docChanges()) {
          if (change.type !== "added") continue;
          const data = change.doc.data();
          const fromId = data.from;
          const candidate = data.candidate;

          const pc = peersRef.current[fromId];
          if (!pc || pc.signalingState === "closed") continue;
          if (!candidate?.candidate || !pc.remoteDescription) continue;

          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("Added ICE candidate from", fromId);
          } catch (err) {
            console.error("Error adding ICE candidate from", fromId, err);
          }
        }
      });

      // Caller creates offers
      const initOffers = async () => {
        if (!amICaller) return;

        for (const peerId of peerIds) {
          const pc = createPeerConnection(peerId);
          if (pc.signalingState !== "stable") continue;

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
    };

    // Wait for local stream
    if (!streamRef.current) {
      streamCheckInterval = setInterval(() => {
        if (streamRef.current) {
          clearInterval(streamCheckInterval);
          streamCheckInterval = null;
          setupSignaling();
        }
      }, 500);
    } else {
      setupSignaling();
    }

    return () => {
      if (streamCheckInterval) clearInterval(streamCheckInterval);
      if (offersUnsub) offersUnsub();
      if (answersUnsub) answersUnsub();
      if (candidatesUnsub) candidatesUnsub();
    };
  }, [roomId, userId]);
}
