import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import { useLeaveWarning } from "../hooks/useLeaveWarning";

import WaitingForTurn from "../components/roles/WaitingForTurn";
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
import { API_URL } from "../config";

interface LocationState {
  playerName: string;
  playerId: string;
  isHost: boolean;
  roleName?: string;
  initialActiveRole?: string;
  initialGroundCards?: Array<{ id: string; label: string }>;
  hasPerformedAction?: boolean;
  lastActionResult?: { message?: string } | null;
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

  const pendingNavigationRef = useRef<{ timerSeconds: number } | null>(null);
  const actionResultRef = useRef<{ message?: string } | null>(actionResult);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useLeaveWarning(true);

  useEffect(() => {
    actionResultRef.current = actionResult;
  }, [actionResult]);

  // Fetch player list on mount
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
    if (!socket.connected) {
      socket.connect();
    }

    socket.on("groundCards", (data: { cards: Array<{ id: string; label: string }> }) => {
      setGroundCards(data.cards);
    });

    socket.on("roleActionQueue", (roleName: string) => {
      console.log(`Role turn: ${roleName}, my role: ${myRole}`);
      if (myRole.toLowerCase() === roleName.toLowerCase() && !actionDone) {
        setIsMyTurn(true);
      } else {
        setIsMyTurn(false);
      }
    });

    socket.on("roleTimer", (data: { roleName: string; seconds: number }) => {
      // Only show timer if it's my turn
      if (myRole.toLowerCase() === data.roleName.toLowerCase() && !actionDone) {
        setRoleTimer(data.seconds);
        // Start countdown
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

    socket.on("actionResult", (data: { success: boolean; message: string; data?: { message?: string } }) => {
      console.log("Action result:", data);
      const result = data.data || { message: data.message };
      setActionResult(result);
      actionResultRef.current = result;
      setActionDone(true);
      setIsMyTurn(false);
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
              roleName: myRole,
              actionResult: actionResultRef.current,
            },
          });
        }, 100);
      }
    });

    socket.on("discussionStarted", (data: { timerSeconds: number }) => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      if (!actionResultRef.current && !hasAlreadyActed) {
        console.log("Discussion started but waiting for action result...");
        pendingNavigationRef.current = data;
        return;
      }

      navigate(`/discussion/${gameCode}`, {
        state: {
          playerName,
          playerId,
          isHost,
          timerSeconds: data.timerSeconds,
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

  const handleAction = (action: Record<string, unknown>) => {
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
        return <CloneAction playerId={playerId} players={players} onAction={handleAction} />;
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
        return <WaitingForTurn />;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.phase}>🌙 Night Phase</span>
      </div>

      {actionDone ? (
        <ActionComplete result={actionResult} />
      ) : isMyTurn ? (
        <div>
          {roleTimer > 0 && (
            <div style={styles.timerBar}>
              <span
                style={{
                  ...styles.timerText,
                  color: roleTimer <= 5 ? "#ff4444" : "#fff",
                }}
              >
                {roleTimer}s
              </span>
            </div>
          )}
          {renderActionComponent()}
        </div>
      ) : (
        <WaitingForTurn />
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    maxWidth: "480px",
    margin: "0 auto",
    padding: "20px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  phase: {
    fontSize: "18px",
    fontWeight: "bold",
  },
  timerBar: {
    textAlign: "center" as const,
    marginBottom: "16px",
  },
  timerText: {
    fontSize: "24px",
    fontWeight: "bold",
    fontVariantNumeric: "tabular-nums",
  },
};

export default NightPhase;
