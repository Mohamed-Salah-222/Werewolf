import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import { useLeaveWarning } from "../hooks/useLeaveWarning";

interface LocationState {
  playerName: string;
  playerId: string;
  isHost: boolean;
  rejoinRoleInfo?: {
    roleName: string;
    roleTeam: string;
    roleDescription: string;
  } | null;
  hasConfirmedRole?: boolean;
}

interface RoleInfo {
  roleName: string;
  roleTeam: string;
  roleDescription: string;
}

function RoleReveal() {
  const { gameCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const playerName = state?.playerName || "Unknown";
  const playerId = state?.playerId || "";
  const isHost = state?.isHost || false;
  const [revealed, setRevealed] = useState(false);

  const [role, setRole] = useState<RoleInfo | null>(() => {
    const rejoinInfo = state?.rejoinRoleInfo;
    if (rejoinInfo) {
      return {
        roleName: rejoinInfo.roleName,
        roleTeam: rejoinInfo.roleTeam,
        roleDescription: rejoinInfo.roleDescription,
      };
    }
    return null;
  });

  const [confirmed, setConfirmed] = useState(state?.hasConfirmedRole || false);

  useLeaveWarning(true);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    let pendingActiveRole: string | null = null;
    let pendingGroundCards: Array<{ id: string; label: string }> | null = null;

    socket.on("roleReveal", (data: { playerId: string; roleName: string; roleTeam: string; roleDescription?: string }) => {
      if (data.playerId === playerId) {
        setRole({
          roleName: data.roleName,
          roleTeam: data.roleTeam,
          roleDescription: data.roleDescription || "",
        });
      }
    });

    // Capture these early — they may fire before NightPhase mounts
    socket.on("roleActionQueue", (roleName: string) => {
      pendingActiveRole = roleName;
    });

    socket.on("groundCards", (data: { cards: Array<{ id: string; label: string }> }) => {
      pendingGroundCards = data.cards;
    });

    socket.on("nightStarted", () => {
      // Small delay to let roleActionQueue and groundCards arrive first
      setTimeout(() => {
        navigate(`/night/${gameCode}`, {
          state: {
            playerName,
            playerId,
            isHost,
            roleName: role?.roleName,
            initialActiveRole: pendingActiveRole,
            initialGroundCards: pendingGroundCards,
          },
        });
      }, 300);
    });

    return () => {
      socket.off("roleReveal");
      socket.off("nightStarted");
      socket.off("roleActionQueue");
      socket.off("groundCards");
    };
  }, [gameCode, playerId, navigate, playerName, isHost, role]);

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleConfirm = () => {
    setConfirmed(true);
    socket.emit("confirmRoleReveal", { gameCode, playerId });
  };

  const teamColor = (team: string) => {
    switch (team) {
      case "werewolves":
        return "#ff4444";
      case "villagers":
        return "#4ade80";
      case "joker":
        return "#f0c040";
      default:
        return "#fff";
    }
  };

  const teamLabel = (team: string) => {
    switch (team) {
      case "werewolves":
        return "WEREWOLF TEAM";
      case "villagers":
        return "VILLAGE TEAM";
      case "joker":
        return "JOKER";
      default:
        return team.toUpperCase();
    }
  };

  // Waiting for role data from server
  if (!role) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Role Reveal</h1>
        <p style={styles.waiting}>Assigning roles...</p>
      </div>
    );
  }

  // Role received but not yet revealed
  if (!revealed) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Role Reveal</h1>
        <p style={styles.instruction}>Your role has been assigned.</p>
        <p style={styles.instruction}>Tap below when you're ready to see it.</p>
        <p style={styles.warning}>Make sure no one is looking at your screen!</p>
        <button style={styles.revealButton} onClick={handleReveal}>
          Reveal My Role
        </button>
      </div>
    );
  }

  // Role revealed
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Your Role</h1>

      <div
        style={{
          ...styles.roleCard,
          borderColor: teamColor(role.roleTeam),
        }}
      >
        <span
          style={{
            ...styles.teamBadge,
            color: teamColor(role.roleTeam),
          }}
        >
          {teamLabel(role.roleTeam)}
        </span>
        <h2 style={styles.roleName}>{role.roleName}</h2>
        {role.roleDescription && <p style={styles.roleDescription}>{role.roleDescription}</p>}
      </div>

      {!confirmed ? (
        <button style={styles.confirmButton} onClick={handleConfirm}>
          Got it — I'm Ready
        </button>
      ) : (
        <p style={styles.confirmedText}>Waiting for other players...</p>
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
    marginBottom: "24px",
  },
  waiting: {
    color: "#888",
    fontSize: "16px",
  },
  instruction: {
    color: "#ccc",
    fontSize: "16px",
    marginBottom: "8px",
    textAlign: "center" as const,
  },
  warning: {
    color: "#ff4444",
    fontSize: "14px",
    marginTop: "16px",
    marginBottom: "32px",
  },
  revealButton: {
    padding: "16px 48px",
    fontSize: "18px",
    fontWeight: "bold",
    backgroundColor: "#fff",
    color: "#111",
    border: "none",
    borderRadius: "8px",
  },
  roleCard: {
    backgroundColor: "#1a1a1a",
    border: "2px solid #333",
    borderRadius: "16px",
    padding: "32px",
    width: "100%",
    textAlign: "center" as const,
    marginBottom: "32px",
  },
  teamBadge: {
    fontSize: "12px",
    fontWeight: "bold",
    letterSpacing: "2px",
    marginBottom: "8px",
    display: "block",
  },
  roleName: {
    fontSize: "36px",
    fontWeight: "bold",
    marginTop: "8px",
    marginBottom: "16px",
  },
  roleDescription: {
    fontSize: "14px",
    color: "#aaa",
    lineHeight: "1.5",
  },
  confirmButton: {
    padding: "16px 48px",
    fontSize: "16px",
    fontWeight: "bold",
    backgroundColor: "#4ade80",
    color: "#111",
    border: "none",
    borderRadius: "8px",
    width: "100%",
  },
  confirmedText: {
    color: "#4ade80",
    fontSize: "16px",
  },
};

export default RoleReveal;
