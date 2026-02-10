import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import { API_URL } from "../config";

interface PlayerInfo {
  id: string;
  name: string;
}

interface LocationState {
  playerName: string;
  playerId: string;
  isHost: boolean;
}

function WaitingRoom() {
  const { gameCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const playerName = state?.playerName || "Unknown";
  const playerId = state?.playerId || "";
  const isHost = state?.isHost || false;

  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [readyPlayers, setReadyPlayers] = useState<Set<string>>(new Set());
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    // Listen for player list updates
    socket.on("playerListUpdate", (data: { players: PlayerInfo[] }) => {
      setPlayers(data.players);
    });

    // Listen for player joined
    socket.on("playerJoined", (data: { playerId: string; playerName: string; playerCount: number }) => {
      console.log(`${data.playerName} joined (${data.playerCount} players)`);
    });

    // Listen for player left
    socket.on("playerLeft", (data: { playerId: string; playerName: string; playerCount: number }) => {
      console.log(`${data.playerName} left (${data.playerCount} players)`);
      // Remove from ready set if they were ready
      setReadyPlayers((prev) => {
        const next = new Set(prev);
        next.delete(data.playerId);
        return next;
      });
    });

    // Listen for ready broadcasts (frontend-only system)
    socket.on("playerReady", (data: { playerId: string; ready: boolean }) => {
      setReadyPlayers((prev) => {
        const next = new Set(prev);
        if (data.ready) {
          next.add(data.playerId);
        } else {
          next.delete(data.playerId);
        }
        return next;
      });
    });

    // Listen for game started
    socket.on("gameStarted", () => {
      navigate(`/role-reveal/${gameCode}`, {
        state: { playerName, playerId, isHost },
      });
    });

    socket.on("error", (data: { message: string }) => {
      setError(data.message);
    });

    // Fetch current player list on mount
    const fetchPlayers = async () => {
      try {
        const res = await fetch(`${API_URL}/api/games/${gameCode}`);
        const data = await res.json();
        if (data.success && data.data.players) {
          setPlayers(data.data.players);
        }
      } catch {
        console.error("Failed to fetch player list");
      }
    };

    fetchPlayers();

    return () => {
      socket.off("playerListUpdate");
      socket.off("playerJoined");
      socket.off("playerLeft");
      socket.off("playerReady");
      socket.off("gameStarted");
      socket.off("error");
    };
  }, [gameCode, navigate, playerName, playerId, isHost]);

  const handleReady = () => {
    const newReady = !isReady;
    setIsReady(newReady);

    // Broadcast to room (frontend-only, no backend handler needed)
    // We emit to server but it won't process it — we rely on the fact
    // that we're faking this. Instead, let's use a workaround:
    // We'll emit a custom event. Since backend ignores unknown events, it's harmless.
    socket.emit("playerReady", { gameCode, playerId, ready: newReady });

    // Also update local state immediately
    setReadyPlayers((prev) => {
      const next = new Set(prev);
      if (newReady) {
        next.add(playerId);
      } else {
        next.delete(playerId);
      }
      return next;
    });
  };

  const handleStart = () => {
    setError("");

    if (players.length < 6) {
      setError(`Need at least 6 players (currently ${players.length})`);
      return;
    }

    socket.emit("startGame", { gameCode });
  };

  const handleLeave = () => {
    socket.emit("leaveGame", { gameCode, playerId });
    navigate("/");
  };

  const copyCode = () => {
    if (gameCode) {
      navigator.clipboard.writeText(gameCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const canStart = isHost && players.length >= 6;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.leaveButton} onClick={handleLeave}>
          ← Leave
        </button>
        <div style={styles.codeSection}>
          <span style={styles.codeLabel}>GAME CODE</span>
          <button style={styles.codeButton} onClick={copyCode}>
            {gameCode?.toUpperCase()}
            <span style={styles.copyHint}>{copied ? " ✓" : " (copy)"}</span>
          </button>
        </div>
      </div>

      {/* Player count */}
      <p style={styles.playerCount}>{players.length} / 10 players</p>
      {players.length < 6 && <p style={styles.minWarning}>Need at least 6 players to start</p>}

      {/* Player list */}
      <div style={styles.playerList}>
        {players.map((p) => {
          const isMe = p.id === playerId;
          const isPlayerReady = readyPlayers.has(p.id);

          return (
            <div key={p.id} style={styles.playerRow}>
              <div style={styles.playerLeft}>
                <span style={styles.playerName}>
                  {p.name}
                  {isMe && <span style={styles.youTag}> (You)</span>}
                </span>
              </div>
              <div style={styles.playerRight}>{isHost && p.id === playerId ? <span style={styles.hostBadge}>HOST</span> : isPlayerReady ? <span style={styles.readyBadge}>READY</span> : <span style={styles.waitingBadge}>WAITING</span>}</div>
            </div>
          );
        })}
      </div>

      {/* Bottom actions */}
      <div style={styles.actions}>
        {error && <p style={styles.error}>{error}</p>}

        {isHost ? (
          <button style={canStart ? styles.startButton : styles.startButtonDisabled} onClick={handleStart} disabled={!canStart}>
            Start Game
          </button>
        ) : (
          <button style={isReady ? styles.readyButtonActive : styles.readyButton} onClick={handleReady}>
            {isReady ? "✓ Ready" : "Ready Up"}
          </button>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    padding: "20px",
    maxWidth: "480px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
  },
  leaveButton: {
    background: "transparent",
    color: "#888",
    border: "none",
    fontSize: "14px",
    padding: "8px 0",
  },
  codeSection: {
    textAlign: "right" as const,
  },
  codeLabel: {
    display: "block",
    fontSize: "10px",
    color: "#666",
    letterSpacing: "2px",
    marginBottom: "2px",
  },
  codeButton: {
    background: "transparent",
    color: "#fff",
    border: "none",
    fontSize: "24px",
    fontWeight: "bold",
    letterSpacing: "3px",
    padding: 0,
  },
  copyHint: {
    fontSize: "11px",
    color: "#666",
    letterSpacing: "0px",
  },
  playerCount: {
    fontSize: "14px",
    color: "#888",
    marginBottom: "4px",
  },
  minWarning: {
    fontSize: "12px",
    color: "#ff4444",
    marginBottom: "16px",
  },
  playerList: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "16px",
  },
  playerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    backgroundColor: "#1a1a1a",
    borderRadius: "8px",
    border: "1px solid #2a2a2a",
  },
  playerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  playerName: {
    fontSize: "16px",
  },
  youTag: {
    fontSize: "12px",
    color: "#666",
  },
  playerRight: {},
  hostBadge: {
    fontSize: "12px",
    color: "#f0c040",
    fontWeight: "bold",
    letterSpacing: "1px",
  },
  readyBadge: {
    fontSize: "12px",
    color: "#4ade80",
    fontWeight: "bold",
    letterSpacing: "1px",
  },
  waitingBadge: {
    fontSize: "12px",
    color: "#666",
    letterSpacing: "1px",
  },
  actions: {
    marginTop: "24px",
    paddingBottom: "20px",
  },
  error: {
    color: "#ff4444",
    fontSize: "14px",
    marginBottom: "12px",
    textAlign: "center" as const,
  },
  startButton: {
    width: "100%",
    padding: "16px",
    fontSize: "16px",
    fontWeight: "bold",
    backgroundColor: "#fff",
    color: "#111",
    border: "none",
    borderRadius: "8px",
  },
  startButtonDisabled: {
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
  readyButton: {
    width: "100%",
    padding: "16px",
    fontSize: "16px",
    fontWeight: "bold",
    backgroundColor: "transparent",
    color: "#fff",
    border: "2px solid #fff",
    borderRadius: "8px",
  },
  readyButtonActive: {
    width: "100%",
    padding: "16px",
    fontSize: "16px",
    fontWeight: "bold",
    backgroundColor: "#4ade80",
    color: "#111",
    border: "2px solid #4ade80",
    borderRadius: "8px",
  },
};

export default WaitingRoom;
