import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import { clearSession } from "../utils/gameSession";

interface LocationState {
  playerName: string;
  playerId: string;
  isHost: boolean;
  winners: string;
  votes: Array<{ voter: string; vote: string }>;
  playerRoles: Array<{ playerId: string; name: string; role: string }>;
}

function Results() {
  const { gameCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const playerId = state?.playerId || "";
  const isHost = state?.isHost || false;
  const winners = state?.winners || "";
  const votes = state?.votes || [];
  const playerRoles = state?.playerRoles || [];

  const [showVotes, setShowVotes] = useState(false);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    clearSession();
  }, []);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.on("gameRestarted", () => {
      navigate(`/waiting/${gameCode}`, {
        state: {
          playerName: state?.playerName,
          playerId: state?.playerId,
          isHost: state?.isHost,
        },
      });
    });

    return () => {
      socket.off("gameRestarted");
    };
  }, [gameCode, navigate, state]);

  const handleRestart = () => {
    setRestarting(true);
    socket.emit("restartGame", { gameCode });
  };

  // Count votes per player
  const voteCounts = new Map<string, number>();
  votes.forEach((v) => {
    voteCounts.set(v.vote, (voteCounts.get(v.vote) || 0) + 1);
  });

  // Find most voted
  let mostVotedId = "";
  let maxVotes = 0;
  voteCounts.forEach((count, id) => {
    if (count > maxVotes) {
      maxVotes = count;
      mostVotedId = id;
    }
  });

  const isNoWerewolfVote = mostVotedId === "noWerewolf";
  const mostVotedPlayer = isNoWerewolfVote ? null : playerRoles.find((p) => p.playerId === mostVotedId);
  const myRole = playerRoles.find((p) => p.playerId === playerId);

  const didIWin = () => {
    if (!myRole) return false;
    const myTeam = getTeam(myRole.role);
    if (winners === "joker" && myRole.role.toLowerCase() === "joker") return true;
    if (winners === "werewolves" && myTeam === "werewolves") return true;
    if (winners === "villagers" && myTeam === "villagers") return true;
    return false;
  };

  const getTeam = (role: string): string => {
    const villains = ["werewolf", "minion"];
    if (villains.includes(role.toLowerCase())) return "werewolves";
    if (role.toLowerCase() === "joker") return "joker";
    return "villagers";
  };

  const winnerLabel = () => {
    switch (winners) {
      case "werewolves":
        return "🐺 Werewolves Win!";
      case "villagers":
        return "🏘️ Village Wins!";
      case "joker":
        return "🃏 Joker Wins!";
      default:
        return winners;
    }
  };

  const winnerColor = () => {
    switch (winners) {
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

  const getPlayerName = (id: string) => {
    if (id === "noWerewolf") return "No Werewolf";
    const p = playerRoles.find((pr) => pr.playerId === id);
    return p?.name || id;
  };

  const roleColor = (role: string) => {
    const team = getTeam(role);
    if (team === "werewolves") return "#ff4444";
    if (team === "joker") return "#f0c040";
    return "#4ade80";
  };

  return (
    <div style={styles.container}>
      {/* Winner banner */}
      <div style={{ ...styles.banner, borderColor: winnerColor() }}>
        <h1 style={{ ...styles.winnerText, color: winnerColor() }}>{winnerLabel()}</h1>
        <p style={styles.personalResult}>{didIWin() ? "You won! 🎉" : "You lost 💀"}</p>
      </div>

      {/* Eliminated player */}
      {isNoWerewolfVote ? (
        <div style={styles.eliminatedSection}>
          <p style={styles.eliminatedLabel}>VILLAGE DECISION</p>
          <p style={styles.eliminatedName}>🐺 No Werewolf</p>
          <p style={{ ...styles.eliminatedRole, color: "#f0c040" }}>The village believes all werewolves are on the ground</p>
          <p style={styles.eliminatedVotes}>
            {maxVotes} vote{maxVotes !== 1 ? "s" : ""}
          </p>
        </div>
      ) : (
        mostVotedPlayer && (
          <div style={styles.eliminatedSection}>
            <p style={styles.eliminatedLabel}>ELIMINATED</p>
            <p style={styles.eliminatedName}>{mostVotedPlayer.name}</p>
            <p style={{ ...styles.eliminatedRole, color: roleColor(mostVotedPlayer.role) }}>{mostVotedPlayer.role}</p>
            <p style={styles.eliminatedVotes}>
              {maxVotes} vote{maxVotes !== 1 ? "s" : ""}
            </p>
          </div>
        )
      )}

      {/* All roles revealed */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>All Roles</h2>
        <div style={styles.roleList}>
          {playerRoles.map((p) => (
            <div key={p.playerId} style={styles.roleRow}>
              <span style={styles.roleName}>
                {p.name}
                {p.playerId === playerId && <span style={styles.youTag}> (You)</span>}
              </span>
              <span style={{ ...styles.roleValue, color: roleColor(p.role) }}>{p.role}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Vote breakdown */}
      <div style={styles.section}>
        <button style={styles.toggleButton} onClick={() => setShowVotes(!showVotes)}>
          {showVotes ? "Hide Vote Details" : "Show Vote Details"}
        </button>

        {showVotes && (
          <div style={styles.voteList}>
            {votes.map((v, i) => (
              <div key={i} style={styles.voteRow}>
                <span style={styles.voterName}>{getPlayerName(v.voter)}</span>
                <span style={styles.arrow}>→</span>
                <span style={styles.votedName}>{getPlayerName(v.vote)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={styles.actionButtons}>
        {isHost && (
          <button style={styles.restartButton} onClick={handleRestart} disabled={restarting}>
            {restarting ? "Restarting..." : "🔄 Play Again"}
          </button>
        )}
        <button style={styles.homeButton} onClick={() => navigate("/")}>
          Back to Home
        </button>
      </div>
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
    paddingBottom: "40px",
  },
  banner: {
    width: "100%",
    textAlign: "center" as const,
    padding: "32px 20px",
    borderRadius: "16px",
    border: "2px solid #333",
    backgroundColor: "#1a1a1a",
    marginBottom: "24px",
  },
  winnerText: {
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "8px",
  },
  personalResult: {
    fontSize: "18px",
    color: "#ccc",
  },
  eliminatedSection: {
    width: "100%",
    textAlign: "center" as const,
    padding: "20px",
    backgroundColor: "#1a1a1a",
    borderRadius: "12px",
    border: "1px solid #333",
    marginBottom: "24px",
  },
  eliminatedLabel: {
    fontSize: "11px",
    color: "#666",
    letterSpacing: "2px",
    marginBottom: "4px",
  },
  eliminatedName: {
    fontSize: "22px",
    fontWeight: "bold",
    marginBottom: "4px",
  },
  eliminatedRole: {
    fontSize: "14px",
    marginBottom: "4px",
  },
  eliminatedVotes: {
    fontSize: "13px",
    color: "#888",
  },
  section: {
    width: "100%",
    marginBottom: "24px",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "12px",
  },
  roleList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  roleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: "#1a1a1a",
    borderRadius: "8px",
    border: "1px solid #2a2a2a",
  },
  roleName: {
    fontSize: "15px",
  },
  youTag: {
    fontSize: "12px",
    color: "#666",
  },
  roleValue: {
    fontSize: "14px",
    fontWeight: "bold",
  },
  toggleButton: {
    width: "100%",
    padding: "12px",
    fontSize: "14px",
    backgroundColor: "transparent",
    color: "#888",
    border: "1px solid #333",
    borderRadius: "8px",
    marginBottom: "12px",
  },
  voteList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  voteRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    backgroundColor: "#1a1a1a",
    borderRadius: "8px",
    border: "1px solid #2a2a2a",
    fontSize: "14px",
  },
  voterName: {
    color: "#ccc",
    flex: 1,
  },
  arrow: {
    color: "#555",
  },
  votedName: {
    color: "#fff",
    fontWeight: "bold",
    flex: 1,
    textAlign: "right" as const,
  },
  actionButtons: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "100%",
    marginTop: "8px",
  },
  restartButton: {
    width: "100%",
    padding: "16px",
    fontSize: "16px",
    fontWeight: "bold",
    backgroundColor: "#fff",
    color: "#111",
    border: "none",
    borderRadius: "8px",
  },
  homeButton: {
    width: "100%",
    padding: "16px",
    fontSize: "16px",
    fontWeight: "bold",
    backgroundColor: "transparent",
    color: "#888",
    border: "1px solid #444",
    borderRadius: "8px",
  },
};

export default Results;
