import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";

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

interface LocationState {
  playerName: string;
  playerId: string;
  isHost: boolean;
  roleName?: string;
  initialActiveRole?: string;
  initialGroundCards?: Array<{ id: string; label: string }>;
}

function NightPhase() {
  const { gameCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const playerName = state?.playerName || "Unknown";
  const playerId = state?.playerId || "";
  const isHost = state?.isHost || false;

  const [myRole] = useState<string>(state?.roleName || "");
  const [isMyTurn, setIsMyTurn] = useState(() => {
    const initialRole = state?.initialActiveRole;
    if (initialRole && state?.roleName) {
      return initialRole.toLowerCase() === state.roleName.toLowerCase();
    }
    return false;
  });
  const [actionDone, setActionDone] = useState(false);
  const [actionResult, setActionResult] = useState<{ message?: string } | null>(null);
  const [players, setPlayers] = useState<Array<{ id: string; name: string }>>([]);
  const [groundCards, setGroundCards] = useState<Array<{ id: string; label: string }>>(state?.initialGroundCards || []);

  // Check initial active role on mount

  // Fetch player list on mount
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/games/${gameCode}`);
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

    // Receive ground card IDs
    socket.on("groundCards", (data: { cards: Array<{ id: string; label: string }> }) => {
      setGroundCards(data.cards);
    });

    // A role's turn has started
    socket.on("roleActionQueue", (roleName: string) => {
      console.log(`Role turn: ${roleName}, my role: ${myRole}`);

      if (myRole.toLowerCase() === roleName.toLowerCase() && !actionDone) {
        setIsMyTurn(true);
      } else {
        setIsMyTurn(false);
      }
    });

    // Also listen for nextAction (same purpose)
    socket.on("nextAction", (roleName: string) => {
      console.log(`Next role: ${roleName}, my role: ${myRole}`);

      if (myRole.toLowerCase() === roleName.toLowerCase() && !actionDone) {
        setIsMyTurn(true);
      } else {
        setIsMyTurn(false);
      }
    });

    // Action result from server
    socket.on("actionResult", (data: { success: boolean; message: string; data?: { message?: string } }) => {
      console.log("Action result:", data);
      setActionResult(data.data || { message: data.message });
      setActionDone(true);
      setIsMyTurn(false);
    });

    // Discussion phase started — night is over
    socket.on("discussionStarted", (data: { timerSeconds: number }) => {
      navigate(`/discussion/${gameCode}`, {
        state: { playerName, playerId, isHost, timerSeconds: data.timerSeconds },
      });
    });

    return () => {
      socket.off("groundCards");
      socket.off("roleActionQueue");
      socket.off("nextAction");
      socket.off("actionResult");
      socket.off("discussionStarted");
    };
  }, [gameCode, myRole, actionDone, navigate, playerName, playerId, isHost]);

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

      {actionDone ? <ActionComplete result={actionResult} /> : isMyTurn ? renderActionComponent() : <WaitingForTurn />}
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
};

export default NightPhase;
