import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import { API_URL } from "../config";
import { clearSession } from "../utils/gameSession";
import { useLeaveWarning } from "../hooks/useLeaveWarning";
import "./WaitingRoom.css";

// Card imports
import backCard from "../assets/back_card.webp";
import werewolfCard from "../assets/werewolf_card.webp";
import minionCard from "../assets/minion_card.webp";
import seerCard from "../assets/Seer_card.webp";
import robberCard from "../assets/robber_card.webp";
import troublemakerCard from "../assets/troublemaker_card.webp";
import masonCard from "../assets/mason_card.webp";
import drunkCard from "../assets/drunk_card.webp";
import insomniacCard from "../assets/insomaniac_card.webp";
import cloneCard from "../assets/clone_card.webp";
import jokerCard from "../assets/joker_card.webp";

// Small card imports for grid
import werewolfCardSmall from "../assets/werewolf_card_small.webp";
import minionCardSmall from "../assets/minion_card_small.webp";
import seerCardSmall from "../assets/seer_card_small.webp";
import robberCardSmall from "../assets/robber_card_small.webp";
import troublemakerCardSmall from "../assets/troublemaker_card_small.webp";
import masonCardSmall from "../assets/mason_card_small.webp";
import drunkCardSmall from "../assets/drunk_card_small.webp";
import insomniacCardSmall from "../assets/insomaniac_card_small.webp";
import cloneCardSmall from "../assets/clone_card_small.webp";
import jokerCardSmall from "../assets/joker_card_small.webp";

const allCards = [
  { id: "werewolf", name: "Werewolf", image: werewolfCard, small: werewolfCardSmall },
  { id: "minion", name: "Minion", image: minionCard, small: minionCardSmall },
  { id: "seer", name: "Seer", image: seerCard, small: seerCardSmall },
  { id: "robber", name: "Robber", image: robberCard, small: robberCardSmall },
  { id: "troublemaker", name: "Troublemaker", image: troublemakerCard, small: troublemakerCardSmall },
  { id: "mason", name: "Mason", image: masonCard, small: masonCardSmall },
  { id: "drunk", name: "Drunk", image: drunkCard, small: drunkCardSmall },
  { id: "insomniac", name: "Insomniac", image: insomniacCard, small: insomniacCardSmall },
  { id: "clone", name: "Clone", image: cloneCard, small: cloneCardSmall },
  { id: "joker", name: "Joker", image: jokerCard, small: jokerCardSmall },
];

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
  const [readyPlayersSet, setReadyPlayersSet] = useState<Set<string>>(new Set());
  const [startError, setStartError] = useState<string | null>(null);
  const [cardCount, setCardCount] = useState(42);

  useEffect(() => {
    const updateCardCount = () => {
      const width = window.innerWidth;
      if (width <= 768) {
        setCardCount(0);
      } else if (width <= 1024) {
        setCardCount(20);
      } else if (width <= 1280) {
        setCardCount(30);
      } else {
        setCardCount(42);
      }
    };

    updateCardCount();
    window.addEventListener("resize", updateCardCount);
    return () => window.removeEventListener("resize", updateCardCount);
  }, []);

  useLeaveWarning(true);

  const [gridCards] = useState<GridCard[]>(() => {
    const cards: GridCard[] = [];
    const shuffledIndices: number[] = [];
    for (let i = 0; i < 42; i++) {
      shuffledIndices.push(i % allCards.length);
    }
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
    }
    for (let i = 0; i < 42; i++) {
      cards.push({
        id: i,
        cardIndex: shuffledIndices[i],
      });
    }
    return cards;
  });

  // Fetch players on mount
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await fetch(`${API_URL}/api/games/${gameCode}`);
        const data = await res.json();
        if (data.success && data.data.players) {
          setPlayers(
            data.data.players.map((p: any) => ({
              id: p.id,
              name: p.name,
              isReady: readyPlayersSet.has(p.id),
            }))
          );
        }
      } catch {
        console.error("Failed to fetch players");
      }
    };
    fetchPlayers();
  }, [gameCode, readyPlayersSet]);

  // Socket listeners
  useEffect(() => {
    if (!socket.connected) socket.connect();

    if (gameCode && playerId) {
      socket.emit("rejoinGame", { gameCode, playerId, playerName }, () => { });
    }

    socket.on("playerJoined", (data: { playerId: string; playerName: string; playerCount: number }) => {
      setPlayers((prev) => {
        if (prev.find((p) => p.id === data.playerId)) return prev;
        return [...prev, { id: data.playerId, name: data.playerName, isReady: false }];
      });
    });

    socket.on("playerLeft", (data: { playerId: string }) => {
      setPlayers((prev) => prev.filter((p) => p.id !== data.playerId));
      setReadyPlayersSet((prev) => {
        const updated = new Set(prev);
        updated.delete(data.playerId);
        return updated;
      });
    });

    socket.on("playerListUpdate", (data: { players: Array<{ id: string; name: string }> }) => {
      setPlayers(
        data.players.map((p) => ({
          id: p.id,
          name: p.name,
          isReady: readyPlayersSet.has(p.id),
        }))
      );
    });

    socket.on("playerReady", (data: { playerId: string }) => {
      setReadyPlayersSet((prev) => {
        const updated = new Set(prev);
        updated.add(data.playerId);
        return updated;
      });
      setPlayers((prev) =>
        prev.map((p) => (p.id === data.playerId ? { ...p, isReady: true } : p))
      );
    });

    socket.on("gameStarted", () => {
      navigate(`/role-reveal/${gameCode}`, {
        state: { playerName, playerId, isHost },
      });
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
    };
  }, [gameCode, navigate, playerName, playerId, isHost]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gameCode || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = () => {
    const allReady = players.length >= 6 && players.every((p) => p.isReady);
    if (!allReady) {
      const notReadyCount = players.filter((p) => !p.isReady).length;
      setStartError(`${notReadyCount} player(s) not ready yet`);
      setTimeout(() => setStartError(null), 3000);
      return;
    }
    setStartError(null);
    socket.emit("startGame", { gameCode, playerId });
  };

  const handleLeave = () => {
    socket.emit("leaveGame", { gameCode, playerId });
    clearSession();
    navigate("/");
  };

  const handleReady = () => {
    if (!playerReady) {
      setPlayerReady(true);
      socket.emit("playerReady", { gameCode, playerId });
    }
  };

  const handleCardClick = (cardId: number, cardIndex: number) => {
    if (selectedPileCard === cardId) {
      setSelectedPileCard(null);
      setRevealedCard(null);
    } else {
      setSelectedPileCard(cardId);
      setRevealedCard(cardIndex);
    }
  };

  return (
    <div style={styles.page} className="wr-page">
      <div style={styles.vignette} />

      <style>{`
        .flip-card {
          width: 90px;
          height: 126px;
          perspective: 600px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.35s ease, box-shadow 0.3s ease;
          transform-style: preserve-3d;
          border-radius: 4px;
          border: 1px solid #1a1510;
        }
        .flip-card:hover .flip-card-inner {
          transform: rotateY(180deg);
        }
        .flip-card.flipped .flip-card-inner {
          transform: rotateY(180deg);
        }
        .flip-card.selected .flip-card-inner {
          box-shadow: 0 0 16px rgba(201,168,76,0.6);
          border: 2px solid #c9a84c;
        }
        .flip-card-front, .flip-card-back {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          backface-visibility: hidden;
          border-radius: 4px;
          overflow: hidden;
        }
        .flip-card-back {
          transform: rotateY(180deg);
        }
        .flip-card-front img, .flip-card-back img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
      `}</style>

      {/* ===== LEFT: CARD GRID ===== */}
      <div style={styles.cardPile} className="wr-cards">
        <div style={styles.cardGrid}>
          {gridCards.slice(0, cardCount).map((card) => (
            <div key={card.id} className={`flip-card${selectedPileCard === card.id ? " flipped selected" : ""}`} onClick={() => handleCardClick(card.id, card.cardIndex)}>
              <div className="flip-card-inner">
                <div className="flip-card-front">
                  <img src={backCard} alt="Card back" />
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
      <div style={styles.centerPanel} className="wr-center">
        <h1 style={styles.title}>WAITING ROOM</h1>

        <div style={styles.codeSection}>
          <span style={styles.codeLabel}>GAME CODE</span>
          <button style={styles.codeButton} onClick={handleCopyCode}>
            <span style={styles.codeText}>{gameCode?.toUpperCase()}</span>
            <span style={styles.copyHint}>{copied ? "COPIED!" : "TAP TO COPY"}</span>
          </button>
        </div>

        <div style={styles.playerSection}>
          <span style={styles.playerCount}>PLAYERS {players.length}/10</span>
          <div style={styles.playerList}>
            {players.map((p) => (
              <div key={p.id} style={styles.playerRow}>
                <span style={styles.playerName}>{p.name}</span>
                <div style={styles.playerBadgesContainer}>
                  {p.isReady && <span style={styles.readyBadge}>✓ READY</span>}
                  {p.id === playerId && isHost && <span style={styles.hostBadge}>HOST</span>}
                  {p.id === playerId && !isHost && <span style={styles.youBadge}>YOU</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.actions}>
          {isHost && (
            <>
              {startError && <div style={styles.errorMessage}>{startError}</div>}
              <button
                style={{
                  ...styles.startBtn,
                  ...(players.length >= 6 && players.every((p) => p.isReady)
                    ? {}
                    : styles.startBtnDisabled),
                }}
                onClick={handleStartGame}
                disabled={!(players.length >= 6 && players.every((p) => p.isReady))}
              >
                {players.length < 6
                  ? `NEED ${6 - players.length} MORE`
                  : players.every((p) => p.isReady)
                    ? "START GAME"
                    : `${players.filter((p) => !p.isReady).length} NOT READY`}
              </button>
            </>
          )}
          {!isHost && <p style={styles.waitingText}>Waiting for host to start...</p>}
          <button style={playerReady ? styles.readyBtnActive : styles.readyBtn} onClick={handleReady} disabled={playerReady}>
            {playerReady ? "✓ READY" : "READY"}
          </button>
          <button style={styles.leaveBtn} onClick={handleLeave}>
            LEAVE
          </button>
        </div>
      </div>

      {/* ===== RIGHT: REVEALED CARD ===== */}
      <div style={styles.revealPanel} className="wr-reveal">
        {revealedCard !== null ? (
          <div style={styles.revealedCardWrapper}>
            <img src={allCards[revealedCard].image} alt={allCards[revealedCard].name} style={styles.revealedCardImg} />
          </div>
        ) : (
          <div style={styles.revealPlaceholder}>
            <span style={styles.revealPlaceholderText}>SELECT A CARD</span>
            <span style={styles.revealPlaceholderSub}>from the pile to reveal</span>
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
    height: "100vh",
    overflow: "hidden",
    display: "flex",
    background: "radial-gradient(ellipse at 50% 50%, #1a0a0a 0%, #0a0a0a 50%, #000 100%)",
    fontFamily: "'Cinzel', 'Palatino Linotype', 'Georgia', serif",
    color: "#e8dcc8",
  },
  vignette: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
    zIndex: 1,
  },
  cardPile: {
    position: "relative",
    zIndex: 10,
    flex: "0 0 35%",
    padding: "12px",
    overflow: "auto",
    display: "flex",
    alignItems: "flex-start",
  },
  cardGrid: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "4px",
    justifyContent: "center",
    alignContent: "flex-start",
  },
  centerPanel: {
    position: "relative",
    zIndex: 10,
    flex: "0 0 30%",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    padding: "32px 20px",
    borderLeft: "1px solid #1a1510",
    borderRight: "1px solid #1a1510",
    overflow: "auto",
  },
  title: {
    fontSize: "22px",
    fontWeight: 700,
    letterSpacing: "6px",
    color: "#c9a84c",
    margin: "0 0 24px 0",
    textAlign: "center" as const,
    textShadow: "0 0 30px rgba(201,168,76,0.2)",
  },
  codeSection: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    marginBottom: "28px",
    width: "100%",
  },
  codeLabel: {
    fontSize: "10px",
    letterSpacing: "4px",
    color: "#5a4a30",
    marginBottom: "8px",
  },
  codeButton: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "4px",
    padding: "12px 24px",
    backgroundColor: "rgba(201,168,76,0.05)",
    border: "1px solid #2a2019",
    borderRadius: "4px",
    cursor: "pointer",
    width: "100%",
  },
  codeText: {
    fontSize: "28px",
    fontWeight: 700,
    letterSpacing: "8px",
    color: "#c9a84c",
    fontFamily: "'Cinzel', serif",
  },
  copyHint: {
    fontSize: "9px",
    letterSpacing: "3px",
    color: "#5a4a30",
    fontFamily: "'Cinzel', serif",
  },
  playerSection: {
    width: "100%",
    flex: 1,
    marginBottom: "20px",
  },
  playerCount: {
    display: "block",
    fontSize: "10px",
    letterSpacing: "4px",
    color: "#5a4a30",
    marginBottom: "12px",
    textAlign: "center" as const,
  },
  playerList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  playerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    backgroundColor: "rgba(201,168,76,0.03)",
    border: "1px solid #1a1510",
    borderRadius: "4px",
  },
  playerName: {
    fontSize: "14px",
    color: "#c9b896",
    fontFamily: "'Georgia', serif",
  },
  hostBadge: {
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "2px",
    color: "#c9a84c",
    padding: "2px 8px",
    border: "1px solid #3d2e1a",
    borderRadius: "2px",
    fontFamily: "'Cinzel', serif",
  },
  youBadge: {
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "2px",
    color: "#6b5a3a",
    padding: "2px 8px",
    border: "1px solid #2a2019",
    borderRadius: "2px",
    fontFamily: "'Cinzel', serif",
  },
  actions: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
    width: "100%",
  },
  startBtn: {
    width: "100%",
    padding: "14px",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "4px",
    backgroundColor: "#c9a84c",
    color: "#0a0a0a",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "'Cinzel', serif",
  },
  startBtnDisabled: {
    width: "100%",
    padding: "14px",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "3px",
    backgroundColor: "transparent",
    color: "#3d2e1a",
    border: "1px solid #1a1510",
    borderRadius: "4px",
    cursor: "not-allowed",
    fontFamily: "'Cinzel', serif",
  },
  waitingText: {
    fontSize: "13px",
    color: "#5a4a30",
    textAlign: "center" as const,
    fontFamily: "'Georgia', serif",
    fontStyle: "italic",
  },
  leaveBtn: {
    width: "100%",
    padding: "10px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "3px",
    backgroundColor: "transparent",
    color: "#5a3a2a",
    border: "1px solid #2a1510",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "'Cinzel', serif",
  },
  revealPanel: {
    position: "relative",
    zIndex: 10,
    flex: "0 0 35%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  revealedCardWrapper: {
    maxHeight: "90%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  revealedCardImg: {
    maxHeight: "80vh",
    maxWidth: "100%",
    objectFit: "contain" as const,
    borderRadius: "8px",
    boxShadow: "0 0 60px rgba(201,168,76,0.2), 0 10px 40px rgba(0,0,0,0.8)",
  },
  revealPlaceholder: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    opacity: 0.3,
  },
  revealPlaceholderText: {
    fontSize: "14px",
    letterSpacing: "4px",
    color: "#5a4a30",
    fontFamily: "'Cinzel', serif",
  },
  revealPlaceholderSub: {
    fontSize: "12px",
    color: "#3d2e1a",
    fontFamily: "'Georgia', serif",
    fontStyle: "italic",
  },
  playerBadgesContainer: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
  },
  readyBadge: {
    fontSize: "8px",
    fontWeight: 700,
    letterSpacing: "1px",
    color: "#4a7c3f",
    padding: "2px 6px",
    border: "1px solid #2d5a26",
    borderRadius: "2px",
    fontFamily: "'Cinzel', serif",
    backgroundColor: "rgba(74, 124, 63, 0.1)",
  },
  readyBtn: {
    width: "100%",
    padding: "10px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "3px",
    backgroundColor: "transparent",
    color: "#5a3a2a",
    border: "1px solid #2a1510",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "'Cinzel', serif",
    transition: "all 0.3s ease",
  },
  readyBtnActive: {
    width: "100%",
    padding: "10px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "3px",
    backgroundColor: "rgba(74, 124, 63, 0.15)",
    color: "#4a7c3f",
    border: "1px solid #2d5a26",
    borderRadius: "4px",
    cursor: "not-allowed",
    fontFamily: "'Cinzel', serif",
    transition: "all 0.3s ease",
  },
  errorMessage: {
    width: "100%",
    padding: "10px",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "2px",
    backgroundColor: "rgba(180, 70, 70, 0.2)",
    color: "#d97a7a",
    border: "1px solid #8b4545",
    borderRadius: "4px",
    textAlign: "center" as const,
    fontFamily: "'Cinzel', serif",
    animation: "shake 0.3s ease-in-out",
  },
};

export default WaitingRoom;
