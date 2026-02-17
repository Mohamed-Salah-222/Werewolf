import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import { useLeaveWarning } from "../hooks/useLeaveWarning";
import "./Discussion.css";

interface LocationState {
  playerName: string;
  playerId: string;
  isHost: boolean;
  timerSeconds: number;
  currentTimerSec: number;
  startedAt: number;
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
  const currentTimerSec = state?.currentTimerSec || totalSeconds;
  // eslint-disable-next-line react-hooks/purity
  const startedAt = state?.startedAt || Date.now();
  const roleName = state?.roleName || "";
  const actionResult = state?.actionResult || null;

  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [showResult, setShowResult] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useLeaveWarning(true);

  useEffect(() => {
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(totalSeconds - elapsed, 0);
      setSecondsLeft(remaining);
    };

    updateTimer(); // run immediately

    intervalRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt, totalSeconds]);
  // useEffect(() => {
  //   intervalRef.current = setInterval(() => {
  //     setSecondsLeft((prev) => {
  //       if (prev <= 1) {
  //         if (intervalRef.current) clearInterval(intervalRef.current);
  //         return 0;
  //       }
  //       return prev - 1;
  //     });
  //   }, 1000);
  //   return () => {
  //     if (intervalRef.current) clearInterval(intervalRef.current);
  //   };
  // }, []);

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
    if (villains.includes(role.toLowerCase())) return "#c41e1e";
    if (role.toLowerCase() === "joker") return "#d4a017";
    return "#2a8a4a";
  };

  const timerColor = () => {
    if (secondsLeft <= 30) return "#c41e1e";
    if (secondsLeft <= 60) return "#d4a017";
    return "#c9a84c";
  };

  // const handleSkipToVote = () => {
  //   if (intervalRef.current) clearInterval(intervalRef.current);
  //   setSecondsLeft(0);
  //   socket.emit("skipToVote", { gameCode });
  // };

  return (
    <div style={styles.page}>
      <div style={styles.vignette} />

      <div style={styles.content} className="disc-content">
        <h1 style={styles.title}>DISCUSSION</h1>
        <p style={styles.subtitle}>Talk it out. Who's the werewolf?</p>

        {/* Timer */}
        <div style={styles.timerSection}>
          <span style={{ ...styles.timer, color: timerColor() }}>{formatTime(secondsLeft)}</span>
          <div style={styles.progressBg}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progress * 100}%`,
                backgroundColor: timerColor(),
              }}
            />
          </div>
        </div>

        {/* Night recap */}
        {roleName && (
          <div style={styles.recapCard}>
            <button style={styles.recapToggle} onClick={() => setShowResult(!showResult)}>
              <span style={styles.recapToggleText}>{showResult ? "HIDE" : "SHOW"} NIGHT RECAP</span>
              <span style={styles.recapArrow}>{showResult ? "▲" : "▼"}</span>
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

        {/* Times up */}
        {secondsLeft === 0 && <p style={styles.timesUp}>Time's up! Moving to vote...</p>}

        {isHost && secondsLeft > 0 && (
          <button style={styles.skipBtn} onClick={skipToVote}>
            Skip to Vote (Host)
          </button>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    position: "relative",
    width: "100vw",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(ellipse at 50% 30%, #1a0a0a 0%, #0a0a0a 50%, #000 100%)",
    fontFamily: "'Trade Winds', cursive",
    color: "#e8dcc8",
  },
  vignette: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
    zIndex: 1,
  },
  content: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    width: "100%",
    maxWidth: "420px",
    padding: "32px 20px",
  },
  title: {
    fontSize: "36px",
    fontWeight: 400,
    letterSpacing: "8px",
    margin: "0 0 8px 0",
    fontFamily: "'Creepster', cursive",
    color: "#c9a84c",
    textShadow: "0 0 30px rgba(201,168,76,0.2)",
    textAlign: "center" as const,
  },
  subtitle: {
    fontSize: "14px",
    color: "#5a4a30",
    marginBottom: "32px",
    fontStyle: "italic",
  },

  // Timer
  timerSection: {
    width: "100%",
    textAlign: "center" as const,
    marginBottom: "32px",
  },
  timer: {
    fontSize: "72px",
    fontWeight: 400,
    fontFamily: "'Creepster', cursive",
    fontVariantNumeric: "tabular-nums",
    display: "block",
    marginBottom: "16px",
    textShadow: "0 0 20px rgba(201,168,76,0.15)",
  },
  progressBg: {
    width: "100%",
    height: "4px",
    backgroundColor: "#1a1510",
    borderRadius: "2px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: "2px",
    transition: "width 1s linear",
  },

  // Recap
  recapCard: {
    width: "100%",
    backgroundColor: "rgba(201,168,76,0.03)",
    border: "1px solid #2a2019",
    borderRadius: "4px",
    overflow: "hidden",
    marginBottom: "24px",
  },
  recapToggle: {
    width: "100%",
    padding: "14px 16px",
    fontSize: "12px",
    backgroundColor: "transparent",
    color: "#6b5a3a",
    border: "none",
    borderBottom: "1px solid #1a1510",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    fontFamily: "'Creepster', cursive",
    letterSpacing: "2px",
  },
  recapToggleText: {},
  recapArrow: {
    fontSize: "10px",
    color: "#5a4a30",
  },
  recapContent: {
    padding: "16px",
  },
  recapRole: {
    marginBottom: "16px",
  },
  recapLabel: {
    display: "block",
    fontSize: "10px",
    color: "#5a4a30",
    letterSpacing: "3px",
    marginBottom: "6px",
    fontFamily: "'Creepster', cursive",
  },
  recapRoleName: {
    fontSize: "22px",
    fontWeight: 400,
    fontFamily: "'Creepster', cursive",
    letterSpacing: "2px",
  },
  recapResult: {},
  recapMessage: {
    fontSize: "14px",
    color: "#9a8a70",
    lineHeight: "1.6",
    marginTop: "4px",
  },

  // Times up
  timesUp: {
    color: "#c41e1e",
    fontSize: "16px",
    fontFamily: "'Creepster', cursive",
    letterSpacing: "2px",
    marginBottom: "16px",
  },

  // Skip button
  skipBtn: {
    marginTop: "16px",
    padding: "12px 32px",
    fontSize: "13px",
    fontWeight: 400,
    letterSpacing: "3px",
    backgroundColor: "transparent",
    color: "#6b5a3a",
    border: "1px solid #2a2019",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "'Creepster', cursive",
    transition: "all 0.3s ease",
  },
};

export default Discussion;
