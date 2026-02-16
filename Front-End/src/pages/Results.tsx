import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import { clearSession, saveSession } from "../utils/gameSession";
import "./Results.css";

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
    if (!socket.connected) socket.connect();

    socket.on("gameRestarted", () => {
      saveSession({
        gameCode: gameCode || "",
        playerId: state?.playerId || "",
        playerName: state?.playerName || "",
        isHost: state?.isHost || false,
      });
      navigate(`/waiting/${gameCode}`, {
        state: { playerName: state?.playerName, playerId: state?.playerId, isHost: state?.isHost },
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

  const voteCounts = new Map<string, number>();
  votes.forEach((v) => {
    voteCounts.set(v.vote, (voteCounts.get(v.vote) || 0) + 1);
  });

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
        return "Werewolves Win";
      case "villagers":
        return "Village Wins";
      case "joker":
        return "Joker Wins";
      default:
        return winners;
    }
  };

  const winnerColor = () => {
    switch (winners) {
      case "werewolves":
        return "#c41e1e";
      case "villagers":
        return "#2a8a4a";
      case "joker":
        return "#d4a017";
      default:
        return "#c9a84c";
    }
  };

  const getPlayerName = (id: string) => {
    if (id === "noWerewolf") return "No Werewolf";
    const p = playerRoles.find((pr) => pr.playerId === id);
    return p?.name || id;
  };

  const roleColor = (role: string) => {
    const team = getTeam(role);
    if (team === "werewolves") return "#c41e1e";
    if (team === "joker") return "#d4a017";
    return "#2a8a4a";
  };

  return (
    <div style={styles.page}>
      <div style={styles.vignette} />
      <div style={styles.content} className="res-content">
        {/* Winner banner */}
        <div style={{ ...styles.banner, borderColor: winnerColor() }}>
          <h1 style={{ ...styles.winnerText, color: winnerColor() }}>{winnerLabel()}</h1>
          <p style={styles.personalResult}>{didIWin() ? "You won!" : "You lost."}</p>
        </div>

        {/* Eliminated */}
        {isNoWerewolfVote ? (
          <div style={styles.eliminatedSection}>
            <p style={styles.eliminatedLabel}>VILLAGE DECISION</p>
            <p style={styles.eliminatedName}>No Werewolf</p>
            <p style={{ ...styles.eliminatedRole, color: "#d4a017" }}>The village believes all werewolves are on the ground</p>
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

        {/* All roles */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>ALL ROLES</h2>
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
            <span>{showVotes ? "HIDE" : "SHOW"} VOTE DETAILS</span>
            <span style={styles.toggleArrow}>{showVotes ? "▲" : "▼"}</span>
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

        {/* Actions */}
        <div style={styles.actionButtons}>
          {isHost && (
            <button style={styles.restartButton} onClick={handleRestart} disabled={restarting}>
              {restarting ? "RESTARTING..." : "PLAY AGAIN"}
            </button>
          )}
          <button
            style={styles.homeButton}
            onClick={() => {
              clearSession();
              navigate("/");
            }}
          >
            BACK TO HOME
          </button>
        </div>
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
    alignItems: "flex-start",
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
    padding: "32px 20px 40px",
  },
  banner: {
    width: "100%",
    textAlign: "center" as const,
    padding: "28px 20px",
    borderRadius: "4px",
    border: "2px solid #2a2019",
    backgroundColor: "rgba(201,168,76,0.03)",
    marginBottom: "24px",
  },
  winnerText: {
    fontSize: "32px",
    fontWeight: 400,
    letterSpacing: "6px",
    marginBottom: "8px",
    fontFamily: "'Creepster', cursive",
    textShadow: "0 0 20px currentColor",
  },
  personalResult: {
    fontSize: "16px",
    color: "#9a8a70",
    fontStyle: "italic",
  },
  eliminatedSection: {
    width: "100%",
    textAlign: "center" as const,
    padding: "20px",
    backgroundColor: "rgba(201,168,76,0.03)",
    borderRadius: "4px",
    border: "1px solid #2a2019",
    marginBottom: "24px",
  },
  eliminatedLabel: {
    fontSize: "10px",
    color: "#5a4a30",
    letterSpacing: "3px",
    marginBottom: "6px",
    fontFamily: "'Creepster', cursive",
  },
  eliminatedName: {
    fontSize: "24px",
    fontWeight: 400,
    marginBottom: "4px",
    fontFamily: "'Creepster', cursive",
    letterSpacing: "3px",
    color: "#e8dcc8",
  },
  eliminatedRole: {
    fontSize: "14px",
    marginBottom: "6px",
    fontFamily: "'Creepster', cursive",
    letterSpacing: "2px",
  },
  eliminatedVotes: {
    fontSize: "12px",
    color: "#5a4a30",
  },
  section: {
    width: "100%",
    marginBottom: "20px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 400,
    letterSpacing: "4px",
    marginBottom: "12px",
    fontFamily: "'Creepster', cursive",
    color: "#c9a84c",
  },
  roleList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  roleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    backgroundColor: "rgba(201,168,76,0.03)",
    borderRadius: "4px",
    border: "1px solid #1a1510",
  },
  roleName: {
    fontSize: "14px",
    color: "#9a8a70",
  },
  youTag: {
    fontSize: "11px",
    color: "#5a4a30",
  },
  roleValue: {
    fontSize: "13px",
    fontWeight: 400,
    fontFamily: "'Creepster', cursive",
    letterSpacing: "1px",
  },
  toggleButton: {
    width: "100%",
    padding: "12px 14px",
    fontSize: "12px",
    backgroundColor: "transparent",
    color: "#6b5a3a",
    border: "1px solid #2a2019",
    borderRadius: "4px",
    marginBottom: "10px",
    cursor: "pointer",
    fontFamily: "'Creepster', cursive",
    letterSpacing: "2px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleArrow: {
    fontSize: "10px",
    color: "#5a4a30",
  },
  voteList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  voteRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 14px",
    backgroundColor: "rgba(201,168,76,0.03)",
    borderRadius: "4px",
    border: "1px solid #1a1510",
    fontSize: "13px",
  },
  voterName: {
    color: "#9a8a70",
    flex: 1,
  },
  arrow: {
    color: "#3d2e1a",
  },
  votedName: {
    color: "#c9b896",
    fontWeight: 400,
    flex: 1,
    textAlign: "right" as const,
  },
  actionButtons: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
    width: "100%",
    marginTop: "8px",
  },
  restartButton: {
    width: "100%",
    padding: "14px",
    fontSize: "14px",
    fontWeight: 400,
    letterSpacing: "3px",
    backgroundColor: "#c9a84c",
    color: "#0a0a0a",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "'Creepster', cursive",
  },
  homeButton: {
    width: "100%",
    padding: "14px",
    fontSize: "13px",
    fontWeight: 400,
    letterSpacing: "3px",
    backgroundColor: "transparent",
    color: "#6b5a3a",
    border: "1px solid #2a2019",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "'Creepster', cursive",
  },
};

export default Results;
