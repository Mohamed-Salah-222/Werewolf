import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import { useLeaveWarning } from "../hooks/useLeaveWarning";
import "./NightPhase.css";

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
import NightRoleQueue from "../components/roles/NightRoleQueue";
import { API_URL } from "../config";

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

  const pendingNavigationRef = useRef<{ timerSeconds: number; currentTimerSec: number; startedAt: number } | null>(null);
  const actionResultRef = useRef<{ message?: string } | null>(actionResult);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerMaxRef = useRef<number>(0);
  const actionDoneRef = useRef(actionDone);

  useLeaveWarning(true);

  useEffect(() => {
    actionResultRef.current = actionResult;
  }, [actionResult]);

  useEffect(() => {
    actionDoneRef.current = actionDone;
  }, [actionDone]);

  useEffect(() => {
    const fetchGameData = async () => {
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
    fetchGameData();
  }, [gameCode]);

  useEffect(() => {
    if (state?.hasPerformedAction && !actionDone) {
      setActionDone(true);
      setIsMyTurn(false);
      const result = state.lastActionResult || { message: "Action was performed" };
      setActionResult(result);
      actionResultRef.current = result;
    }
  }, [state?.hasPerformedAction, state?.lastActionResult]);

  // ===== QUEUE PROGRESS — stable effect =====
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleNightProgress = (data: { roleName: string; seconds: number }) => {
      setActiveRole(data.roleName);
      setQueueTimer(data.seconds);

      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
      let remaining = data.seconds;
      queueTimerRef.current = setInterval(() => {
        remaining--;
        setQueueTimer(Math.max(remaining, 0));
        if (remaining <= 0) {
          if (queueTimerRef.current) clearInterval(queueTimerRef.current);
        }
      }, 1000);
    };

    socket.on("nightRoleProgress", handleNightProgress);

    return () => {
      socket.off("nightRoleProgress", handleNightProgress);
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    };
  }, [gameCode]);

  // ===== CLONE INSOMNIAC RESULT — stable effect, never torn down =====
  useEffect(() => {
    const handleCloneInsomniacResult = (data: { message: string; originalRole: string; currentRole: string; hasChanged: boolean }) => {
      console.log("🧬💤 Clone-Insomniac result received:", data);
      const updatedResult = { message: data.message };
      setActionResult(updatedResult);
      actionResultRef.current = updatedResult;
    };

    socket.on("cloneInsomniacResult", handleCloneInsomniacResult);

    return () => {
      socket.off("cloneInsomniacResult", handleCloneInsomniacResult);
    };
  }, [gameCode]);

  // ===== GAME LOGIC =====
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.on("groundCards", (data: { cards: Array<{ id: string; label: string }> }) => {
      setGroundCards(data.cards);
    });

    socket.on("roleActionQueue", (roleName: string) => {
      console.log(`Role turn: ${roleName}, my role: ${myRole}`);
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
          if (remaining <= 0) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          }
        }, 1000);
      }
    });

    socket.on("actionResult", (data: { success: boolean; message: string; data?: any }) => {
      console.log("Action result:", data);
      const result = data.data || { message: data.message };

      // Check if this is a clone first-action result
      if (awaitingCloneResultRef.current && result.clonedRole) {
        console.log("🧬 Clone first action result:", result);
        awaitingCloneResultRef.current = false;
        setCloneResult(result as CloneResult);

        if (!result.needsSecondAction) {
          // Passive role — clone is done
          setActionResult(result);
          actionResultRef.current = result;
          setActionDone(true);
          setIsMyTurn(false);
          setRoleTimer(0);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }
        return;
      }

      // Normal action result (or clone's second action result)
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
        console.log("Discussion started but waiting for action result...");
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

  const handleAction = (action: Record<string, unknown>) => {
    socket.emit("performAction", {
      gameCode,
      playerId,
      action,
    });
  };

  const handleCloneFirstAction = (action: Record<string, unknown>) => {
    awaitingCloneResultRef.current = true;
    socket.emit("performAction", {
      gameCode,
      playerId,
      action,
    });
  };

  const renderActionComponent = () => {
    const roleLower = myRole.toLowerCase();

    switch (roleLower) {
      case "werewolf":
        return <WerewolfAction onAction={handleAction} />;
      case "minion":
        return <MinionAction onAction={handleAction} />;
      case "clone":
        return <CloneAction playerId={playerId} players={players} groundCards={groundCards} onAction={handleAction} onCloneFirstAction={handleCloneFirstAction} cloneResult={cloneResult} />;
      case "seer":
        return <SeerAction playerId={playerId} players={players} groundCards={groundCards} onAction={handleAction} />;
      case "mason":
        return <MasonAction onAction={handleAction} />;
      case "robber":
        return <RobberAction playerId={playerId} players={players} onAction={handleAction} />;
      case "troublemaker":
        return <TroublemakerAction playerId={playerId} players={players} onAction={handleAction} />;
      case "drunk":
        return <DrunkAction groundCards={groundCards} onAction={handleAction} />;
      case "insomniac":
        return <InsomniacAction onAction={handleAction} />;
      case "joker":
        return <JokerAction groundCards={groundCards} onAction={handleAction} />;
      default:
        return null;
    }
  };

  const timerMax = timerMaxRef.current || roleTimer;
  const timerFraction = timerMax > 0 ? roleTimer / timerMax : 0;

  return (
    <div style={styles.page} className="np-page">
      <div style={styles.vignette} />

      <style>{`
        @keyframes moonPulse {
          0%, 100% { text-shadow: 0 0 20px rgba(201,168,76,0.3), 0 0 60px rgba(201,168,76,0.1); }
          50% { text-shadow: 0 0 30px rgba(201,168,76,0.5), 0 0 80px rgba(201,168,76,0.2); }
        }
        @keyframes timerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={styles.header} className="np-header">
        <div style={styles.headerInner}>
          <div style={styles.moonIcon}>☽</div>
          <h1 style={styles.phaseTitle}>NIGHT PHASE</h1>
          <div style={styles.headerDivider} />
          <p style={styles.roleLabel}>{myRole ? myRole.toUpperCase() : "UNKNOWN"}</p>
        </div>
      </div>

      {isMyTurn && roleTimer > 0 && (
        <div style={styles.timerSection} className="np-timer">
          <div style={styles.timerTrack}>
            <div
              style={{
                ...styles.timerFill,
                transform: `scaleX(${timerFraction})`,
                backgroundColor: roleTimer <= 5 ? "#c41e1e" : "#c9a84c",
                boxShadow: roleTimer <= 5 ? "0 0 12px rgba(196,30,30,0.6)" : "0 0 12px rgba(201,168,76,0.4)",
              }}
            />
          </div>
          <span
            style={{
              ...styles.timerText,
              color: roleTimer <= 5 ? "#c41e1e" : "#c9a84c",
              animation: roleTimer <= 5 ? "timerPulse 0.6s ease-in-out infinite" : "none",
            }}
          >
            {roleTimer}s
          </span>
        </div>
      )}

      <div style={styles.contentArea} className="np-content">
        <div style={styles.contentInner}>
          {isMyTurn ? (
            <div style={{ animation: "fadeSlideIn 0.4s ease-out" }}>{renderActionComponent()}</div>
          ) : (
            <div>
              {actionDone && actionResult && (
                <div style={styles.resultSection}>
                  <ActionComplete result={actionResult} />
                </div>
              )}
              {roleQueue.length > 0 && <NightRoleQueue roleQueue={roleQueue} activeRole={activeRole} timer={queueTimer} myRole={myRole} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    position: "relative",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    background: "radial-gradient(ellipse at 30% 20%, #0f0a1a 0%, #0a0a0a 40%, #000 100%)",
    fontFamily: "'Trade Winds', cursive",
    color: "#e8dcc8",
  },
  vignette: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)",
    zIndex: 1,
  },
  header: {
    position: "relative",
    zIndex: 10,
    padding: "28px 40px 20px",
    borderBottom: "1px solid #1a1510",
    textAlign: "center" as const,
  },
  headerInner: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "4px",
  },
  moonIcon: {
    fontSize: "36px",
    color: "#c9a84c",
    lineHeight: 1,
    filter: "drop-shadow(0 0 20px rgba(201,168,76,0.4))",
    animation: "moonPulse 4s ease-in-out infinite",
  },
  phaseTitle: {
    fontSize: "36px",
    fontWeight: 400,
    letterSpacing: "8px",
    margin: 0,
    fontFamily: "'Creepster', cursive",
    background: "linear-gradient(180deg, #e8c84a 0%, #c9a84c 40%, #8a6d2e 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    filter: "drop-shadow(0 0 30px rgba(201,168,76,0.2))",
  },
  headerDivider: {
    width: "60px",
    height: "1px",
    backgroundColor: "#3d2e1a",
    margin: "8px 0",
  },
  roleLabel: {
    fontSize: "12px",
    letterSpacing: "4px",
    color: "#8a7a60",
    margin: 0,
    fontFamily: "'Trade Winds', cursive",
  },
  timerSection: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 40px 12px",
  },
  timerTrack: {
    flex: 1,
    height: "3px",
    backgroundColor: "#1a1510",
    borderRadius: "2px",
    overflow: "hidden",
  },
  timerFill: {
    height: "100%",
    transformOrigin: "left",
    transition: "transform 1s linear, background-color 0.3s ease",
    borderRadius: "2px",
  },
  timerText: {
    fontSize: "18px",
    fontWeight: 400,
    fontFamily: "'Creepster', cursive",
    letterSpacing: "2px",
    fontVariantNumeric: "tabular-nums",
    minWidth: "40px",
    textAlign: "right" as const,
  },
  contentArea: {
    position: "relative",
    zIndex: 10,
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px 40px",
    overflow: "auto",
  },
  contentInner: {
    width: "100%",
    maxWidth: "480px",
  },
  resultSection: {
    marginBottom: "16px",
  },
};

export default NightPhase;
