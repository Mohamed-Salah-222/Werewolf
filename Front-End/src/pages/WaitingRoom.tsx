import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import { API_URL } from "../config";
import { clearSession } from "../utils/gameSession";
import { useLeaveWarning } from "../hooks/useLeaveWarning";
import { allCards, backCardImage } from "../characters";
import HowToPlay from "../components/HowToPlay";
// import VoiceChat from "../components/VoiceChat";
import "./WaitingRoom.css";

// ===== CONSTANTS =====

const MIN_PLAYERS = 6;

// ===== TYPES =====

interface LocationState {
  playerName: string;
  playerId: string;
  isHost: boolean;
  settings: Settings;
}

const TimerOption = {
  Short: 4,
  Medium: 6,
  Long: 8,
  VeryLong: 10,
} as const;

const DEFAULT_TIMER = TimerOption.Medium;

type TimerOption = (typeof TimerOption)[keyof typeof TimerOption];

interface Settings {
  timer: TimerOption;
  showHint: boolean;
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
  const cardWidth = 78;
  const cardHeight = 110;
  const gap = 4;
  const panelWidth = width * 0.35 - 24;
  const panelHeight = window.innerHeight - 24;
  const cols = Math.floor((panelWidth + gap) / (cardWidth + gap));
  const rows = Math.floor((panelHeight + gap) / (cardHeight + gap));
  return Math.min(cols * rows, 42);
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
  const [isHost, setIsHost] = useState(state?.isHost || false);

  const [settings, setSettings] = useState<Settings>(state?.settings || { timer: DEFAULT_TIMER, showHint: true });
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const [players, setPlayers] = useState<PlayerStatus[]>([]);
  const [copied, setCopied] = useState(false);
  const [revealedCard, setRevealedCard] = useState<number | null>(null);
  const [selectedPileCard, setSelectedPileCard] = useState<number | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [cardCount, setCardCount] = useState(42);
  const [hostId, setHostId] = useState<string>("");

  // How to play modal state
  const [htpOpen, setHtpOpen] = useState(false);
  const [htpPulsing, setHtpPulsing] = useState(() => {
    return sessionStorage.getItem("wr_htp_seen") !== "true";
  });

  // Mount animation state
  const [mounted, setMounted] = useState(false);

  // Always-fresh ref to avoid stale closure issues in socket callbacks
  const readySetRef = useRef<Set<string>>(new Set());
  const settingsRef = useRef<Settings>(settings);

  // Timeout refs for cleanup on unmount
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [gridCards] = useState<GridCard[]>(shuffleGridCards);

  useLeaveWarning(true);

  // Trigger mount animation
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      if (startErrorTimeoutRef.current) clearTimeout(startErrorTimeoutRef.current);
    };
  }, []);

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
          if (data.data.host) setHostId(data.data.host);
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

        if (gameCode && playerId) {
          socket.emit("rejoinGame", { gameCode, playerId, playerName }, () => {});
        }
      } catch (err) {
        console.error("Failed to fetch players", err);
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

    socket.on("hostChanged", (data: { newHostId: string }) => {
      setHostId(data.newHostId);
      setIsHost(data.newHostId === playerId);
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
      socket.off("hostChanged");
      socket.off("gameStarted");
      socket.off("roleReveal");
      socket.off("playerKicked");
    };
  }, [gameCode, navigate, playerName, playerId, isHost]);

  // ===== HANDLERS =====

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(gameCode || "");
    setCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, [gameCode]);

  const handleStartGame = useCallback(() => {
    const allReady = players.length >= MIN_PLAYERS && players.every((p) => p.isReady);
    if (!allReady) {
      const notReadyCount = players.filter((p) => !p.isReady).length;
      setStartError(`${notReadyCount} player(s) not ready yet`);
      if (startErrorTimeoutRef.current) clearTimeout(startErrorTimeoutRef.current);
      startErrorTimeoutRef.current = setTimeout(() => setStartError(null), 3000);
      return;
    }
    setStartError(null);
    socket.emit("startGame", { gameCode, playerId }, (response?: { success: boolean; error?: string }) => {
      if (response && !response.success) {
        setStartError(response.error || "Failed to start game");
        if (startErrorTimeoutRef.current) clearTimeout(startErrorTimeoutRef.current);
        startErrorTimeoutRef.current = setTimeout(() => setStartError(null), 3000);
      }
    });
  }, [players, gameCode, playerId]);

  const handleUpdateSettings = useCallback(() => {
    socket.emit("settingsUpdate", { gameCode, playerId, settings: settingsRef.current });
    setSettingsModalOpen(false);
  }, [gameCode, playerId]);

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
    socket.emit("playerReady", { gameCode, playerId, ready: newReady });
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

  const handleHintClick = useCallback(() => {
    setHtpOpen(true);
    if (htpPulsing) {
      setHtpPulsing(false);
      sessionStorage.setItem("wr_htp_seen", "true");
    }
  }, [htpPulsing]);

  // ===== DERIVED =====

  const canStart = players.length >= MIN_PLAYERS && players.every((p) => p.isReady);
  const notReadyCount = players.filter((p) => !p.isReady).length;
  const needMore = MIN_PLAYERS - players.length;

  const startButtonText = needMore > 0 ? `NEED ${needMore} MORE` : canStart ? "START GAME" : `${notReadyCount} NOT READY`;

  // ===== RENDER =====

  return (
    <div className={`wr-page ${mounted ? "wr-page--mounted" : ""}`}>
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
                  <img src={allCards[card.cardIndex].image} alt={allCards[card.cardIndex].name} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== MIDDLE: WAITING ROOM ===== */}
      <div className="wr-center">
        <div className="wr-title-row wr-anim-title">
          {isHost ? (
            <button className="wr-settings-btn wr-title-btn--left" onClick={() => setSettingsModalOpen(true)} aria-label="Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          ) : (
            <div className="wr-title-btn--left" />
          )}
          <h1 className="wr-title">WAITING ROOM</h1>
          <button className={`wr-hint-btn wr-title-btn--right${htpPulsing && settings.showHint ? " wr-hint-btn--pulse" : ""}`} onClick={handleHintClick} aria-label="How to play">
            !
          </button>
        </div>

        <div className="wr-code-section wr-anim-code">
          <span className="wr-code-label">GAME CODE</span>
          <button className="wr-code-button" onClick={handleCopyCode}>
            <span className="wr-code-text">{gameCode?.toUpperCase()}</span>
            <span className="wr-copy-hint">{copied ? "COPIED!" : "TAP TO COPY"}</span>
          </button>
        </div>

        <div className="wr-player-section wr-anim-players">
          <span className="wr-player-count">PLAYERS {players.length}/10</span>
          <div className="wr-player-list">
            {players.map((p, index) => (
              <div key={p.id} className="wr-player-row wr-anim-player-row" style={{ "--player-index": index } as React.CSSProperties}>
                <span className="wr-player-name">{p.name}</span>
                <div className="wr-badges">
                  {p.isReady && <span className="wr-ready-badge">✓ READY</span>}
                  {p.id === hostId && <span className="wr-host-badge">HOST</span>}
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

        <div className="wr-actions wr-anim-actions">
          {isHost && (
            <>
              {startError && <div className="wr-error-message">{startError}</div>}
              <button className="wr-start-btn" onClick={handleStartGame} disabled={!canStart}>
                {startButtonText}
              </button>
            </>
          )}
          <button className={`wr-ready-btn ${playerReady ? "wr-ready-btn--active" : ""}`} onClick={handleReady}>
            {playerReady ? "✓ READY" : "READY"}
          </button>
          <button className="wr-leave-btn" onClick={handleLeave}>
            LEAVE
          </button>
        </div>
      </div>

      {/* ===== SETTINGS MODAL ===== */}
      {settingsModalOpen && (
        <div className="wr-settings-overlay" onClick={() => setSettingsModalOpen(false)}>
          <div className="wr-settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wr-settings-header">
              <h3 className="wr-settings-title">SETTINGS</h3>
              <button className="wr-settings-close" onClick={() => setSettingsModalOpen(false)}>
                ✕
              </button>
            </div>
            <div className="wr-settings-body">
              <div className="wr-settings-option">
                <span className="wr-settings-option-label">DISCUSSION TIMER</span>
                <span className="wr-settings-option-hint">Minutes per discussion round</span>
                <div className="wr-settings-timer-options">
                  {Object.entries(TimerOption).map(([key, value]) => (
                    <button
                      key={key}
                      className={`wr-settings-timer-btn ${settings.timer === value ? "wr-settings-timer-btn--active" : ""}`}
                      onClick={() => {
                        setSettings((prev) => {
                          const updated = { ...prev, timer: value as TimerOption };
                          settingsRef.current = updated;
                          return updated;
                        });
                      }}
                    >
                      <span className="wr-settings-timer-value">{value}</span>
                      <span className="wr-settings-timer-label">{key}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="wr-settings-option" style={{ marginTop: "20px" }}>
                {/* <span className="wr-settings-option-label">HELP HINTS</span> */}
                {/* <span className="wr-settings-option-hint">Pulse the help button for new players</span> */}
                <div className="wr-settings-toggle-row">
                  {/* <button
                    className={`wr-settings-toggle ${settings.showHint ? "wr-settings-toggle--active" : ""}`}
                    onClick={() => {
                      setSettings((prev) => {
                        const updated = { ...prev, showHint: !prev.showHint };
                        settingsRef.current = updated;
                        return updated;
                      });
                    }}
                  >
                    {settings.showHint ? "ON" : "OFF"}
                  </button> */}
                </div>
              </div>
            </div>
            <div className="wr-settings-footer">
              <button className="wr-settings-cancel" onClick={() => setSettingsModalOpen(false)}>
                CANCEL
              </button>
              <button className="wr-settings-save" onClick={handleUpdateSettings}>
                SAVE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== HOW TO PLAY MODAL ===== */}
      {htpOpen && <HowToPlay onClose={() => setHtpOpen(false)} />}

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
