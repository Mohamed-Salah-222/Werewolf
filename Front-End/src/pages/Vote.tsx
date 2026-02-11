import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import { API_URL } from "../config";
import { useLeaveWarning } from "../hooks/useLeaveWarning";

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
  const [hasVoted, setHasVoted] = useState(state?.hasVoted || false);
  const [votedPlayers, setVotedPlayers] = useState<Set<string>>(new Set());

  useLeaveWarning(true);

  // Fetch player list on mount
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
    if (!socket.connected) {
      socket.connect();
    }

    // Track who has voted
    socket.on("voteConfirmed", (data: { playerId: string }) => {
      setVotedPlayers((prev) => {
        const next = new Set(prev);
        next.add(data.playerId);
        return next;
      });
    });

    // Game ended — move to results
    socket.on("gameEnded", (data: { winners: string; votes: Array<{ voter: string; vote: string }>; playerRoles: Array<{ playerId: string; name: string; role: string }> }) => {
      navigate(`/results/${gameCode}`, {
        state: {
          playerName,
          playerId,
          isHost,
          winners: data.winners,
          votes: data.votes,
          playerRoles: data.playerRoles,
        },
      });
    });

    return () => {
      socket.off("voteConfirmed");
      socket.off("gameEnded");
    };
  }, [gameCode, navigate, playerName, playerId, isHost]);

  const handleVote = () => {
    if (!selected || hasVoted) return;
    setHasVoted(true);
    socket.emit("vote", {
      gameCode,
      playerId,
      votedPlayerId: selected,
    });
  };

  const others = players.filter((p) => p.id !== playerId);
  const totalPlayers = players.length;
  const totalVoted = votedPlayers.size + (hasVoted ? 1 : 0);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🗳️ Vote</h1>
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
              <span style={styles.playerName}>🐺 No Werewolf</span>
              <span style={styles.noWerewolfHint}>All werewolves are on the ground</span>
            </button>
          </div>
          <button style={!selected ? styles.buttonDisabled : styles.button} onClick={handleVote} disabled={!selected}>
            Confirm Vote
          </button>
        </>
      ) : (
        <div style={styles.waitingContainer}>
          <p style={styles.votedText}>
            You voted for <strong>{selected === "noWerewolf" ? "No Werewolf" : players.find((p) => p.id === selected)?.name}</strong>
          </p>
          <p style={styles.waitingText}>Waiting for other players to vote...</p>
          <div style={styles.voterList}>
            {players.map((p) => (
              <div key={p.id} style={styles.voterRow}>
                <span>{p.name}</span>
                <span style={votedPlayers.has(p.id) || p.id === playerId ? styles.doneTag : styles.pendingTag}>{votedPlayers.has(p.id) || p.id === playerId ? "✓" : "..."}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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
  },
  title: {
    fontSize: "32px",
    fontWeight: "bold",
    marginBottom: "8px",
  },
  subtitle: {
    color: "#888",
    fontSize: "16px",
    marginBottom: "8px",
  },
  voteCount: {
    color: "#666",
    fontSize: "14px",
    marginBottom: "24px",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%",
    marginBottom: "24px",
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    fontSize: "16px",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    border: "1px solid #333",
    borderRadius: "8px",
    textAlign: "left" as const,
  },
  selectedItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    fontSize: "16px",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    border: "2px solid #ff4444",
    borderRadius: "8px",
    textAlign: "left" as const,
  },
  playerName: {
    fontSize: "16px",
  },
  votedBadge: {
    fontSize: "11px",
    color: "#4ade80",
    fontWeight: "bold",
    letterSpacing: "1px",
  },
  button: {
    width: "100%",
    padding: "16px",
    fontSize: "16px",
    fontWeight: "bold",
    backgroundColor: "#ff4444",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
  },
  buttonDisabled: {
    width: "100%",
    padding: "16px",
    fontSize: "16px",
    fontWeight: "bold",
    backgroundColor: "#333",
    color: "#666",
    border: "none",
    borderRadius: "8px",
    cursor: "not-allowed",
  },
  waitingContainer: {
    width: "100%",
    textAlign: "center" as const,
  },
  votedText: {
    fontSize: "16px",
    color: "#fff",
    marginBottom: "16px",
  },
  waitingText: {
    color: "#888",
    fontSize: "14px",
    marginBottom: "24px",
  },
  voterList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%",
  },
  voterRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    backgroundColor: "#1a1a1a",
    borderRadius: "8px",
    border: "1px solid #2a2a2a",
  },
  doneTag: {
    color: "#4ade80",
    fontWeight: "bold",
  },
  pendingTag: {
    color: "#666",
  },
  noWerewolfItem: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-start",
    padding: "14px 16px",
    fontSize: "16px",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    border: "1px dashed #555",
    borderRadius: "8px",
    textAlign: "left" as const,
    marginTop: "8px",
    gap: "4px",
  },
  noWerewolfSelected: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "flex-start",
    padding: "14px 16px",
    fontSize: "16px",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    border: "2px solid #f0c040",
    borderRadius: "8px",
    textAlign: "left" as const,
    marginTop: "8px",
    gap: "4px",
  },
  noWerewolfHint: {
    fontSize: "12px",
    color: "#888",
  },
};

export default Vote;
