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

    if (!Array.isArray(students) || students.length === 0) {
      console.warn("useVideoRoom: no students list, skipping");
      return;
    }

    const peerIds = students.filter((id) => id && id !== userId);

    console.log(
      "useVideoRoom: students list =",
      students,
      "userId =",
      userId,
      "peerIds =",
      peerIds
    );

    if (peerIds.length === 0) {
      console.warn("useVideoRoom: no valid peers to connect to");
      return;
    }

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

      // Reuse existing live PC
      if (existing && existing.signalingState !== "closed") {
        return existing;
      }

      // Clean up closed PC if present
      if (existing && existing.signalingState === "closed") {
        console.warn("PeerConnection was closed, cleaning up for", peerId);
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

      // Attach local tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, streamRef.current);
        });
      } else {
        console.warn(
          "createPeerConnection: streamRef.current missing while creating PC for",
          peerId
        );
      }

      // Remote stream handler
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream) {
          console.log("Remote stream received from", peerId);
          addRemoteStream(peerId, remoteStream);
        }
      };

      // ICE candidate sender
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

      // ✅ Only close on "failed" — DO NOT close on "disconnected"
      pc.onconnectionstatechange = () => {
        console.log(
          "Connection state with",
          peerId,
          "=>",
          pc.connectionState
        );

        if (pc.connectionState === "failed") {
          console.warn("PC failed, closing for", peerId);
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

      console.log("useVideoRoom: initializing signaling for", {
        roomId,
        userId,
        peers: peerIds,
      });

      // Listen for offers TO me
      const offersQ = query(offersCol, where("to", "==", userId));
      offersUnsub = onSnapshot(offersQ, async (snap) => {
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
      answersUnsub = onSnapshot(answersQ, async (snap) => {
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
      candidatesUnsub = onSnapshot(candidatesQ, async (snap) => {
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

      // For now, always act as caller if any peers exist
      const amICaller = peerIds.length > 0;

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
    };

    // Wait for local stream to be ready
    if (!streamRef.current) {
      console.warn(
        "useVideoRoom: local stream not ready yet, starting watcher"
      );
      streamCheckInterval = setInterval(() => {
        if (streamRef.current) {
          console.log(
            "useVideoRoom: local stream is now ready, initializing"
          );
          clearInterval(streamCheckInterval);
          streamCheckInterval = null;
          setupSignaling();
        }
      }, 500);
    } else {
      console.log(
        "useVideoRoom: local stream already ready, initializing immediately"
      );
      setupSignaling();
    }

    return () => {
      console.log("Cleaning up useVideoRoom listeners");
      if (streamCheckInterval) {
        clearInterval(streamCheckInterval);
      }
      if (offersUnsub) offersUnsub();
      if (answersUnsub) answersUnsub();
      if (candidatesUnsub) candidatesUnsub();
    };
  }, [roomId, userId]); // ✅ sirf roomId + userId
}
