import { useEffect, useRef } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

export function useFaceDetection(videoRef, addWarning, enabled = true) {
  const landmarkerRef = useRef(null);
  const runningRef = useRef(false);
  const intervalRef = useRef(null);

  // counters for stable warnings
  const noFaceCount = useRef(0);
  const multiFaceCount = useRef(0);
  const faceTooSmallCount = useRef(0);
  const darkFrameCount = useRef(0);

  // canvas for brightness check
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  useEffect(() => {
    // ⭐ BREAK MODE → FACE DETECTION OFF
    if (!enabled) return;

    let destroyed = false;

    const setupCanvas = () => {
      if (!canvasRef.current) {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 48;
        canvasRef.current = canvas;
        ctxRef.current = canvas.getContext("2d");
      }
    };

    const checkDarkness = () => {
      const video = videoRef?.current;
      if (!video || !ctxRef.current || video.readyState < 2) return null;

      try {
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let total = 0;
        const data = frame.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          total += 0.299 * r + 0.587 * g + 0.114 * b;
        }

        const avgBrightness = total / (frame.width * frame.height);
        return avgBrightness; // 0–255
      } catch (e) {
        return null;
      }
    };

    const init = async () => {
      try {
        console.log("Loading MediaPipe FaceLandmarker...");

        setupCanvas();

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );

        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/models/face_landmarker.task",
          },
          runningMode: "video",
          numFaces: 3,
        });

        if (!destroyed) {
          landmarkerRef.current = landmarker;
          console.log("FaceLandmarker loaded successfully");
        }
      } catch (err) {
        console.error("Error loading FaceLandmarker:", err);
        addWarning && addWarning("Face detection unavailable");
      }
    };

    const detect = async () => {
      if (destroyed) return;
      if (runningRef.current) return;
      if (!landmarkerRef.current) return;

      const video = videoRef?.current;
      if (!video) return;
      if (video.readyState < 3) return;

      runningRef.current = true;

      try {
        // 1) DARKNESS / CAMERA COVER CHECK
        const brightness = checkDarkness();
        if (brightness !== null) {
          if (brightness < 25) {
            darkFrameCount.current++;
            if (darkFrameCount.current >= 3) {
              addWarning && addWarning("Too dark or camera covered");
              darkFrameCount.current = 0;
            }
          } else {
            darkFrameCount.current = 0;
          }
        }

        // 2) FACE LANDMARK DETECTION
        const nowInMs = performance.now();
        const result = await landmarkerRef.current.detectForVideo(
          video,
          nowInMs
        );

        const faces = result?.faceLandmarks || [];

        // 2a) NO FACE
        if (faces.length === 0) {
          noFaceCount.current++;
          if (noFaceCount.current >= 2) {
            addWarning && addWarning("Face not detected");
            noFaceCount.current = 0;
          }
          multiFaceCount.current = 0;
          faceTooSmallCount.current = 0;
          return;
        } else {
          noFaceCount.current = 0;
        }

        // 2b) MULTIPLE FACES
        if (faces.length > 1) {
          multiFaceCount.current++;
          if (multiFaceCount.current >= 2) {
            addWarning && addWarning("Multiple faces detected");
            multiFaceCount.current = 0;
          }
        } else {
          multiFaceCount.current = 0;
        }

        // 2c) FACE TOO FAR
        const face = faces[0];
        if (!face || face.length < 300) return;

        const leftCheek = face[234];
        const rightCheek = face[454];
        const faceWidth = Math.abs(rightCheek.x - leftCheek.x);

        if (faceWidth < 0.16) {
          faceTooSmallCount.current++;
          if (faceTooSmallCount.current >= 2) {
            addWarning && addWarning("Move closer to the camera");
            faceTooSmallCount.current = 0;
          }
        } else {
          faceTooSmallCount.current = 0;
        }

      } catch (err) {
        console.warn("Face detection error:", err);
      } finally {
        runningRef.current = false;
      }
    };

    init();
    intervalRef.current = setInterval(detect, 1500);

    return () => {
      destroyed = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [videoRef, addWarning, enabled]);
}