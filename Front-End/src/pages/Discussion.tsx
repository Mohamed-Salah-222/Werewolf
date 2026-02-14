import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import { useLeaveWarning } from "../hooks/useLeaveWarning";

interface LocationState {
  playerName: string;
  playerId: string;
  isHost: boolean;
  timerSeconds: number;
  roleName?: string;
  actionResult?: { message?: string } | null;
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
  const roleName = state?.roleName || "";
  const actionResult = state?.actionResult || null;

  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [showResult, setShowResult] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useLeaveWarning(true);

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

  function skipToVote() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSecondsLeft(0);

    socket.emit("skipToVote", { gameCode, playerId });
  }

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;

  const roleColor = (role: string) => {
    const villains = ["werewolf", "minion"];
    if (villains.includes(role.toLowerCase())) return "#ff4444";
    if (role.toLowerCase() === "joker") return "#f0c040";
    return "#4ade80";
  };

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

      {/* Night recap card */}
      {roleName && (
        <div style={styles.recapCard}>
          <button style={styles.recapToggle} onClick={() => setShowResult(!showResult)}>
            {showResult ? "Hide" : "Show"} Night Recap
          </button>

          {showResult && (
            <div style={styles.recapContent}>
              <div style={styles.recapRole}>
                <span style={styles.recapLabel}>YOUR ROLE</span>
                <span style={{ ...styles.recapRoleName, color: roleColor(roleName) }}>{roleName}</span>
              </div>
              {actionResult?.message && (
                <div style={styles.recapResult}>
                  <span style={styles.recapLabel}>WHAT HAPPENED</span>
                  <p style={styles.recapMessage}>{actionResult.message}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {secondsLeft === 0 && <p style={styles.timesUp}>Time's up! Moving to vote...</p>}

      {isHost && secondsLeft > 0 && (
        <button
          style={styles.skipButton}
          onClick={() => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setSecondsLeft(0);
            socket.emit("skipToVote", { gameCode });
          }}
          onClick={skipToVote}
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
    marginBottom: "32px",
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
  recapCard: {
    width: "100%",
    backgroundColor: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "12px",
    overflow: "hidden",
    marginBottom: "24px",
  },
  recapToggle: {
    width: "100%",
    padding: "14px 16px",
    fontSize: "14px",
    backgroundColor: "transparent",
    color: "#aaa",
    border: "none",
    borderBottom: "1px solid #333",
    textAlign: "left" as const,
  },
  recapContent: {
    padding: "16px",
  },
  recapRole: {
    marginBottom: "16px",
  },
  recapLabel: {
    display: "block",
    fontSize: "11px",
    color: "#666",
    letterSpacing: "2px",
    marginBottom: "4px",
  },
  recapRoleName: {
    fontSize: "20px",
    fontWeight: "bold",
  },
  recapResult: {},
  recapMessage: {
    fontSize: "15px",
    color: "#ccc",
    lineHeight: "1.5",
    marginTop: "4px",
  },
  timesUp: {
    color: "#ff4444",
    fontSize: "16px",
    fontWeight: "bold",
    marginBottom: "16px",
  },
  skipButton: {
    marginTop: "16px",
    padding: "12px 32px",
    fontSize: "14px",
    backgroundColor: "transparent",
    color: "#888",
    border: "1px solid #444",
    borderRadius: "8px",
  },
};

export default Discussion;
