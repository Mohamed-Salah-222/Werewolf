import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Team } from "@werewolf/shared";
// import VoiceChat from "../components/VoiceChat";
import "./Discussion.css";

import { useGameStore } from "../store/gameStore";
import { gameActions } from "../store/sockets";
import { findCharacter } from "../characters";

/** Resolve any role identifier to its stable id */
function roleIdOf(name: string): string {
  return findCharacter(name)?.id ?? name.toLowerCase();
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

function getRoleTeam(role: string): Team {
  const rid = roleIdOf(role);
  if (rid === "werewolf" || rid === "minion") return Team.Villain;
  if (rid === "joker") return Team.Neutral;
  return Team.Village;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getNestedResult(result: Record<string, unknown> | null, key: string): Record<string, unknown> | null {
  const nested = result?.[key];
  return nested && typeof nested === "object" && !Array.isArray(nested) ? (nested as Record<string, unknown>) : null;
}

function getDiscussionRecapRole({
  originalRole,
  currentRole,
  hydratedRole,
  actionResult,
}: {
  originalRole: string;
  currentRole: string;
  hydratedRole: string;
  actionResult: Record<string, unknown> | null;
}): string {
  const knownOriginalRole = originalRole || hydratedRole || currentRole;
  const originalRoleLower = roleIdOf(knownOriginalRole);

  if (originalRoleLower === "robber") {
    return getString(actionResult?.newRole) ?? knownOriginalRole;
  }

  if (originalRoleLower === "insomniac") {
    return getString(actionResult?.currentRole) ?? knownOriginalRole;
  }

  if (originalRoleLower === "clone") {
    const clonedRole = getString(actionResult?.clonedRole);
    const clonedRoleLower = clonedRole ? roleIdOf(clonedRole) : null;

    if (!clonedRole || !clonedRoleLower) {
      return knownOriginalRole;
    }

    if (clonedRoleLower === "robber") {
      const secondActionResult = getNestedResult(actionResult, "secondActionResult");
      return getString(secondActionResult?.newRole) ?? clonedRole;
    }

    if (clonedRoleLower === "insomniac") {
      const insomniacResult = getNestedResult(actionResult, "insomniacResult");
      return getString(insomniacResult?.currentRole) ?? clonedRole;
    }

    return clonedRole;
  }

  return knownOriginalRole;
}

// SVG circle math
const RING_RADIUS = 70;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// ===== COMPONENT =====

function Discussion() {
  const { gameCode } = useParams();
  const navigate = useNavigate();

  const playerId = useGameStore((s) => s.playerId) || "";
  const isHost = useGameStore((s) => s.isHost);
  const totalSeconds = useGameStore((s) => s.timerSeconds) || 360;
  const storeStartedAt = useGameStore((s) => s.startedAt);
  const roleName = useGameStore((s) => s.roleName) || "";
  const originalRoleName = useGameStore((s) => s.originalRoleName) || "";
  const currentRoleName = useGameStore((s) => s.currentRoleName) || "";
  const actionResult = useGameStore((s) => s.lastActionResult) as Record<string, unknown> | null;

  // FIX #2: Validate startedAt — useState initializer runs once,
  // so Date.now() is only called on mount, not on re-renders.
  const [startedAt] = useState(() => {
    const now = Date.now();
    const raw = storeStartedAt || now;
    if (raw > now) return now;
    return raw;
  });

  const [secondsLeft, setSecondsLeft] = useState(() => {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    return Math.max(totalSeconds - elapsed, 0);
  });
  const [showResult, setShowResult] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [showPhaseInfo, setShowPhaseInfo] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // FIX #1: Track whether the component is still mounted
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Timer synced to server timestamp
  useEffect(() => {
    const initialElapsed = Math.floor((Date.now() - startedAt) / 1000);
    const initialRemaining = Math.max(totalSeconds - initialElapsed, 0);

    // FIX #2: Don't start the interval if time is already up
    if (initialRemaining <= 0) return;

    intervalRef.current = setInterval(() => {
      // FIX #1: Guard against setting state on unmounted component
      if (!mountedRef.current) return;
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(totalSeconds - elapsed, 0);
      setSecondsLeft(remaining);
      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startedAt, totalSeconds]);

  const skipToVote = useCallback(() => {
    if (skipping) return;
    setSkipping(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSecondsLeft(0);
    gameActions.skipToVote({ gameCode: gameCode!, playerId });
  }, [skipping, gameCode, playerId]);

  // Derived
  const timerState = getTimerState(secondsLeft);
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const dashOffset = RING_CIRCUMFERENCE - progress * RING_CIRCUMFERENCE;
  const recapRoleName = getDiscussionRecapRole({
    originalRole: originalRoleName,
    currentRole: currentRoleName,
    hydratedRole: roleName,
    actionResult,
  });
  const recapMessage = getString(actionResult?.message);
  const roleTeam = recapRoleName ? getRoleTeam(recapRoleName) : Team.Village;

  return (
    <div className="disc-page">
      <div className="disc-vignette" />

      <div className="disc-content">
        <button className="disc-info-btn" onClick={() => setShowPhaseInfo(true)} aria-label="معلومات المرحلة">
          !
        </button>

        <h1 className="disc-title">النقاش</h1>

        {/* Voice Chat */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>{/* <VoiceChat gameCode={gameCode || ""} playerId={playerId} /> */}</div>

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
        {recapRoleName && (
          <div className="disc-recap">
            <button className="disc-recap-toggle" onClick={() => setShowResult(!showResult)}>
              <span>{showResult ? "اخفي" : "ورّيني"} ملخص الليل</span>
              <span className="disc-recap-arrow">{showResult ? "▲" : "▼"}</span>
            </button>

            {showResult && (
              <div className="disc-recap-content">
                <div className="disc-recap-role">
                  <span className="disc-recap-label">دورك</span>
                  <span className={`disc-recap-role-name disc-recap-role-name--${roleTeam}`}>{findCharacter(recapRoleName)?.name || recapRoleName}</span>
                </div>
                {recapMessage && (
                  <div>
                    <span className="disc-recap-label">اللي حصل</span>
                    <p className="disc-recap-message">{recapMessage}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Times up */}
        {secondsLeft === 0 && <p className="disc-times-up">خلص الوقت! بننتقل للتصويت…</p>}

        {/* Host skip button */}
        {isHost && secondsLeft > 0 && (
          <button className="disc-skip-btn" onClick={skipToVote} disabled={skipping}>
            {skipping ? "بنتقل…" : "نطل للتصويت"}
          </button>
        )}
      </div>

      {/* Phase info modal */}
      {showPhaseInfo && (
        <div className="disc-phase-overlay" onClick={() => setShowPhaseInfo(false)}>
          <div className="disc-phase-modal" onClick={(e) => e.stopPropagation()}>
            <div className="disc-phase-header">
              <h2 className="disc-phase-title-modal">النقاش</h2>
              <button className="disc-phase-close" onClick={() => setShowPhaseInfo(false)}>
                ✕
              </button>
            </div>
            <div className="disc-phase-body">
              <p className="disc-phase-flavor">القرية صحيت. وقت اللي تكشف العفاريت… أو تلخبط الكل عليك.</p>

              <div className="disc-phase-item">
                <div>
                  <span className="disc-phase-item-title">اتكلموا</span>
                  <p className="disc-phase-item-desc">هنا الكل بيناقش ويتتهم ويدافع ويمثل. استخدم اللي عرفته بالليل عشان تعرف مين العفاريت… أو ضلل القرية لو انت واحد منهم.</p>
                </div>
              </div>

              <div className="disc-phase-item">
                <div>
                  <span className="disc-phase-item-title">ملخص الليل</span>
                  <p className="disc-phase-item-desc">دوس «ورّيني ملخص الليل» تراجع دورك واللي حصل في حركتك. الملخص ده ليك انت بس.</p>
                </div>
              </div>

              <div className="disc-phase-item">
                <div>
                  <span className="disc-phase-item-title">المؤقت</span>
                  <p className="disc-phase-item-desc">الدايرة بتعد وقت النقاش بالعكس. توصل صفر، التصويت يبدأ لوحده. والمضيف ينقلكم بدري لو الكل خلص.</p>
                </div>
              </div>
            </div>
            <div className="disc-phase-footer">
              <button className="disc-phase-dismiss" onClick={() => setShowPhaseInfo(false)}>
                فهمت
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave button */}
      <button
        className="rr-leave-btn"
        onClick={() => {
          gameActions.leaveGame({ gameCode: gameCode!, playerId });
          useGameStore.getState().reset();
          navigate("/");
        }}
      >
        خروج
      </button>
    </div>
  );
}

export default Discussion;
