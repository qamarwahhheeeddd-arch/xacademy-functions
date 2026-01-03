import { useEffect, useRef } from "react";
import * as faceapi from "face-api.js";

export default function useAdvancedProctoring(videoRef, addWarning) {
  const modelsLoaded = useRef(false);

  const noFaceCount = useRef(0);
  const darkCount = useRef(0);
  const multiFaceCount = useRef(0);
  const lookAwayCount = useRef(0);
  const soundCount = useRef(0);
  const wasPausedRef = useRef(false);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => {
    let intervalId;

    /* ================= LOAD MODELS ================= */
    const loadModels = async () => {
      try {
        const MODEL_URL = `${window.location.origin}/models`;
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        modelsLoaded.current = true;
        console.log("✅ Face-API models loaded");
      } catch (e) {
        addWarning("Camera AI models failed to load");
      }
    };

    /* ================= AUDIO (TALKING DETECT) ================= */
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        const mic = ctx.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        mic.connect(analyser);

        audioContextRef.current = ctx;
        analyserRef.current = analyser;
      } catch {}
    };

    loadModels();
    initAudio();

    /* ================= MAIN LOOP ================= */
    // 🔴 FIX: camera black after break
if (video.paused || video.ended) {
  wasPausedRef.current = true;
  video.play().catch(() => {});
  return;
}

if (wasPausedRef.current) {
  wasPausedRef.current = false;
  console.log("🎥 Camera resumed after pause");
}
    intervalId = setInterval(async () => {
      const video = videoRef?.current;
      if (
        !modelsLoaded.current ||
        !video ||
        video.readyState < 3 ||
        video.videoWidth === 0
      )
        return;

      /* ---------- FACE DETECTION ---------- */
      const detections = await faceapi
        .detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: 0.5,
          })
        )
        .withFaceLandmarks();

      // ❌ No face
      if (detections.length === 0) {
        if (++noFaceCount.current >= 2) {
          addWarning("Face not detected");
          noFaceCount.current = 0;
        }
        return;
      } else noFaceCount.current = 0;

      // 👥 Multiple faces
      if (detections.length > 1) {
        if (++multiFaceCount.current >= 2) {
          addWarning("Multiple faces detected");
          multiFaceCount.current = 0;
        }
      } else multiFaceCount.current = 0;

      /* ---------- DARKNESS ---------- */
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      let brightness = 0;
      for (let i = 0; i < data.length; i += 4)
        brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
      brightness /= data.length / 4;

      if (brightness < 65) {
        if (++darkCount.current >= 2) {
          addWarning("Camera is dark or covered");
          darkCount.current = 0;
        }
      } else darkCount.current = 0;

      /* ---------- HEAD / PHONE DETECTION ---------- */
      const landmarks = detections[0].landmarks;
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      const nose = landmarks.getNose();
      const jaw = landmarks.getJawOutline();

      const eyeCenterX = (leftEye[0].x + rightEye[3].x) / 2;
      const noseX = nose[3].x;
      const horizontalDiff = Math.abs(eyeCenterX - noseX);

      const noseBridge = nose[0];
      const chin = jaw[8];
      const verticalDiff = Math.abs(noseBridge.y - chin.y);

      // 👀 Look away / phone down
      if (horizontalDiff > 18 || verticalDiff < 38) {
        if (++lookAwayCount.current >= 2) {
          addWarning("Looking away / possible phone usage");
          lookAwayCount.current = 0;
        }
      } else lookAwayCount.current = 0;

      /* ---------- SOUND / TALKING ---------- */
      if (analyserRef.current) {
        const arr = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(arr);
        const volume = arr.reduce((a, b) => a + b) / arr.length;

        if (volume > 35) {
          if (++soundCount.current >= 3) {
            addWarning("Talking or external sound detected");
            soundCount.current = 0;
          }
        } else soundCount.current = 0;
      }
    }, 1500);

    return () => clearInterval(intervalId);
  }, [videoRef, addWarning]);
}