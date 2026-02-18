import { useState, useCallback } from "react";
import socket from "../socket";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import { useGame } from "../hooks/useGame";
import { characters, type CharacterData } from "../characters";
import "./HomePage.css";

// ===== HELPERS =====

type JoinResponse = {
  success: boolean;
  playerName?: string;
  playerId?: string;
  error?: string;
};

function teamColor(team: string): string {
  if (team === "villain") return "var(--color-villain)";
  if (team === "neutral") return "var(--color-neutral)";
  return "var(--color-village)";
}

function teamLabel(team: string): string {
  if (team === "villain") return "WEREWOLF TEAM";
  if (team === "neutral") return "NEUTRAL";
  return "VILLAGE TEAM";
}

/**
 * Connects the socket (if needed) and emits a joinGame event.
 * Returns a promise that resolves with the server's response.
 */
function emitJoinGame(gameCode: string, playerName: string): Promise<JoinResponse> {
  if (!socket.connected) socket.connect();
  return new Promise((resolve) => {
    socket.emit("joinGame", { gameCode, playerName }, (response: JoinResponse) => resolve(response));
  });
}

// ===== COMPONENT =====

function HomePage() {
  const navigate = useNavigate();
  const { setSession } = useGame();

  const [selectedChar, setSelectedChar] = useState<CharacterData>(characters[0]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const [playerName, setPlayerName] = useState("");
  const [gameCode, setGameCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const closeModals = useCallback(() => {
    setShowCreateModal(false);
    setShowJoinModal(false);
    setError("");
    setPlayerName("");
    setGameCode("");
  }, []);

  const handleCreateGame = useCallback(async () => {
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
      const response = await emitJoinGame(code, playerName.trim());
      setLoading(false);
      if (response.success) {
        setSession({
          gameCode: code,
          playerId: response.playerId || "",
          playerName: response.playerName || "",
          isHost: true,
        });
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
    } catch {
      setError("Could not connect to server");
      setLoading(false);
    }
  }, [playerName, navigate, setSession]);

  const handleJoinGame = useCallback(async () => {
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
    const code = gameCode.trim().toLowerCase();
    const name = playerName.trim();
    const response = await emitJoinGame(code, name);
    setLoading(false);
    if (response.success) {
      setSession({
        gameCode: code,
        playerId: response.playerId || "",
        playerName: response.playerName || "",
        isHost: false,
      });
      setShowJoinModal(false);
      navigate(`/waiting/${code}`, {
        state: {
          playerName: response.playerName,
          playerId: response.playerId,
          isHost: false,
        },
      });
    } else {
      setError(response.error || "Failed to join game");
    }
  }, [playerName, gameCode, navigate, setSession]);

  return (
    <div className="home-page">
      <div className="home-vignette" />

      {/* ===== TOP: TITLE + BUTTONS ===== */}
      <div className="home-topbar">
        <h1 className="home-title">WEREWOLF</h1>
        <div className="home-button-row">
          <button
            className="action-btn"
            onClick={() => {
              closeModals();
              setShowCreateModal(true);
            }}
          >
            CREATE GAME
          </button>
          <button
            className="action-btn"
            onClick={() => {
              closeModals();
              setShowJoinModal(true);
            }}
          >
            JOIN GAME
          </button>
        </div>
      </div>

      {/* ===== MIDDLE: CHARACTER SHOWCASE ===== */}
      <div className="home-showcase">
        <div className="home-char-display">
          {selectedChar.fullBody ? (
            <img src={selectedChar.fullBody} alt={selectedChar.name} className="home-fullbody-img" key={selectedChar.id} />
          ) : (
            <div className="home-placeholder-body">
              <span className="home-placeholder-icon">?</span>
              <span className="home-placeholder-text">COMING SOON</span>
            </div>
          )}
        </div>

        <div className="home-info-panel">
          <div className={`home-team-badge home-team-badge--${selectedChar.team}`}>{teamLabel(selectedChar.team)}</div>
          <h2 className="home-char-name">{selectedChar.name.toUpperCase()}</h2>
          <p className="home-char-title">{selectedChar.title}</p>
          <div className="home-divider" />
          <p className="home-char-desc">{selectedChar.description}</p>
          <div className="home-ability-box">
            <span className="home-ability-label">ABILITY</span>
            <p className="home-ability-text">{selectedChar.ability}</p>
          </div>
        </div>
      </div>

      {/* ===== BOTTOM: CHARACTER SELECT GRID ===== */}
      <div className="home-selectbar">
        <div className="home-select-grid">
          {characters.map((char) => {
            const isActive = selectedChar.id === char.id;
            const color = teamColor(char.team);
            return (
              <button
                key={char.id}
                className={`home-grid-slot ${isActive ? "home-grid-slot--active" : ""}`}
                style={
                  isActive
                    ? {
                        borderColor: color,
                        boxShadow: `0 0 20px ${color}60, inset 0 0 15px ${color}20`,
                      }
                    : undefined
                }
                onClick={() => setSelectedChar(char)}
              >
                {char.square ? (
                  <img src={char.square} alt={char.name} className="home-grid-img" />
                ) : (
                  <div className="home-grid-placeholder">
                    <span className="home-grid-placeholder-text">{char.name.charAt(0)}</span>
                  </div>
                )}
                <span className="home-grid-label" style={{ color: isActive ? color : "#666" }}>
                  {char.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== CREATE MODAL ===== */}
      {showCreateModal && (
        <div className="home-overlay" onClick={closeModals}>
          <div className="home-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="home-modal-title">CREATE GAME</h2>
            <input className="home-input" type="text" placeholder="Enter your name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={20} onKeyDown={(e) => e.key === "Enter" && handleCreateGame()} autoFocus />
            {error && <p className="home-error">{error}</p>}
            <div className="home-modal-buttons">
              <button className="home-cancel-btn" onClick={closeModals}>
                CANCEL
              </button>
              <button className="home-confirm-btn" onClick={handleCreateGame} disabled={loading}>
                {loading ? "CREATING..." : "CREATE"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== JOIN MODAL ===== */}
      {showJoinModal && (
        <div className="home-overlay" onClick={closeModals}>
          <div className="home-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="home-modal-title">JOIN GAME</h2>
            <input className="home-input" type="text" placeholder="Game Code" value={gameCode} onChange={(e) => setGameCode(e.target.value)} maxLength={6} autoFocus />
            <input className="home-input" type="text" placeholder="Enter your name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={20} onKeyDown={(e) => e.key === "Enter" && handleJoinGame()} />
            {error && <p className="home-error">{error}</p>}
            <div className="home-modal-buttons">
              <button className="home-cancel-btn" onClick={closeModals}>
                CANCEL
              </button>
              <button className="home-confirm-btn" onClick={handleJoinGame} disabled={loading}>
                {loading ? "JOINING..." : "JOIN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
