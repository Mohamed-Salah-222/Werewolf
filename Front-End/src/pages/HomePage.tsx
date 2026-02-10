import { useState } from "react";
import socket from "../socket";
import { useNavigate } from "react-router-dom";

import { API_URL } from "../config";

function HomePage() {
  const navigate = useNavigate();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const [playerName, setPlayerName] = useState("");
  const [gameCode, setGameCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateGame = async () => {
    if (playerName.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/games/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (!data.success) {
        setError("Failed to create game");
        setLoading(false);
        return;
      }

      const code = data.data.code;

      if (!socket.connected) {
        socket.connect();
      }

      socket.emit("joinGame", { gameCode: code, playerName: playerName.trim() }, (response: { success: boolean; playerName?: string; playerId?: string; error?: string }) => {
        setLoading(false);
        if (response.success) {
          setShowCreateModal(false);
          navigate(`/waiting/${code}`, {
            state: {
              playerName: response.playerName,
              playerId: response.playerId,
              isHost: true,
            },
          });
        } else {
          setError(response.error || "Failed to join game");
        }
      });
    } catch {
      setError("Could not connect to server");
    }
  };

  const handleJoinGame = () => {
    if (playerName.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    if (gameCode.trim().length !== 6) {
      setError("Game code must be 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("joinGame", { gameCode: gameCode.trim().toLowerCase(), playerName: playerName.trim() }, (response: { success: boolean; playerName?: string; playerId?: string; error?: string }) => {
      setLoading(false);
      if (response.success) {
        setShowJoinModal(false);
        navigate(`/waiting/${gameCode.trim().toLowerCase()}`, {
          state: {
            playerName: response.playerName,
            playerId: response.playerId,
            isHost: false,
          },
        });
      } else {
        setError(response.error || "Failed to join game");
      }
    });
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowJoinModal(false);
    setError("");
    setPlayerName("");
    setGameCode("");
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>WEREWOLF</h1>
      <p style={styles.subtitle}>One Night Ultimate</p>

      <div style={styles.buttonGroup}>
        <button
          style={styles.button}
          onClick={() => {
            closeModals();
            setShowCreateModal(true);
          }}
        >
          Create Game
        </button>
        <button
          style={styles.button}
          onClick={() => {
            closeModals();
            setShowJoinModal(true);
          }}
        >
          Join Game
        </button>
        <button style={styles.buttonDisabled} disabled>
          Characters (Coming Soon)
        </button>
        <button style={styles.buttonDisabled} disabled>
          How to Play (Coming Soon)
        </button>
      </div>

      {showCreateModal && (
        <div style={styles.overlay} onClick={closeModals}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Create Game</h2>
            <input style={styles.input} type="text" placeholder="Enter your name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={20} onKeyDown={(e) => e.key === "Enter" && handleCreateGame()} />
            {error && <p style={styles.error}>{error}</p>}
            <div style={styles.modalButtons}>
              <button style={styles.cancelButton} onClick={closeModals}>
                Cancel
              </button>
              <button style={styles.confirmButton} onClick={handleCreateGame} disabled={loading}>
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div style={styles.overlay} onClick={closeModals}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Join Game</h2>
            <input style={styles.input} type="text" placeholder="Game Code" value={gameCode} onChange={(e) => setGameCode(e.target.value)} maxLength={6} />
            <input style={styles.input} type="text" placeholder="Enter your name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={20} onKeyDown={(e) => e.key === "Enter" && handleJoinGame()} />
            {error && <p style={styles.error}>{error}</p>}
            <div style={styles.modalButtons}>
              <button style={styles.cancelButton} onClick={closeModals}>
                Cancel
              </button>
              <button style={styles.confirmButton} onClick={handleJoinGame} disabled={loading}>
                {loading ? "Joining..." : "Join"}
              </button>
            </div>
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
    justifyContent: "center",
    minHeight: "100vh",
    padding: "20px",
  },
  title: {
    fontSize: "48px",
    fontWeight: "bold",
    letterSpacing: "4px",
    marginBottom: "4px",
  },
  subtitle: {
    fontSize: "16px",
    color: "#888",
    marginBottom: "60px",
  },
  buttonGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "280px",
  },
  button: {
    padding: "14px 24px",
    fontSize: "16px",
    backgroundColor: "#fff",
    color: "#111",
    border: "2px solid #fff",
    borderRadius: "6px",
    fontWeight: "600",
  },
  buttonDisabled: {
    padding: "14px 24px",
    fontSize: "16px",
    backgroundColor: "transparent",
    color: "#555",
    border: "2px solid #333",
    borderRadius: "6px",
    fontWeight: "600",
    cursor: "not-allowed",
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "12px",
    padding: "32px",
    width: "340px",
  },
  modalTitle: {
    fontSize: "22px",
    marginBottom: "24px",
    textAlign: "center" as const,
  },
  input: {
    width: "100%",
    padding: "12px",
    fontSize: "16px",
    backgroundColor: "#222",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: "6px",
    marginBottom: "12px",
  },
  error: {
    color: "#ff4444",
    fontSize: "14px",
    marginBottom: "12px",
  },
  modalButtons: {
    display: "flex",
    gap: "12px",
    marginTop: "8px",
  },
  cancelButton: {
    flex: 1,
    padding: "12px",
    fontSize: "14px",
    backgroundColor: "transparent",
    color: "#888",
    border: "1px solid #444",
    borderRadius: "6px",
  },
  confirmButton: {
    flex: 1,
    padding: "12px",
    fontSize: "14px",
    backgroundColor: "#fff",
    color: "#111",
    border: "none",
    borderRadius: "6px",
    fontWeight: "600",
  },
};

export default HomePage;
