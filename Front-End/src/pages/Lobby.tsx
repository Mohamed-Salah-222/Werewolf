import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { socketService } from "../services/socket";
import "./Lobby.css";

interface Player {
  id: string;
  name: string;
  isReady?: boolean;
}

export default function Lobby() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const gameCode = searchParams.get("code");
  const playerId = searchParams.get("playerId");
  const playerName = searchParams.get("name");
  const isHost = searchParams.get("host") === "true";

  const [players, setPlayers] = useState<Player[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!gameCode || !playerId) {
      navigate("/");
      return;
    }

    // Re-fetch initial state when socket connects
    const refetchPlayers = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/games/${gameCode}`);
        const data = await response.json();

        if (data.success && data.data) {
          console.log("🔄 Refetched players:", data.data.players);
          setPlayers(data.data.players);
        }
      } catch (error) {
        console.error("Error refetching:", error);
      }
    };

    // Call it immediately
    refetchPlayers();

    // Listen for player updates
    socketService.onPlayerListUpdate((data) => {
      setPlayers(data.players);
    });

    socketService.onPlayerJoined((data) => {
      console.log("Player joined:", data.playerName);
    });

    socketService.onGameStarted((data) => {
      console.log("Game started!", data);
      // TODO: Navigate to game screen
      alert("Game is starting!");
    });

    return () => {
      socketService.removeAllListeners();
    };
  }, [gameCode, playerId, navigate]);

  const handleStartGame = () => {
    if (!gameCode) return;
    socketService.startGame(gameCode);
  };

  const handleReady = () => {
    setIsReady(!isReady);
    // TODO: Emit ready status to server
  };

  const handleLeave = () => {
    if (gameCode && playerId) {
      socketService.leaveGame(gameCode, playerId);
    }
    navigate("/");
  };

  const allPlayersReady = players.length >= 6; // Minimum players

  return (
    <div className="lobby-page">
      <div className="lobby-container">
        {/* Header */}
        <div className="lobby-header">
          <h1>Waiting Room</h1>
          <div className="game-code-display">
            <span className="code-label">Game Code:</span>
            <span className="code-value">{gameCode}</span>
          </div>
        </div>

        {/* Player List */}
        <div className="players-section">
          <h2>Players ({players.length}/10)</h2>
          <div className="players-list">
            {players.map((player) => (
              <div key={player.id} className="player-card">
                <div className="player-info">
                  <span className="player-name">{player.name}</span>
                  {player.id === playerId && <span className="you-badge">YOU</span>}
                  {players[0]?.id === player.id && <span className="host-badge">HOST</span>}
                </div>
                {player.isReady && <span className="ready-badge">✓ Ready</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="lobby-actions">
          {isHost ? (
            <button className="start-button" onClick={handleStartGame} disabled={!allPlayersReady}>
              {allPlayersReady ? "Start Game" : `Need ${6 - players.length} more players`}
            </button>
          ) : (
            <button className={`ready-button ${isReady ? "ready" : ""}`} onClick={handleReady}>
              {isReady ? "✓ Ready" : "Ready?"}
            </button>
          )}

          <button className="leave-button" onClick={handleLeave}>
            Leave Game
          </button>
        </div>

        {/* Instructions */}
        <div className="lobby-info">
          <p>Share the game code with your friends to join!</p>
          <p className="min-players-note">Minimum 6 players required to start</p>
        </div>
      </div>
    </div>
  );
}
