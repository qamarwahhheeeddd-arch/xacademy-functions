// src/hooks/useAntiCheat.js
import { useEffect, useState, useCallback, useRef } from "react";

const MAX_WARNINGS = 15;

export function useAntiCheat(onMaxWarningsReached) {
  const [warnings, setWarnings] = useState(0);

  // 🔒 Lock to avoid multiple refresh alerts on a single refresh attempt
  const refreshAlertLock = useRef(false);

  // 🔒 Last window size to detect suspicious resize / split-screen
  const lastWindowSize = useRef({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // ========= NORMAL WARNING (counts towards MAX_WARNINGS) =========
  const addWarning = useCallback(
    (message) => {
      setWarnings((prev) => {
        const next = prev + 1;
        alert(`Warning ${next}/${MAX_WARNINGS}: ${message}`);
        if (next >= MAX_WARNINGS && onMaxWarningsReached) {
          onMaxWarningsReached();
        }
        return next;
      });
    },
    [onMaxWarningsReached]
  );

  // ========= REFRESH ALERT (NO WARNING COUNT, JUST BLOCK) =========
  const addRefreshAlert = useCallback(() => {
    if (refreshAlertLock.current) return;

    refreshAlertLock.current = true;

    alert("Page refresh / reload is completely blocked during the exam.");

    setTimeout(() => {
      refreshAlertLock.current = false;
    }, 1500);
  }, []);

  // ========= BLUR / VISIBILITY / TAB SWITCH =========
  useEffect(() => {
    const handleBlur = () => {
      addWarning("You left the exam window (blur / alt+tab / app switch).");
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        addWarning("You hid the exam screen or switched tabs/apps.");
      }
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [addWarning]);

  // ========= BACK BUTTON BLOCK =========
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      addWarning("Back button is disabled during the exam.");
    };

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [addWarning]);

  // ========= CONTEXT MENU / KEYS / COPY‑PASTE / TOUCH / RESIZE =========
  useEffect(() => {
    // Right‑click block
    const blockContextMenu = (e) => {
      e.preventDefault();
      addWarning("Right-click is not allowed.");
    };

    // Keyboard shortcuts
    const blockKeys = (e) => {
      const key = e.key.toLowerCase();

      // 🔒 Refresh (F5, Ctrl+R) → alert only
      if (key === "f5" || (e.ctrlKey && key === "r")) {
        e.preventDefault();
        addRefreshAlert();
        return;
      }

      // 🔒 New tab / window / dev tools (best-effort)
      if (
        (e.ctrlKey && ["n", "t"].includes(key)) || // Ctrl+N, Ctrl+T
        (e.ctrlKey && e.shiftKey && ["n", "t"].includes(key)) || // Ctrl+Shift+N/T
        (e.ctrlKey && e.shiftKey && key === "i") || // Dev tools
        key === "f12"
      ) {
        e.preventDefault();
        addWarning("Opening new tabs/windows or dev tools is not allowed.");
        return;
      }

      // 🔒 Copy/paste/print/screenshot block
      if (
        (e.ctrlKey && ["c", "v", "x", "p"].includes(key)) ||
        key === "printscreen"
      ) {
        e.preventDefault();
        addWarning("Copy/Paste/Print/Screenshot is not allowed.");
      }
    };

    const blockCopy = (e) => {
      e.preventDefault();
      addWarning("Copy is not allowed.");
    };

    const blockPaste = (e) => {
      e.preventDefault();
      addWarning("Paste is not allowed.");
    };

    const blockCut = (e) => {
      e.preventDefault();
      addWarning("Cut is not allowed.");
    };

    // 3‑finger / multi-task gesture (mobile)
    const handleTouchStartGesture = (e) => {
      if (e.touches && e.touches.length >= 3) {
        addWarning("3-finger / multi-task gesture is not allowed.");
      }
    };

    // 🔒 Mobile pull‑to‑refresh block
    let startY = 0;

    const handleTouchStartRefresh = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      startY = e.touches[0].clientY;
    };

    const handleTouchMoveRefresh = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const currentY = e.touches[0].clientY;

      const atTop = window.scrollY <= 5;

      if (atTop && currentY - startY > 120) {
        e.preventDefault();
        addRefreshAlert();
      }
    };

    // 🔍 Suspicious resize / split-screen detection (best-effort)
    const handleResize = () => {
      const { innerWidth, innerHeight } = window;
      const { width, height } = lastWindowSize.current;

      const widthChange = Math.abs(innerWidth - width);
      const heightChange = Math.abs(innerHeight - height);

      // Agar window size bahut change ho jaye → possible split-screen / orientation change
      if (widthChange > 150 || heightChange > 150) {
        addWarning("Suspicious window resize / split-screen detected.");
      }

      lastWindowSize.current = { width: innerWidth, height: innerHeight };
    };

    // Attach listeners
    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockKeys);
    document.addEventListener("copy", blockCopy);
    document.addEventListener("paste", blockPaste);
    document.addEventListener("cut", blockCut);

    document.addEventListener("touchstart", handleTouchStartGesture, { passive: false });
    document.addEventListener("touchstart", handleTouchStartRefresh, { passive: false });
    document.addEventListener("touchmove", handleTouchMoveRefresh, { passive: false });

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockKeys);
      document.removeEventListener("copy", blockCopy);
      document.removeEventListener("paste", blockPaste);
      document.removeEventListener("cut", blockCut);

      document.removeEventListener("touchstart", handleTouchStartGesture);
      document.removeEventListener("touchstart", handleTouchStartRefresh);
      document.removeEventListener("touchmove", handleTouchMoveRefresh);

      window.removeEventListener("resize", handleResize);
    };
  }, [addWarning, addRefreshAlert]);

  // ========= BROWSER RELOAD (beforeunload) =========
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
      addRefreshAlert();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [addRefreshAlert]);

  return { warnings, addWarning, MAX_WARNINGS };
}