import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import { API_URL } from "../config";
import { useLeaveWarning } from "../hooks/useLeaveWarning";
import "./Vote.css";

interface LocationState {
  playerName: string;
  playerId: string;
  isHost: boolean;
  hasVoted?: boolean;
}

interface PlayerInfo {
  id: string;
  name: string;
}

function Vote() {
  const { gameCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const playerName = state?.playerName || "Unknown";
  const playerId = state?.playerId || "";
  const isHost = state?.isHost || false;

  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [votedLocally, setVotedLocally] = useState(false);
  const hasVoted = votedLocally || state?.hasVoted || false;
  const [votedPlayers, setVotedPlayers] = useState<Set<string>>(new Set());

  useLeaveWarning(true);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await fetch(`${API_URL}/api/games/${gameCode}`);
        const data = await res.json();
        if (data.success && data.data.players) {
          setPlayers(data.data.players);
        }
      } catch {
        console.error("Failed to fetch players");
      }
    };
    fetchPlayers();
  }, [gameCode]);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.on("voteConfirmed", (data: { playerId: string }) => {
      setVotedPlayers((prev) => {
        const next = new Set(prev);
        next.add(data.playerId);
        return next;
      });
    });

    socket.on("gameEnded", (data: { winners: string; votes: Array<{ voter: string; vote: string }>; playerRoles: Array<{ playerId: string; name: string; role: string }> }) => {
      navigate(`/results/${gameCode}`, {
        state: { playerName, playerId, isHost, winners: data.winners, votes: data.votes, playerRoles: data.playerRoles },
      });
    });

    return () => {
      socket.off("voteConfirmed");
      socket.off("gameEnded");
    };
  }, [gameCode, navigate, playerName, playerId, isHost]);

  const handleVote = () => {
    if (!selected || hasVoted) return;
    setVotedLocally(true);
    socket.emit("vote", { gameCode, playerId, votedPlayerId: selected });
  };

  const others = players.filter((p) => p.id !== playerId);
  const totalPlayers = players.length;
  const totalVoted = votedPlayers.size + (hasVoted ? 1 : 0);

  return (
    <div style={styles.page}>
      <div style={styles.vignette} />
      <div style={styles.content} className="vote-content">
        <h1 style={styles.title}>THE VOTE</h1>
        <p style={styles.subtitle}>Who do you think is the Werewolf?</p>
        <p style={styles.voteCount}>
          {totalVoted} / {totalPlayers} voted
        </p>

        {!hasVoted ? (
          <>
            <div style={styles.list}>
              {others.map((p) => (
                <button key={p.id} style={selected === p.id ? styles.selectedItem : styles.item} onClick={() => setSelected(p.id)}>
                  <span style={styles.playerName}>{p.name}</span>
                  {votedPlayers.has(p.id) && <span style={styles.votedBadge}>VOTED</span>}
                </button>
              ))}
              <button style={selected === "noWerewolf" ? styles.noWerewolfSelected : styles.noWerewolfItem} onClick={() => setSelected("noWerewolf")}>
                <span style={styles.playerName}>No Werewolf</span>
                <span style={styles.noWerewolfHint}>All werewolves are on the ground</span>
              </button>
            </div>
            <button style={!selected ? styles.buttonDisabled : styles.button} onClick={handleVote} disabled={!selected}>
              CONFIRM VOTE
            </button>
          </>
        ) : (
          <div style={styles.waitingContainer}>
            {selected ? (
              <p style={styles.votedText}>
                You voted for <strong style={styles.votedStrong}>{selected === "noWerewolf" ? "No Werewolf" : players.find((p) => p.id === selected)?.name}</strong>
              </p>
            ) : (
              <p style={styles.votedText}>Your vote has been cast</p>
            )}
            <p style={styles.waitingText}>Waiting for other players...</p>
            <div style={styles.voterList}>
              {players.map((p) => (
                <div key={p.id} style={styles.voterRow}>
                  <span style={styles.voterName}>{p.name}</span>
                  <span style={votedPlayers.has(p.id) || p.id === playerId ? styles.doneTag : styles.pendingTag}>{votedPlayers.has(p.id) || p.id === playerId ? "✓" : "..."}</span>
                </div>
              ))}
            </div>
          </div>
        )}
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
  title: {
    fontSize: "36px",
    fontWeight: 400,
    letterSpacing: "8px",
    margin: "0 0 8px 0",
    fontFamily: "'Creepster', cursive",
    color: "#c9a84c",
    textShadow: "0 0 30px rgba(201,168,76,0.2)",
  },
  subtitle: {
    fontSize: "14px",
    color: "#5a4a30",
    marginBottom: "4px",
    fontStyle: "italic",
  },
  voteCount: {
    fontSize: "12px",
    color: "#5a4a30",
    letterSpacing: "2px",
    marginBottom: "24px",
    fontFamily: "'Creepster', cursive",
  },
  list: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    width: "100%",
    marginBottom: "24px",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    fontSize: "15px",
    backgroundColor: "rgba(201,168,76,0.03)",
    color: "#c9b896",
    border: "1px solid #2a2019",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "'Trade Winds', cursive",
  },
  selectedItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    fontSize: "15px",
    backgroundColor: "rgba(196,30,30,0.08)",
    color: "#e8dcc8",
    border: "2px solid #c41e1e",
    borderRadius: "4px",
    cursor: "pointer",
    boxShadow: "0 0 15px rgba(196,30,30,0.2)",
    fontFamily: "'Trade Winds', cursive",
  },
  playerName: {
    fontSize: "15px",
  },
  votedBadge: {
    fontSize: "10px",
    color: "#2a8a4a",
    fontWeight: 400,
    letterSpacing: "2px",
    fontFamily: "'Creepster', cursive",
  },
  noWerewolfItem: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-start",
    padding: "14px 16px",
    fontSize: "15px",
    backgroundColor: "rgba(201,168,76,0.03)",
    color: "#c9b896",
    border: "1px dashed #3d2e1a",
    borderRadius: "4px",
    cursor: "pointer",
    marginTop: "4px",
    gap: "4px",
    fontFamily: "'Trade Winds', cursive",
  },
  noWerewolfSelected: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-start",
    padding: "14px 16px",
    fontSize: "15px",
    backgroundColor: "rgba(212,160,23,0.08)",
    color: "#e8dcc8",
    border: "2px solid #d4a017",
    borderRadius: "4px",
    cursor: "pointer",
    marginTop: "4px",
    gap: "4px",
    boxShadow: "0 0 15px rgba(212,160,23,0.2)",
    fontFamily: "'Trade Winds', cursive",
  },
  noWerewolfHint: {
    fontSize: "11px",
    color: "#5a4a30",
  },
  button: {
    width: "100%",
    padding: "14px",
    fontSize: "14px",
    fontWeight: 400,
    letterSpacing: "3px",
    backgroundColor: "#c41e1e",
    color: "#e8dcc8",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "'Creepster', cursive",
    transition: "all 0.3s ease",
  },
  buttonDisabled: {
    width: "100%",
    padding: "14px",
    fontSize: "14px",
    fontWeight: 400,
    letterSpacing: "3px",
    backgroundColor: "transparent",
    color: "#3d2e1a",
    border: "1px solid #1a1510",
    borderRadius: "4px",
    cursor: "not-allowed",
    fontFamily: "'Creepster', cursive",
  },
  waitingContainer: {
    width: "100%",
    textAlign: "center" as const,
  },
  votedText: {
    fontSize: "15px",
    color: "#9a8a70",
    marginBottom: "8px",
  },
  votedStrong: {
    color: "#c9a84c",
    fontFamily: "'Creepster', cursive",
  },
  waitingText: {
    color: "#5a4a30",
    fontSize: "13px",
    fontStyle: "italic",
    marginBottom: "24px",
  },
  voterList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
    width: "100%",
  },
  voterRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    backgroundColor: "rgba(201,168,76,0.03)",
    borderRadius: "4px",
    border: "1px solid #1a1510",
  },
  voterName: {
    fontSize: "14px",
    color: "#9a8a70",
  },
  doneTag: {
    color: "#2a8a4a",
    fontFamily: "'Creepster', cursive",
    letterSpacing: "1px",
  },
  pendingTag: {
    color: "#3d2e1a",
  },
};

export default Vote;
