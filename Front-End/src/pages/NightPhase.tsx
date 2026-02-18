import { useState, useEffect, useRef, useCallback, type ComponentType } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import { useLeaveWarning } from "../hooks/useLeaveWarning";
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
import "./NightPhase.css";

// ===== TYPES =====

interface LocationState {
  playerName: string;
  playerId: string;
  isHost: boolean;
  roleQueue: { roleName: string; seconds: number }[];
  roleName?: string;
  initialActiveRole?: string;
  initialGroundCards?: Array<{ id: string; label: string }>;
  hasPerformedAction?: boolean;
  lastActionResult?: { message?: string } | null;
}

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

// ===== COMPONENT =====

function NightPhase() {
  const { gameCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const playerName = state?.playerName || "Unknown";
  const playerId = state?.playerId || "";
  const isHost = state?.isHost || false;
  const hasAlreadyActed = state?.hasPerformedAction || false;
  const roleQueue = state?.roleQueue || [];

  const [myRole] = useState<string>(state?.roleName || "");
  const [isMyTurn, setIsMyTurn] = useState(() => {
    if (hasAlreadyActed) return false;
    const initialRole = state?.initialActiveRole;
    if (initialRole && state?.roleName) {
      return initialRole.toLowerCase() === state.roleName.toLowerCase();
    }
    return false;
  });
  const [actionDone, setActionDone] = useState(hasAlreadyActed);
  const [actionResult, setActionResult] = useState<{ message?: string } | null>(hasAlreadyActed ? state?.lastActionResult || { message: "Action was performed" } : null);
  const [players, setPlayers] = useState<Array<{ id: string; name: string }>>([]);
  const [groundCards, setGroundCards] = useState<Array<{ id: string; label: string }>>(state?.initialGroundCards || []);
  const [roleTimer, setRoleTimer] = useState<number>(0);

  // Clone two-phase state
  const [cloneResult, setCloneResult] = useState<CloneResult | null>(null);
  const awaitingCloneResultRef = useRef(false);

  // Queue-level tracking
  const [activeRole, setActiveRole] = useState<string>(state?.initialActiveRole || "");
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

  useLeaveWarning(true);

  // Keep refs in sync
  useEffect(() => {
    actionResultRef.current = actionResult;
  }, [actionResult]);

  useEffect(() => {
    actionDoneRef.current = actionDone;
  }, [actionDone]);

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
    if (state?.hasPerformedAction && !actionDone) {
      setActionDone(true);
      setIsMyTurn(false);
      const result = state.lastActionResult || { message: "Action was performed" };
      setActionResult(result);
      actionResultRef.current = result;
    }
  }, [state?.hasPerformedAction, state?.lastActionResult]);

  // Queue progress listener
  useEffect(() => {
    if (!socket.connected) socket.connect();

    const handleNightProgress = (data: { roleName: string; seconds: number }) => {
      setActiveRole(data.roleName);
      setQueueTimer(data.seconds);

      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
      let remaining = data.seconds;
      queueTimerRef.current = setInterval(() => {
        remaining--;
        setQueueTimer(Math.max(remaining, 0));
        if (remaining <= 0 && queueTimerRef.current) {
          clearInterval(queueTimerRef.current);
        }
      }, 1000);
    };

    socket.on("nightRoleProgress", handleNightProgress);

    return () => {
      socket.off("nightRoleProgress", handleNightProgress);
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    };
  }, [gameCode]);

  // Clone insomniac result listener
  useEffect(() => {
    const handler = (data: { message: string; originalRole: string; currentRole: string; hasChanged: boolean }) => {
      const result = { message: data.message };
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
        setIsMyTurn(true);
      } else {
        setIsMyTurn(false);
      }
    });

    socket.on("roleTimer", (data: { roleName: string; seconds: number }) => {
      if (myRole.toLowerCase() === data.roleName.toLowerCase() && !actionDoneRef.current) {
        timerMaxRef.current = data.seconds;
        setRoleTimer(data.seconds);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        let remaining = data.seconds;
        timerIntervalRef.current = setInterval(() => {
          remaining--;
          setRoleTimer(remaining);
          if (remaining <= 0 && timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
          }
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
          setRoleTimer(0);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }
        return;
      }

      // Normal action result (or clone's second action)
      setActionResult(result);
      actionResultRef.current = result;
      setActionDone(true);
      setIsMyTurn(false);
      setCloneResult(null);
      setRoleTimer(0);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      if (pendingNavigationRef.current) {
        const navData = pendingNavigationRef.current;
        pendingNavigationRef.current = null;
        setTimeout(() => {
          navigate(`/discussion/${gameCode}`, {
            state: {
              playerName,
              playerId,
              isHost,
              timerSeconds: navData.timerSeconds,
              currentTimerSec: navData.currentTimerSec,
              startedAt: navData.startedAt,
              roleName: myRole,
              actionResult: actionResultRef.current,
            },
          });
        }, 1000);
      }
    });

    socket.on("discussionStarted", (data: { timerSeconds: number; currentTimerSec: number; startedAt: number }) => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      if (!actionResultRef.current && !hasAlreadyActed) {
        pendingNavigationRef.current = {
          timerSeconds: data.timerSeconds,
          currentTimerSec: data.currentTimerSec,
          startedAt: data.startedAt,
        };
        return;
      }

      navigate(`/discussion/${gameCode}`, {
        state: {
          playerName,
          playerId,
          isHost,
          timerSeconds: data.timerSeconds,
          currentTimerSec: data.currentTimerSec,
          startedAt: data.startedAt,
          roleName: myRole,
          actionResult: actionResultRef.current,
        },
      });
    });

    return () => {
      socket.off("groundCards");
      socket.off("roleActionQueue");
      socket.off("roleTimer");
      socket.off("actionResult");
      socket.off("discussionStarted");
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gameCode, myRole, actionDone, navigate, playerName, playerId, isHost, hasAlreadyActed]);

  // Polling fallback for phase check when already acted
  useEffect(() => {
    if (!hasAlreadyActed) return;

    const checkPhase = async () => {
      try {
        const res = await fetch(`${API_URL}/api/games/${gameCode}`);
        const data = await res.json();
        if (data.success && data.data.phase === "discussion") {
          navigate(`/discussion/${gameCode}`, {
            state: {
              playerName,
              playerId,
              isHost,
              timerSeconds: data.data.timerSeconds,
              currentTimerSec: data.data.currentTimerSec,
              startedAt: data.data.startedAt,
              roleName: myRole,
              actionResult: actionResultRef.current,
            },
          });
        }
      } catch {
        /* ignore */
      }
    };

    const interval = setInterval(checkPhase, 3000);
    return () => clearInterval(interval);
  }, [hasAlreadyActed, gameCode, navigate, playerName, playerId, isHost, myRole]);

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

    // Build props based on what each component needs
    const baseProps = { onAction: handleAction };

    switch (roleLower) {
      case "clone":
        return <Component {...baseProps} playerId={playerId} players={players} groundCards={groundCards} onCloneFirstAction={handleCloneFirstAction} cloneResult={cloneResult} />;
      case "seer":
        return <Component {...baseProps} playerId={playerId} players={players} groundCards={groundCards} />;
      case "robber":
      case "troublemaker":
        return <Component {...baseProps} playerId={playerId} players={players} />;
      case "drunk":
      case "joker":
        return <Component {...baseProps} groundCards={groundCards} />;
      default:
        return <Component {...baseProps} />;
    }
  };

  const timerMax = timerMaxRef.current || roleTimer;
  const timerFraction = timerMax > 0 ? roleTimer / timerMax : 0;
  const isUrgent = roleTimer <= 5;

  // ===== RENDER =====

  return (
    <div className="np-page">
      <div className="np-vignette" />

      {/* Header */}
      <div className="np-header">
        <div className="np-header-inner">
          <div className="np-moon">☽</div>
          <h1 className="np-phase-title">NIGHT PHASE</h1>
          <div className="np-header-divider" />
          <p className="np-role-label">{myRole ? myRole.toUpperCase() : "UNKNOWN"}</p>
        </div>
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
        {isMyTurn ? (
          <div className="np-content-inner">
            <div className="np-action-enter">{renderActionComponent()}</div>
          </div>
        ) : (
          <div className="np-waiting-layout">
            {actionDone && actionResult && (
              <div className="np-result-section">
                <ActionComplete result={actionResult} />
              </div>
            )}
            {roleQueue.length > 0 && <NightRoleProgress roleQueue={roleQueue} activeRole={activeRole} timer={queueTimer} myRole={myRole} />}
          </div>
        )}
      </div>
    </div>
  );
}

export default NightPhase;
