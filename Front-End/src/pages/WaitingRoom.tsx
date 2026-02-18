import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import { API_URL } from "../config";
import { clearSession } from "../utils/gameSession";
import { useLeaveWarning } from "../hooks/useLeaveWarning";
import { allCards, backCardImage } from "../characters";
import "./WaitingRoom.css";

// ===== TYPES =====

interface LocationState {
  playerName: string;
  playerId: string;
  isHost: boolean;
}

interface GridCard {
  id: number;
  cardIndex: number;
}

interface PlayerStatus {
  id: string;
  name: string;
  isReady: boolean;
}

// ===== HELPERS =====

function getCardCount(width: number): number {
  if (width <= 768) return 0;
  if (width <= 1024) return 20;
  if (width <= 1280) return 30;
  return 42;
}

function shuffleGridCards(): GridCard[] {
  const indices = Array.from({ length: 42 }, (_, i) => i % allCards.length);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.map((cardIndex, id) => ({ id, cardIndex }));
}

// ===== COMPONENT =====

function WaitingRoom() {
  const { gameCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const playerName = state?.playerName || "Unknown";
  const playerId = state?.playerId || "";
  const isHost = state?.isHost || false;

  const [players, setPlayers] = useState<PlayerStatus[]>([]);
  const [copied, setCopied] = useState(false);
  const [revealedCard, setRevealedCard] = useState<number | null>(null);
  const [selectedPileCard, setSelectedPileCard] = useState<number | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [cardCount, setCardCount] = useState(42);

  // Always-fresh ref to avoid stale closure issues in socket callbacks
  const readySetRef = useRef<Set<string>>(new Set());

  const [gridCards] = useState<GridCard[]>(shuffleGridCards);

  useLeaveWarning(true);

  // Responsive card count
  useEffect(() => {
    const update = () => setCardCount(getCardCount(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Fetch players, seed ready state, then rejoin
  useEffect(() => {
    if (!socket.connected) socket.connect();

    const init = async () => {
      try {
        const res = await fetch(`${API_URL}/api/games/${gameCode}`);
        const data = await res.json();

        if (data.success && data.data.players) {
          const seededSet = new Set<string>();
          const rawReady = data.data.readyPlayers;

          if (Array.isArray(rawReady)) {
            for (const entry of rawReady) {
              if (entry?.ready && entry?.id) {
                seededSet.add(entry.id);
              }
            }
          }

          readySetRef.current = seededSet;

          setPlayers(
            data.data.players.map((p: { id: string; name: string }) => ({
              id: p.id,
              name: p.name,
              isReady: seededSet.has(p.id),
            })),
          );

          if (seededSet.has(playerId)) setPlayerReady(true);
        }
      } catch (err) {
        console.error("Failed to fetch players", err);
      }

      // Rejoin AFTER fetch so readySetRef is seeded before playerListUpdate fires
      if (gameCode && playerId) {
        socket.emit("rejoinGame", { gameCode, playerId, playerName }, () => {});
      }
    };

    init();
  }, [gameCode, playerId, playerName]);

  // Socket listeners
  useEffect(() => {
    socket.on("playerKicked", (data: { kickedPlayerId: string }) => {
      if (data.kickedPlayerId === playerId) {
        clearSession();
        navigate("/", { state: { kicked: true } });
      }
    });

    socket.on("playerJoined", (data: { playerId: string; playerName: string }) => {
      setPlayers((prev) => {
        if (prev.find((p) => p.id === data.playerId)) return prev;
        return [
          ...prev,
          {
            id: data.playerId,
            name: data.playerName,
            isReady: readySetRef.current.has(data.playerId),
          },
        ];
      });
    });

    socket.on("playerLeft", (data: { playerId: string }) => {
      readySetRef.current.delete(data.playerId);
      setPlayers((prev) => prev.filter((p) => p.id !== data.playerId));
    });

    socket.on("playerListUpdate", (data: { players: Array<{ id: string; name: string }> }) => {
      setPlayers(
        data.players.map((p) => ({
          id: p.id,
          name: p.name,
          isReady: readySetRef.current.has(p.id),
        })),
      );
    });

    socket.on("playerReady", (data: { playerId: string; ready: boolean }) => {
      if (data.ready) {
        readySetRef.current.add(data.playerId);
      } else {
        readySetRef.current.delete(data.playerId);
      }
      setPlayers((prev) => prev.map((p) => (p.id === data.playerId ? { ...p, isReady: data.ready } : p)));
      if (data.playerId === playerId) setPlayerReady(data.ready);
    });

    socket.on("gameStarted", () => {
      navigate(`/role-reveal/${gameCode}`, { state: { playerName, playerId, isHost } });
    });

    socket.on("roleReveal", (data: { playerId: string; roleName: string; roleTeam: string; roleDescription: string }) => {
      navigate(`/role-reveal/${gameCode}`, {
        state: {
          playerName,
          playerId,
          isHost,
          rejoinRoleInfo: {
            roleName: data.roleName,
            roleTeam: data.roleTeam,
            roleDescription: data.roleDescription,
          },
        },
      });
    });

    return () => {
      socket.off("playerJoined");
      socket.off("playerLeft");
      socket.off("playerListUpdate");
      socket.off("playerReady");
      socket.off("gameStarted");
      socket.off("roleReveal");
      socket.off("playerKicked");
    };
  }, [gameCode, navigate, playerName, playerId, isHost]);

  // ===== HANDLERS =====

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(gameCode || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [gameCode]);

  const handleStartGame = useCallback(() => {
    const allReady = players.length >= 6 && players.every((p) => p.isReady);
    if (!allReady) {
      const notReadyCount = players.filter((p) => !p.isReady).length;
      setStartError(`${notReadyCount} player(s) not ready yet`);
      setTimeout(() => setStartError(null), 3000);
      return;
    }
    setStartError(null);
    socket.emit("startGame", { gameCode, playerId }, (response?: { success: boolean; error?: string }) => {
      if (response && !response.success) {
        setStartError(response.error || "Failed to start game");
        setTimeout(() => setStartError(null), 3000);
      }
    });
  }, [players, gameCode, playerId]);

  const handleLeave = useCallback(() => {
    socket.emit("leaveGame", { gameCode, playerId });
    clearSession();
    navigate("/");
  }, [gameCode, playerId, navigate]);

  const handleKick = useCallback(
    (kickedPlayerId: string) => {
      socket.emit("kickPlayer", { gameCode, hostId: playerId, kickedPlayerId });
    },
    [gameCode, playerId],
  );

  const handleReady = useCallback(() => {
    const newReady = !playerReady;
    // Send explicit ready value — don't let the server toggle, avoids desync
    socket.emit("playerReady", { gameCode, playerId, ready: newReady });
    // Don't optimistically set local state — wait for server acknowledgment via the
    // "playerReady" socket event to avoid the rare bug where client/server desync
  }, [playerReady, gameCode, playerId]);

  const handleCardClick = useCallback(
    (cardId: number, cardIndex: number) => {
      if (selectedPileCard === cardId) {
        setSelectedPileCard(null);
        setRevealedCard(null);
      } else {
        setSelectedPileCard(cardId);
        setRevealedCard(cardIndex);
      }
    },
    [selectedPileCard],
  );

  // ===== DERIVED =====

  const canStart = players.length >= 6 && players.every((p) => p.isReady);
  const notReadyCount = players.filter((p) => !p.isReady).length;
  const needMore = 6 - players.length;

  const startButtonText = needMore > 0 ? `NEED ${needMore} MORE` : canStart ? "START GAME" : `${notReadyCount} NOT READY`;

  // ===== RENDER =====

  return (
    <div className="wr-page">
      <div className="wr-vignette" />

      {/* ===== LEFT: CARD GRID ===== */}
      <div className="wr-cards">
        <div className="wr-card-grid">
          {gridCards.slice(0, cardCount).map((card) => (
            <div key={card.id} className={`flip-card${selectedPileCard === card.id ? " flipped selected" : ""}`} onClick={() => handleCardClick(card.id, card.cardIndex)}>
              <div className="flip-card-inner">
                <div className="flip-card-front">
                  <img src={backCardImage} alt="Card back" />
                </div>
                <div className="flip-card-back">
                  <img src={allCards[card.cardIndex].small} alt={allCards[card.cardIndex].name} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== MIDDLE: WAITING ROOM ===== */}
      <div className="wr-center">
        <h1 className="wr-title">WAITING ROOM</h1>

        <div className="wr-code-section">
          <span className="wr-code-label">GAME CODE</span>
          <button className="wr-code-button" onClick={handleCopyCode}>
            <span className="wr-code-text">{gameCode?.toUpperCase()}</span>
            <span className="wr-copy-hint">{copied ? "COPIED!" : "TAP TO COPY"}</span>
          </button>
        </div>

        <div className="wr-player-section">
          <span className="wr-player-count">PLAYERS {players.length}/10</span>
          <div className="wr-player-list">
            {players.map((p) => (
              <div key={p.id} className="wr-player-row">
                <span className="wr-player-name">{p.name}</span>
                <div className="wr-badges">
                  {p.isReady && <span className="wr-ready-badge">✓ READY</span>}
                  {p.id === playerId && isHost && <span className="wr-host-badge">HOST</span>}
                  {p.id === playerId && !isHost && <span className="wr-you-badge">YOU</span>}
                  {isHost && p.id !== playerId && (
                    <button className="wr-kick-btn" onClick={() => handleKick(p.id)}>
                      KICK
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="wr-actions">
          {isHost && (
            <>
              {startError && <div className="wr-error-message">{startError}</div>}
              <button className="wr-start-btn" onClick={handleStartGame} disabled={!canStart}>
                {startButtonText}
              </button>
            </>
          )}
          {!isHost && <p className="wr-waiting-text">Waiting for host to start...</p>}
          <button className={`wr-ready-btn ${playerReady ? "wr-ready-btn--active" : ""}`} onClick={handleReady}>
            {playerReady ? "✓ READY" : "READY"}
          </button>
          <button className="wr-leave-btn" onClick={handleLeave}>
            LEAVE
          </button>
        </div>
      </div>

      {/* ===== RIGHT: REVEALED CARD ===== */}
      <div className="wr-reveal">
        {revealedCard !== null ? (
          <div className="wr-revealed-wrapper">
            <img src={allCards[revealedCard].image} alt={allCards[revealedCard].name} className="wr-revealed-img" />
          </div>
        ) : (
          <div className="wr-reveal-placeholder">
            <span className="wr-reveal-placeholder-text">SELECT A CARD</span>
            <span className="wr-reveal-placeholder-sub">from the pile to reveal</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default WaitingRoom;
