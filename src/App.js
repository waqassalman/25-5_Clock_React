import React, { useEffect, useRef, useState } from "react";

export default function App() {
  // lengths in minutes
  const DEFAULT_BREAK = 5;
  const DEFAULT_SESSION = 25;

  const [breakLength, setBreakLength] = useState(DEFAULT_BREAK); // minutes
  const [sessionLength, setSessionLength] = useState(DEFAULT_SESSION); // minutes
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState("Session"); // "Session" or "Break"
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SESSION * 60);

  // refs to manage interval and audio
  const intervalRef = useRef(null);
  const startAtRef = useRef(null); // timestamp for better timing (optional)
  const audioRef = useRef(null);

  // update refs when values change (useful for interval callback)
  useEffect(() => {
    // ensure secondsLeft matches session length when user hasn't started yet
    if (!isRunning && mode === "Session") {
      setSecondsLeft(sessionLength * 60);
    }
    if (!isRunning && mode === "Break") {
      setSecondsLeft(breakLength * 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLength, breakLength, mode]);

  // Format mm:ss
  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const mm = m < 10 ? `0${m}` : `${m}`;
    const ss = s < 10 ? `0${s}` : `${s}`;
    return `${mm}:${ss}`;
  }

  // Start or pause toggle
  const handleStartStop = () => {
    if (isRunning) {
      // pause
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsRunning(false);
      return;
    }

    // start: if just switched to run from not running and secondsLeft is undefined or 0, initialize
    if (!isRunning) {
      // If secondsLeft is something (paused), resume it.
      // If secondsLeft is 0 (or an edge case), start fresh depending on mode.
      if (secondsLeft <= 0) {
        // initialize based on mode
        if (mode === "Session") setSecondsLeft(sessionLength * 60);
        else setSecondsLeft(breakLength * 60);
      }
      setIsRunning(true);

      // Use a standard setInterval that decrements every second.
      // store start timestamp for slightly better accuracy
      startAtRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          // If prev > 0 decrement
          if (prev > 0) return prev - 1;
          // prev === 0 -> time to switch mode
          return 0;
        });
      }, 1000);
    }
  };

  // Reset button: stop timer, reset all to defaults, stop & rewind audio
  const handleReset = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsRunning(false);
    setBreakLength(DEFAULT_BREAK);
    setSessionLength(DEFAULT_SESSION);
    setMode("Session");
    setSecondsLeft(DEFAULT_SESSION * 60);

    // stop and rewind audio
    if (audioRef.current) {
      audioRef.current.pause();
      try {
        audioRef.current.currentTime = 0;
      } catch (e) {
        // some browsers restrict currentTime change during streaming; ignore
      }
    }
  };

  // Break length decrement/increment with bounds [1,60]
  const changeBreak = (delta) => {
    setBreakLength((prev) => {
      const next = Math.min(60, Math.max(1, prev + delta));
      // If not running and currently in Break mode, update secondsLeft
      if (!isRunning && mode === "Break") {
        setSecondsLeft(next * 60);
      }
      return next;
    });
  };

  // Session length decrement/increment with bounds [1,60]
  const changeSession = (delta) => {
    setSessionLength((prev) => {
      const next = Math.min(60, Math.max(1, prev + delta));
      // If not running and currently in Session mode, update secondsLeft
      if (!isRunning && mode === "Session") {
        setSecondsLeft(next * 60);
      }
      return next;
    });
  };

  // Effect to watch secondsLeft and switch modes when hitting zero.
  useEffect(() => {
    if (secondsLeft === 0) {
      // play beep
      if (audioRef.current) {
        try {
          audioRef.current.currentTime = 0;
        } catch (e) {}
        audioRef.current.play();
      }

      // switch mode after a small delay to ensure beep plays (we can switch immediately)
      if (mode === "Session") {
        // start break
        setMode("Break");
        setSecondsLeft(breakLength * 60);
      } else {
        // start new session
        setMode("Session");
        setSecondsLeft(sessionLength * 60);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]); // only watch secondsLeft

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, []);

  // Button handlers mapping to required IDs
  // Note: Per user stories, we allow changes while running; FCC doesn't forbid it.
  // However many challengers prevent length changes while running. Both approaches pass FCC if done carefully.
  return (
    <div className="d-flex align-items-center justify-content-center vh-100" style={{ background: "#0b1220", padding: 16 }}>
      <div className="card shadow-lg" style={{ width: 420 }}>
        <div className="card-body">
          <h3 className="card-title text-center mb-4">Pomodoro Clock</h3>

          <div className="row mb-3">
            <div className="col text-center">
              <div id="break-label" className="mb-1">Break Length</div>
              <div className="d-flex align-items-center justify-content-center">
                <button id="break-decrement" className="btn btn-outline-primary me-2" onClick={() => changeBreak(-1)}>−</button>
                <div id="break-length" style={{ minWidth: 48, fontSize: 20 }}>{breakLength}</div>
                <button id="break-increment" className="btn btn-outline-primary ms-2" onClick={() => changeBreak(1)}>+</button>
              </div>
            </div>

            <div className="col text-center">
              <div id="session-label" className="mb-1">Session Length</div>
              <div className="d-flex align-items-center justify-content-center">
                <button id="session-decrement" className="btn btn-outline-success me-2" onClick={() => changeSession(-1)}>−</button>
                <div id="session-length" style={{ minWidth: 48, fontSize: 20 }}>{sessionLength}</div>
                <button id="session-increment" className="btn btn-outline-success ms-2" onClick={() => changeSession(1)}>+</button>
              </div>
            </div>
          </div>

          <div className="text-center mb-3">
            <div id="timer-label" style={{ fontSize: 18, marginBottom: 8 }}>{mode}</div>
            <div id="time-left" style={{
              fontSize: 48,
              background: "#0d6efd",
              color: "white",
              display: "inline-block",
              padding: "10px 24px",
              borderRadius: 8,
              minWidth: 180
            }}>
              {formatTime(secondsLeft)}
            </div>
          </div>

          <div className="d-flex justify-content-center gap-3">
            <button id="start_stop" className="btn btn-primary" onClick={handleStartStop}>
              {isRunning ? "Pause" : "Start"}
            </button>
            <button id="reset" className="btn btn-secondary" onClick={handleReset}>Reset</button>
          </div>

          {/* Audio element for beep (id="beep") - must be >= 1 second */}
          {/* Using a hosted file known to be >1s. You can replace with your own file. */}
          <audio id="beep" ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg" preload="auto" />
          <div className="mt-3 text-muted small text-center">
            Built with React + Bootstrap — meets FreeCodeCamp user stories.
          </div>
        </div>
      </div>
    </div>
  );
}
