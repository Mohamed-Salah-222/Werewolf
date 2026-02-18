import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import { useLeaveWarning } from "../hooks/useLeaveWarning";
import "./Discussion.css";

// ===== TYPES =====

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

// ===== HELPERS =====

function formatTime(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getTimerState(secondsLeft: number): "normal" | "warning" | "urgent" {
  if (secondsLeft <= 30) return "urgent";
  if (secondsLeft <= 60) return "warning";
  return "normal";
}

function getRoleTeam(role: string): "villain" | "village" | "neutral" {
  const villains = ["werewolf", "minion"];
  if (villains.includes(role.toLowerCase())) return "villain";
  if (role.toLowerCase() === "joker") return "neutral";
  return "village";
}

// SVG circle math
const RING_RADIUS = 70;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// ===== COMPONENT =====

function Discussion() {
  const { gameCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const playerName = state?.playerName || "Unknown";
  const playerId = state?.playerId || "";
  const isHost = state?.isHost || false;
  const totalSeconds = state?.timerSeconds || 360;
  // eslint-disable-next-line react-hooks/purity
  const startedAt = state?.startedAt || Date.now();
  const roleName = state?.roleName || "";
  const actionResult = state?.actionResult || null;

  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [showResult, setShowResult] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useLeaveWarning(true);

  // Timer synced to server timestamp
  useEffect(() => {
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSecondsLeft(Math.max(totalSeconds - elapsed, 0));
    };

    updateTimer();
    intervalRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt, totalSeconds]);

  // Socket listener
  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.on("votingStarted", () => {
      navigate(`/vote/${gameCode}`, {
        state: { playerName, playerId, isHost },
      });
    });

    return () => {
      socket.off("votingStarted");
    };
  }, [gameCode, navigate, playerName, playerId, isHost]);

  const skipToVote = useCallback(() => {
    if (skipping) return;
    setSkipping(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSecondsLeft(0);
    socket.emit("skipToVote", { gameCode, playerId });
  }, [skipping, gameCode, playerId]);

  // Derived
  const timerState = getTimerState(secondsLeft);
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const dashOffset = RING_CIRCUMFERENCE - progress * RING_CIRCUMFERENCE;
  const roleTeam = roleName ? getRoleTeam(roleName) : "village";

  return (
    <div className="disc-page">
      <div className="disc-vignette" />

      <div className="disc-content">
        <h1 className="disc-title">DISCUSSION</h1>
        <p className="disc-subtitle">Talk it out. Who's the werewolf?</p>

        {/* Timer */}
        <div className="disc-timer-section">
          {/* Circular ring */}
          <div className="disc-timer-ring">
            <svg viewBox="0 0 160 160">
              <circle className="disc-ring-bg" cx="80" cy="80" r={RING_RADIUS} />
              <circle className={`disc-ring-progress disc-ring-progress--${timerState}`} cx="80" cy="80" r={RING_RADIUS} strokeDasharray={RING_CIRCUMFERENCE} strokeDashoffset={dashOffset} />
            </svg>
            <span className={`disc-timer-text disc-timer-text--${timerState}`}>{formatTime(secondsLeft)}</span>
          </div>

          {/* Linear bar */}
        </div>

        {/* Night recap */}
        {roleName && (
          <div className="disc-recap">
            <button className="disc-recap-toggle" onClick={() => setShowResult(!showResult)}>
              <span>{showResult ? "HIDE" : "SHOW"} NIGHT RECAP</span>
              <span className="disc-recap-arrow">{showResult ? "▲" : "▼"}</span>
            </button>

            {showResult && (
              <div className="disc-recap-content">
                <div className="disc-recap-role">
                  <span className="disc-recap-label">YOUR ROLE</span>
                  <span className={`disc-recap-role-name disc-recap-role-name--${roleTeam}`}>{roleName}</span>
                </div>
                {actionResult?.message && (
                  <div>
                    <span className="disc-recap-label">WHAT HAPPENED</span>
                    <p className="disc-recap-message">{actionResult.message}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Times up */}
        {secondsLeft === 0 && <p className="disc-times-up">Time's up! Moving to vote...</p>}

        {/* Host skip button */}
        {isHost && secondsLeft > 0 && (
          <button className="disc-skip-btn" onClick={skipToVote} disabled={skipping}>
            {skipping ? "SKIPPING..." : "SKIP TO VOTE"}
          </button>
        )}
      </div>
    </div>
  );
}

export default Discussion;
