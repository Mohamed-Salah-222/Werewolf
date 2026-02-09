import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import Modal from "../components/Modal";
import { api } from "../services/api";
import { socketService } from "../services/socket";

export default function LandingPage() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdGameCode, setCreatedGameCode] = useState("");

  useEffect(() => {
    socketService.connect();
    // DON'T disconnect - we need the connection in the lobby
  }, []);

  const handleCreateGame = async () => {
    setLoading(true);
    setError("");

    const response = await api.createGame();

    if (response.success && response.data) {
      setCreatedGameCode(response.data.code);
      console.log("Game created:", response.data.code);
    } else {
      setError(response.error || "Failed to create game");
    }

    setLoading(false);
  };

  const handleJoinWithName = () => {
    if (!playerName.trim()) {
      setError("Please enter your name");
      return;
    }

    if (playerName.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    setLoading(true);
    setError("");
    console.log("🔄 Attempting to join game:", createdGameCode, "as", playerName);

    socketService.joinGame(
      {
        gameCode: createdGameCode,
        playerName: playerName.trim(),
      },
      (response) => {
        console.log("📡 Join response:", response);
        setLoading(false);

        if (response.success) {
          console.log("✅ Join successful, navigating to lobby...");

          // Add delay to ensure backend processes everything
          setTimeout(() => {
            navigate(`/lobby?code=${createdGameCode}&playerId=${response.playerId}&name=${playerName}&host=true`);
          }, 300);
        } else {
          console.error("❌ Join failed:", response.error);
          setError(response.error || "Failed to join game");
        }
      },
    );
  };

  const handleCheckAndJoin = async () => {
    if (!joinCode.trim()) {
      setError("Please enter a game code");
      return;
    }

    if (!joinName.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    setError("");

    // Use lowercase for consistency
    const normalizedCode = joinCode.trim().toLowerCase();
    console.log("🔍 Checking game:", normalizedCode);

    const checkResponse = await api.checkGame(normalizedCode);

    if (!checkResponse.success || !checkResponse.data?.exists) {
      setError("Game not found");
      setLoading(false);
      return;
    }

    if (!checkResponse.data.canJoin) {
      setError("Game has already started");
      setLoading(false);
      return;
    }

    console.log("🔄 Joining game:", normalizedCode, "as", joinName);

    socketService.joinGame(
      {
        gameCode: normalizedCode,
        playerName: joinName.trim(),
      },
      (response) => {
        console.log("📡 Join response:", response);
        setLoading(false);

        if (response.success) {
          console.log("✅ Join successful, navigating to lobby...");

          // Add delay to ensure backend processes everything
          setTimeout(() => {
            navigate(`/lobby?code=${normalizedCode}&playerId=${response.playerId}&name=${joinName}&host=false`);
          }, 300);
        } else {
          console.error("❌ Join failed:", response.error);
          setError(response.error || "Failed to join game");
        }
      },
    );
  };

  return (
    <div className="landing-page">
      <div className="content">
        <h1 className="title">Werewolf</h1>
        <p className="subtitle">One Night in the Village</p>

        <div className="button-container">
          <button className="game-button primary" onClick={() => setShowCreateModal(true)}>
            Create Game
          </button>

          <button className="game-button primary" onClick={() => setShowJoinModal(true)}>
            Join Game
          </button>

          <button className="game-button disabled" disabled>
            Characters
            <span className="coming-soon">Coming Soon</span>
          </button>

          <button className="game-button disabled" disabled>
            How to Play
            <span className="coming-soon">Coming Soon</span>
          </button>
        </div>
      </div>

      {/* Create Game Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreatedGameCode("");
          setPlayerName("");
          setError("");
        }}
        title="Create Game"
      >
        {!createdGameCode ? (
          <>
            <p className="modal-info">Create a new game and get a code to share with your friends</p>
            {error && <div className="modal-error">{error}</div>}
            <button className="modal-button" onClick={handleCreateGame} disabled={loading}>
              {loading ? "Creating..." : "Create Game"}
            </button>
          </>
        ) : (
          <>
            <div className="modal-success">
              Game created! Code: <strong>{createdGameCode}</strong>
            </div>
            <p className="modal-info">Enter your name to join the game</p>
            {error && <div className="modal-error">{error}</div>}
            <input type="text" className="modal-input" placeholder="Your name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={20} disabled={loading} />
            <button className="modal-button" onClick={handleJoinWithName} disabled={loading || !playerName.trim()}>
              {loading ? "Joining..." : "Join Game"}
            </button>
          </>
        )}
      </Modal>

      {/* Join Game Modal */}
      <Modal
        isOpen={showJoinModal}
        onClose={() => {
          setShowJoinModal(false);
          setJoinCode("");
          setJoinName("");
          setError("");
        }}
        title="Join Game"
      >
        <p className="modal-info">Enter the game code and your name</p>
        {error && <div className="modal-error">{error}</div>}
        <input type="text" className="modal-input" placeholder="Game Code (e.g., abc123)" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} maxLength={6} disabled={loading} />
        <input type="text" className="modal-input" placeholder="Your name" value={joinName} onChange={(e) => setJoinName(e.target.value)} maxLength={20} disabled={loading} />
        <button className="modal-button" onClick={handleCheckAndJoin} disabled={loading || !joinCode.trim() || !joinName.trim()}>
          {loading ? "Joining..." : "Join Game"}
        </button>
      </Modal>
    </div>
  );
}
