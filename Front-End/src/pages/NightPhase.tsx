import { useState, useEffect, useRef, useCallback, type ComponentType } from "react";
import { useParams, useNavigate } from "react-router-dom";

import socket from "../socket";
import { API_URL } from "../config";

import ActionComplete from "../components/roles/ActionComplete";
import WerewolfAction from "../components/roles/WerewolfAction";
import MinionAction from "../components/roles/MinionAction";
import CloneAction from "../components/roles/CloneAction";
import SeerAction from "../components/roles/SeerAction";
import MasonAction from "../components/roles/MasonAction";
import RobberAction from "../components/roles/RobberAction";
import TroublemakerAction from "../components/roles/TroublemakerAction";
import DrunkAction from "../components/roles/DrunkAction";
import InsomniacAction from "../components/roles/InsomniacAction";
import JokerAction from "../components/roles/JokerAction";
import NightRoleProgress from "../components/roles/NightRoleProgress";
// import VoiceChat from "../components/VoiceChat";
import "./NightPhase.css";

import { useGameStore } from "../store/gameStore";

// ===== TYPES =====

interface CloneResult {
  clonedRole: string;
  clonedRoleTeam: string;
  needsSecondAction: boolean;
  autoResult: { message: string } | null;
  groundCards: Array<{ id: string; label: string }> | null;
  otherPlayers: Array<{ id: string; name: string }> | null;
  message: string;
}

// ===== ROLE ACTION COMPONENT MAP =====

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ROLE_COMPONENTS: Record<string, ComponentType<any>> = {
  werewolf: WerewolfAction,
  minion: MinionAction,
  clone: CloneAction,
  seer: SeerAction,
  mason: MasonAction,
  robber: RobberAction,
  troublemaker: TroublemakerAction,
  drunk: DrunkAction,
  insomniac: InsomniacAction,
  joker: JokerAction,
};

// Roles that show their action component in the "done" state
const ROLES_WITH_PERSISTENT_ACTION = new Set(["werewolf", "minion", "seer", "mason", "robber", "troublemaker", "drunk", "joker", "clone", "insomniac"]);

// ===== HELPERS =====

// FIX #1: Safe interval management — always clear before setting
function clearIntervalRef(ref: React.MutableRefObject<ReturnType<typeof setInterval> | null>) {
  if (ref.current) {
    clearInterval(ref.current);
    ref.current = null;
  }
}

// ===== COMPONENT =====

function NightPhase() {
  const { gameCode } = useParams();
  const navigate = useNavigate();

  const playerName = useGameStore((s) => s.playerName) || "Unknown";
  const playerId = useGameStore((s) => s.playerId) || "";
  const isHost = useGameStore((s) => s.isHost);
  const hasAlreadyActed = useGameStore((s) => s.hasPerformedAction);
  const roleQueue = useGameStore((s) => s.roleQueue);
  const storeGroundCards = useGameStore((s) => s.groundCards);
  const storeInitialActiveRole = useGameStore((s) => s.initialActiveRole);
  const storeLastActionResult = useGameStore((s) => s.lastActionResult);
  const setPhase = useGameStore((s) => s.setPhase);
  const setDiscussionData = useGameStore((s) => s.setDiscussionData);
  const setHasPerformedAction = useGameStore((s) => s.setHasPerformedAction);
  const setLastActionResult = useGameStore((s) => s.setLastActionResult);

  const [myRole] = useState<string>(useGameStore.getState().roleName || "");
  const [showSplash, setShowSplash] = useState(!hasAlreadyActed);
  const [isMyTurn, setIsMyTurn] = useState(() => {
    if (hasAlreadyActed) return false;
    if (storeInitialActiveRole && myRole) {
      return storeInitialActiveRole.toLowerCase() === myRole.toLowerCase();
    }
    return false;
  });
  const [actionDone, setActionDone] = useState(hasAlreadyActed);
  const [actionResult, setActionResult] = useState<{ message?: string } | null>(hasAlreadyActed ? storeLastActionResult || { message: "Action was performed" } : null);
  const [players, setPlayers] = useState<Array<{ id: string; name: string }>>([]);
  const [groundCards, setGroundCards] = useState<Array<{ id: string; label: string }>>(storeGroundCards || []);
  const [roleTimer, setRoleTimer] = useState<number>(0);

  // Phase info modal
  const [showPhaseInfo, setShowPhaseInfo] = useState(false);

  // Clone two-phase state
  const [cloneResult, setCloneResult] = useState<CloneResult | null>(null);
  const awaitingCloneResultRef = useRef(false);

  // Queue-level tracking
  const [activeRole, setActiveRole] = useState<string>(storeInitialActiveRole || "");
  const [queueTimer, setQueueTimer] = useState<number>(0);
  const queueTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refs to avoid stale closures in socket callbacks
  const pendingNavigationRef = useRef<{
    timerSeconds: number;
    currentTimerSec: number;
    startedAt: number;
  } | null>(null);
  const actionResultRef = useRef<{ message?: string } | null>(actionResult);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerMaxRef = useRef<number>(0);
  const actionDoneRef = useRef(actionDone);

  // FIX #3: Guard against double navigation
  const hasNavigatedRef = useRef(false);

  // FIX #4: Buffer timer data received during splash
  const showSplashRef = useRef(showSplash);
  const pendingTimerRef = useRef<{ roleName: string; seconds: number; receivedAt: number } | null>(null);
  const pendingTurnRef = useRef<boolean>(false);

  // Keep refs in sync
  useEffect(() => {
    actionResultRef.current = actionResult;
  }, [actionResult]);

  useEffect(() => {
    actionDoneRef.current = actionDone;
  }, [actionDone]);

  useEffect(() => {
    showSplashRef.current = showSplash;
  }, [showSplash]);

  // Splash screen timer
  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [showSplash]);

  // FIX #4: When splash ends, apply any buffered timer/turn data
  useEffect(() => {
    if (showSplash) return; // Still showing splash

    // Apply buffered turn state
    if (pendingTurnRef.current) {
      setIsMyTurn(true);
      pendingTurnRef.current = false;
    }

    // Apply buffered timer — adjust for time elapsed during splash
    if (pendingTimerRef.current) {
      const { seconds, receivedAt, roleName } = pendingTimerRef.current;
      pendingTimerRef.current = null;

      if (myRole.toLowerCase() === roleName.toLowerCase() && !actionDoneRef.current) {
        const elapsedDuringSplash = Math.floor((Date.now() - receivedAt) / 1000);
        const adjusted = Math.max(seconds - elapsedDuringSplash, 0);
        timerMaxRef.current = seconds; // Keep original max for the fraction bar
        setRoleTimer(adjusted);

        if (adjusted > 0) {
          clearIntervalRef(timerIntervalRef);
          const startedAt = Date.now();
          timerIntervalRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startedAt) / 1000);
            const remaining = Math.max(adjusted - elapsed, 0);
            setRoleTimer(remaining);
            if (remaining <= 0) clearIntervalRef(timerIntervalRef);
          }, 1000);
        }
      }
    }
  }, [showSplash, myRole]);

  // Fetch players
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await fetch(`${API_URL}/api/games/${gameCode}`);
        const data = await res.json();
        if (data.success && data.data.players) {
          setPlayers(data.data.players);
        }
      } catch {
        console.error("Failed to fetch game data");
      }
    };
    fetchPlayers();
  }, [gameCode]);

  // Sync rejoin state
  useEffect(() => {
    if (hasAlreadyActed && !actionDone) {
      setActionDone(true);
      setIsMyTurn(false);
      const result = storeLastActionResult || { message: "Action was performed" };
      setActionResult(result);
      actionResultRef.current = result;
    }
  }, [hasAlreadyActed, storeLastActionResult]);

  // FIX #3: Safe navigation helper — prevents double navigation
  const navigateToDiscussion = useCallback(
    (data: { timerSeconds: number; currentTimerSec: number; startedAt: number }) => {
      if (hasNavigatedRef.current) return;
      hasNavigatedRef.current = true;

      clearIntervalRef(timerIntervalRef);
      clearIntervalRef(queueTimerRef);

      setDiscussionData(data);
      setPhase("discussion");
      navigate(`/discussion/${gameCode}`);
    },
    [gameCode, navigate, setDiscussionData, setPhase],
  );

  // Queue progress listener
  useEffect(() => {
    if (!socket.connected) socket.connect();

    const handleNightProgress = (data: { roleName: string; seconds: number }) => {
      setActiveRole(data.roleName);
      setQueueTimer(data.seconds);

      // FIX #1: Use safe clear helper
      clearIntervalRef(queueTimerRef);
      const slotStartedAt = Date.now();
      queueTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - slotStartedAt) / 1000);
        const remaining = Math.max(data.seconds - elapsed, 0);
        setQueueTimer(remaining);
        if (remaining <= 0) clearIntervalRef(queueTimerRef);
      }, 1000);
    };

    socket.on("nightRoleProgress", handleNightProgress);

    return () => {
      socket.off("nightRoleProgress", handleNightProgress);
      clearIntervalRef(queueTimerRef);
    };
  }, [gameCode]);

  // Clone insomniac result listener
  useEffect(() => {
    const handler = (data: { message: string; originalRole: string; currentRole: string; hasChanged: boolean }) => {
      const result = {
        message: data.message,
        originalRole: data.originalRole,
        currentRole: data.currentRole,
        hasChanged: data.hasChanged,
      };
      setActionResult(result);
      actionResultRef.current = result;
    };

    socket.on("cloneInsomniacResult", handler);
    return () => {
      socket.off("cloneInsomniacResult", handler);
    };
  }, [gameCode]);

  // Main game logic listeners
  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.on("groundCards", (data: { cards: Array<{ id: string; label: string }> }) => {
      setGroundCards(data.cards);
    });

    socket.on("roleActionQueue", (roleName: string) => {
      if (myRole.toLowerCase() === roleName.toLowerCase() && !actionDoneRef.current) {
        // FIX #4: If splash is still showing, buffer the turn
        if (showSplashRef.current) {
          pendingTurnRef.current = true;
        } else {
          setIsMyTurn(true);
        }
      } else {
        setIsMyTurn(false);
      }
    });

    socket.on("roleTimer", (data: { roleName: string; seconds: number }) => {
      if (myRole.toLowerCase() === data.roleName.toLowerCase() && !actionDoneRef.current) {
        // FIX #4: If splash is still showing, buffer the timer data
        if (showSplashRef.current) {
          pendingTimerRef.current = {
            roleName: data.roleName,
            seconds: data.seconds,
            receivedAt: Date.now(),
          };
          return;
        }

        timerMaxRef.current = data.seconds;
        setRoleTimer(data.seconds);
        // FIX #1: Use safe clear helper
        clearIntervalRef(timerIntervalRef);
        const slotStartedAt = Date.now();
        timerIntervalRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - slotStartedAt) / 1000);
          const remaining = Math.max(data.seconds - elapsed, 0);
          setRoleTimer(remaining);
          if (remaining <= 0) clearIntervalRef(timerIntervalRef);
        }, 1000);
      }
    });

    socket.on("actionResult", (data: { success: boolean; message: string; data?: any }) => {
      const result = data.data || { message: data.message };

      // Clone first-action result
      if (awaitingCloneResultRef.current && result.clonedRole) {
        awaitingCloneResultRef.current = false;
        setCloneResult(result as CloneResult);

        if (!result.needsSecondAction) {
          setActionResult(result);
          actionResultRef.current = result;
          setActionDone(true);
          setIsMyTurn(false);

          setHasPerformedAction(true);
          setLastActionResult(result);
          setRoleTimer(0);
          clearIntervalRef(timerIntervalRef);
        }
        return;
      }

      // Normal action result (or clone's second action)
      setActionResult(result);
      actionResultRef.current = result;
      setActionDone(true);
      setIsMyTurn(false);

      setHasPerformedAction(true);
      setLastActionResult(result);
      setRoleTimer(0);
      clearIntervalRef(timerIntervalRef);

      // FIX #2: If discussion was pending, navigate immediately
      // (reduced from 1000ms — the action result is already stored,
      // the role component will show it briefly during the navigate)
      if (pendingNavigationRef.current) {
        const navData = pendingNavigationRef.current;
        pendingNavigationRef.current = null;
        // Small delay just for the result to render once
        setTimeout(() => {
          navigateToDiscussion(navData);
        }, 300);
      }
    });

    socket.on("discussionStarted", (data: { timerSeconds: number; currentTimerSec: number; startedAt: number }) => {
      clearIntervalRef(timerIntervalRef);

      if (!actionResultRef.current && !hasAlreadyActed) {
        pendingNavigationRef.current = {
          timerSeconds: data.timerSeconds,
          currentTimerSec: data.currentTimerSec,
          startedAt: data.startedAt,
        };
        return;
      }

      // FIX #3: Use safe navigation helper
      navigateToDiscussion(data);
    });

    return () => {
      socket.off("groundCards");
      socket.off("roleActionQueue");
      socket.off("roleTimer");
      socket.off("actionResult");
      socket.off("discussionStarted");
      clearIntervalRef(timerIntervalRef);
    };
  }, [gameCode, myRole, actionDone, navigate, playerName, playerId, isHost, hasAlreadyActed, navigateToDiscussion]);

  // Polling fallback for phase check when already acted
  useEffect(() => {
    if (!hasAlreadyActed) return;

    const checkPhase = async () => {
      // FIX #3: Don't poll if we've already navigated
      if (hasNavigatedRef.current) return;
      try {
        const res = await fetch(`${API_URL}/api/games/${gameCode}`);
        const data = await res.json();
        if (data.success && data.data.phase === "discussion") {
          // FIX #3: Use safe navigation helper
          navigateToDiscussion({
            timerSeconds: data.data.timerSeconds,
            currentTimerSec: data.data.currentTimerSec,
            startedAt: data.data.startedAt,
          });
        }
      } catch {
        /* ignore */
      }
    };

    const interval = setInterval(checkPhase, 3000);
    return () => clearInterval(interval);
  }, [hasAlreadyActed, gameCode, navigateToDiscussion]);

  // ===== HANDLERS =====

  const handleAction = useCallback(
    (action: Record<string, unknown>) => {
      socket.emit("performAction", { gameCode, playerId, action });
    },
    [gameCode, playerId],
  );

  const handleCloneFirstAction = useCallback(
    (action: Record<string, unknown>) => {
      awaitingCloneResultRef.current = true;
      socket.emit("performAction", { gameCode, playerId, action });
    },
    [gameCode, playerId],
  );

  // ===== RENDER HELPERS =====

  const renderActionComponent = () => {
    const roleLower = myRole.toLowerCase();
    const Component = ROLE_COMPONENTS[roleLower];
    if (!Component) return null;

    const locked = !isMyTurn && !actionDone;
    const baseProps = { onAction: handleAction, locked };

    switch (roleLower) {
      case "werewolf":
        return <Component {...baseProps} playerId={playerId} players={players} groundCards={groundCards} actionResult={actionResult} />;
      case "minion":
        return <Component {...baseProps} playerId={playerId} players={players} actionResult={actionResult} />;
      case "clone":
        return <Component {...baseProps} playerId={playerId} players={players} groundCards={groundCards} onCloneFirstAction={handleCloneFirstAction} cloneResult={cloneResult} actionResult={actionResult} />;
      case "seer":
        return <Component {...baseProps} playerId={playerId} players={players} groundCards={groundCards} actionResult={actionResult} />;
      case "mason":
        return <Component {...baseProps} playerId={playerId} players={players} actionResult={actionResult} />;
      case "robber":
        return <Component {...baseProps} playerId={playerId} players={players} actionResult={actionResult} />;
      case "troublemaker":
        return <Component {...baseProps} playerId={playerId} players={players} actionResult={actionResult} />;
      case "drunk":
        return <Component {...baseProps} playerId={playerId} players={players} groundCards={groundCards} actionResult={actionResult} />;
      case "joker":
        return <Component {...baseProps} playerId={playerId} players={players} groundCards={groundCards} actionResult={actionResult} />;
      case "insomniac":
        return <Component {...baseProps} actionResult={actionResult} />;
      default:
        return <Component {...baseProps} />;
    }
  };

  const timerMax = timerMaxRef.current || roleTimer;
  const timerFraction = timerMax > 0 ? roleTimer / timerMax : 0;
  const isUrgent = roleTimer <= 5;

  // Determine if this role uses a persistent action component (visual post-action state)
  const roleLower = myRole.toLowerCase();
  const hasPersistentAction = ROLES_WITH_PERSISTENT_ACTION.has(roleLower);

  // Should we show the action component? Yes if:
  // - It's our turn (active play), OR
  // - Action is done AND this role has a persistent visual
  const showActionComponent = !showSplash && (isMyTurn || actionDone || hasPersistentAction);

  // Should we show the generic ActionComplete waiting text?
  // Only if action is done but the role does NOT have a persistent action visual
  const showGenericResult = actionDone && actionResult && !hasPersistentAction;

  // ===== RENDER =====

  return (
    <div className="np-page">
      <div className="np-vignette" />

      {/* ===== SPLASH SCREEN ===== */}
      {showSplash && (
        <div className="np-splash">
          <div className="np-splash-content">
            <span className="np-splash-text">LET THE NIGHT BEGIN</span>
          </div>
        </div>
      )}

      {/* ===== MAIN CONTENT (hidden during splash) ===== */}
      {!showSplash && (
        <>
          {/* Header */}
          <div className="np-header">
            <div className="np-header-inner">
              <div className="np-moon">☽</div>
              <h1 className="np-phase-title">NIGHT PHASE</h1>
              <div className="np-header-divider" />
              <p className="np-role-label">{myRole ? myRole.toUpperCase() : "UNKNOWN"}</p>
            </div>
            <button className="np-info-btn" onClick={() => setShowPhaseInfo(true)} aria-label="Phase info">
              !
            </button>
          </div>

          {/* Timer bar — only when it's your turn */}
          {isMyTurn && roleTimer > 0 && (
            <div className="np-timer">
              <div className="np-timer-track">
                <div className={`np-timer-fill ${isUrgent ? "np-timer-fill--urgent" : "np-timer-fill--normal"}`} style={{ transform: `scaleX(${timerFraction})` }} />
              </div>
              <span className={`np-timer-text ${isUrgent ? "np-timer-text--urgent" : "np-timer-text--normal"}`}>{roleTimer}s</span>
            </div>
          )}

          {/* Content */}
          <div className="np-content">
            {showActionComponent ? (
              <div className="np-content-inner">
                <div className="np-action-enter">{renderActionComponent()}</div>
                {roleQueue.length > 0 && (
                  <div className="np-progress-below">
                    <NightRoleProgress roleQueue={roleQueue} activeRole={activeRole} timer={queueTimer} myRole={myRole} />
                  </div>
                )}
              </div>
            ) : (
              <div className="np-waiting-layout">
                {showGenericResult && (
                  <div className="np-result-section">
                    <ActionComplete result={actionResult} />
                  </div>
                )}
                {roleQueue.length > 0 && <NightRoleProgress roleQueue={roleQueue} activeRole={activeRole} timer={queueTimer} myRole={myRole} />}
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== PHASE INFO MODAL ===== */}
      {showPhaseInfo && (
        <div className="np-phase-overlay" onClick={() => setShowPhaseInfo(false)}>
          <div className="np-phase-modal" onClick={(e) => e.stopPropagation()}>
            <div className="np-phase-header">
              <h2 className="np-phase-title-modal">NIGHT PHASE</h2>
              <button className="np-phase-close" onClick={() => setShowPhaseInfo(false)}>
                ✕
              </button>
            </div>
            <div className="np-phase-body">
              <p className="np-phase-flavor">The village sleeps. Roles wake one by one to perform their secret actions.</p>

              <div className="np-phase-item">
                <div>
                  <span className="np-phase-item-title">YOUR ACTION</span>
                  <p className="np-phase-item-desc">When it's your turn, perform your role's unique ability. Each role has a limited time window to act before the game auto-performs for you.</p>
                </div>
              </div>

              <div className="np-phase-item">
                <div>
                  <span className="np-phase-item-title">PLAYER CIRCLE</span>
                  <p className="np-phase-item-desc">All other players' cards are spread around you face-down. Tap on them to interact based on your role's ability.</p>
                </div>
              </div>

              <div className="np-phase-item">
                <div>
                  <span className="np-phase-item-title">ACTIVE ROLE TRACKER</span>
                  <p className="np-phase-item-desc">The face-up card at the bottom shows which role is currently acting. Roles are called in a fixed order from Werewolf to Joker.</p>
                </div>
              </div>

              <div className="np-phase-item">
                <div>
                  <span className="np-phase-item-title">ROLE DETAILS</span>
                  <p className="np-phase-item-desc">Tap the face-up active role card to open a detail view and check what that role's ability does.</p>
                </div>
              </div>

              <div className="np-phase-item">
                <div>
                  <span className="np-phase-item-title">TIMER</span>
                  <p className="np-phase-item-desc">When it's your turn a timer bar appears at the top. If time runs out, the game picks a random valid action for you.</p>
                </div>
              </div>
            </div>
            <div className="np-phase-footer">
              <button className="np-phase-dismiss" onClick={() => setShowPhaseInfo(false)}>
                GOT IT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NightPhase;
