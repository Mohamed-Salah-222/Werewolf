import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";

interface LocationState {
  playerName: string;
  playerId: string;
  isHost: boolean;
  timerSeconds: number;
}

function Discussion() {
  const { gameCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const playerName = state?.playerName || "Unknown";
  const playerId = state?.playerId || "";
  const isHost = state?.isHost || false;
  const totalSeconds = state?.timerSeconds || 360;

  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.on("votingStarted", () => {
      navigate(`/vote/${gameCode}`, {
        state: { playerName, playerId, isHost },
      });
    });

    return () => {
      socket.off("votingStarted");
    };
  }, [gameCode, navigate, playerName, playerId, isHost]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>☀️ Discussion</h1>
      <p style={styles.subtitle}>Talk it out. Who's the werewolf?</p>

      <div style={styles.timerContainer}>
        <span
          style={{
            ...styles.timer,
            color: secondsLeft <= 30 ? "#ff4444" : secondsLeft <= 60 ? "#f0c040" : "#fff",
          }}
        >
          {formatTime(secondsLeft)}
        </span>
        <div style={styles.progressBarBg}>
          <div
            style={{
              ...styles.progressBarFill,
              width: `${progress * 100}%`,
              backgroundColor: secondsLeft <= 30 ? "#ff4444" : secondsLeft <= 60 ? "#f0c040" : "#4ade80",
            }}
          />
        </div>
      </div>

      {secondsLeft === 0 && <p style={styles.timesUp}>Time's up! Moving to vote...</p>}

      {isHost && secondsLeft > 0 && (
        <button
          style={styles.skipButton}
          onClick={() => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setSecondsLeft(0);
            // The backend timer will handle the transition to voting
            // But since backend timer is 3s for testing, it might already be done
            // This just visually ends it on the host side
          }}
        >
          Skip to Vote (Host)
        </button>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: "20px",
    maxWidth: "480px",
    margin: "0 auto",
  },
  title: {
    fontSize: "32px",
    fontWeight: "bold",
    marginBottom: "8px",
  },
  subtitle: {
    color: "#888",
    fontSize: "16px",
    marginBottom: "48px",
  },
  timerContainer: {
    width: "100%",
    textAlign: "center" as const,
    marginBottom: "32px",
  },
  timer: {
    fontSize: "72px",
    fontWeight: "bold",
    fontVariantNumeric: "tabular-nums",
    display: "block",
    marginBottom: "16px",
  },
  progressBarBg: {
    width: "100%",
    height: "6px",
    backgroundColor: "#333",
    borderRadius: "3px",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: "3px",
    transition: "width 1s linear",
  },
  timesUp: {
    color: "#ff4444",
    fontSize: "16px",
    fontWeight: "bold",
  },
  skipButton: {
    marginTop: "32px",
    padding: "12px 32px",
    fontSize: "14px",
    backgroundColor: "transparent",
    color: "#888",
    border: "1px solid #444",
    borderRadius: "8px",
  },
};

export default Discussion;
