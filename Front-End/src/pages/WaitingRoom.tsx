import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Crown } from "lucide-react";
import socket from "../socket";
import { API_URL } from "../config";
import { useGameStore } from "../store/gameStore";
import { allCards, backCardImage } from "../characters";
import HowToPlay from "../components/HowToPlay";
// import VoiceChat from "../components/VoiceChat";
import "./WaitingRoom.css";

// ===== CONSTANTS =====

const MIN_PLAYERS = 6;

// Ping interval in ms — how often each client measures latency
const PING_INTERVAL = 4000;

// Signal strength thresholds (ms)
const SIGNAL_GREAT = 100;
const SIGNAL_GOOD = 200;
const SIGNAL_OKAY = 400;

// Long press duration to trigger kick (ms)
const LONG_PRESS_DURATION = 600;

// ===== TYPES =====

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

type SignalLevel = 0 | 1 | 2 | 3 | 4;

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

function pingToSignal(ping: number | null): SignalLevel {
  if (ping === null) return 0;
  if (ping < SIGNAL_GREAT) return 4;
  if (ping < SIGNAL_GOOD) return 3;
  if (ping < SIGNAL_OKAY) return 2;
  return 1;
}

function signalColor(level: SignalLevel): string {
  if (level >= 4) return "#4a7c3f";
  if (level === 3) return "#7a9c3f";
  if (level === 2) return "#c9a84c";
  if (level === 1) return "#8b3a3a";
  return "#3d2e1a";
}

// ===== SIGNAL BARS COMPONENT =====

function SignalBars({ level }: { level: SignalLevel }) {
  const color = signalColor(level);
  const dimColor = "rgba(201, 168, 76, 0.15)";

  return (
    <div className={`wr-signal-bars ${level === 0 ? "wr-signal-bars--measuring" : ""}`} title={level === 0 ? "Measuring..." : `Signal: ${["", "Poor", "Fair", "Good", "Great"][level]}`}>
      {[1, 2, 3, 4].map((bar) => (
        <div
          key={bar}
          className="wr-signal-bar"
          style={{
            height: `${bar * 3 + 2}px`,
            backgroundColor: bar <= level ? color : dimColor,
          }}
        />
      ))}
    </div>
  );
}

// ===== COMPONENT =====

function WaitingRoom() {
  const { gameCode } = useParams();
  const playerName = useGameStore((s) => s.playerName) || "Unknown";
  const playerId = useGameStore((s) => s.playerId) || "";
  const isHost = useGameStore((s) => s.isHost);
  const setIsHost = useGameStore((s) => s.setIsHost);
  const setPhase = useGameStore((s) => s.setPhase);
  const setRoleInfo = useGameStore((s) => s.setRoleInfo);
  const reset = useGameStore((s) => s.reset);

  const navigate = useNavigate();

  const [settings, setSettings] = useState<Settings>({ timer: DEFAULT_TIMER, showHint: true });
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const [players, setPlayers] = useState<PlayerStatus[]>([]);
  const [copied, setCopied] = useState(false);
  const [revealedCard, setRevealedCard] = useState<number | null>(null);
  const [selectedPileCard, setSelectedPileCard] = useState<number | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [cardCount, setCardCount] = useState(42);
  const [hostId, setHostId] = useState<string>("");

  // Connection strength state
  const [playerPings, setPlayerPings] = useState<Record<string, number | null>>({});

  // Long-press kick state
  const [shakingPlayerId, setShakingPlayerId] = useState<string | null>(null);
  const [kickConfirm, setKickConfirm] = useState<{ id: string; name: string } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // How to play modal state
  const [htpOpen, setHtpOpen] = useState(false);
  const [htpPulsing, setHtpPulsing] = useState(() => {
    return sessionStorage.getItem("wr_htp_seen") !== "true";
  });

  // Mount animation state
  const [mounted, setMounted] = useState(false);

  const readySetRef = useRef<Set<string>>(new Set());
  const settingsRef = useRef<Settings>(settings);

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [gridCards] = useState<GridCard[]>(shuffleGridCards);

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
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  // Responsive card count
  useEffect(() => {
    const update = () => setCardCount(getCardCount(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ===== CONNECTION QUALITY MEASUREMENT =====
  // Each client measures their own ping via volatile emit round-trip,
  // reports it to the server, and the server broadcasts the full
  // ping map to everyone in the room. Every player sees everyone's
  // real connection strength.
  useEffect(() => {
    if (!gameCode || !playerId) return;

    const measurePing = () => {
      const start = Date.now();
      // volatile = silently dropped if disconnected (no queuing = no fake latency)
      socket.volatile.emit("pingMeasure", { gameCode, playerId }, () => {
        const latency = Date.now() - start;
        // Report to server — server stores it and broadcasts full map to room
        socket.emit("reportPing", { gameCode, playerId, ping: latency });
      });
    };

    // Measure immediately, then every PING_INTERVAL
    measurePing();
    pingIntervalRef.current = setInterval(measurePing, PING_INTERVAL);

    // Server broadcasts the full ping map (all players) on every report.
    // This replaces ALL pings at once so everyone stays in sync.
    socket.on("playerPings", (data: Record<string, number>) => {
      setPlayerPings(data);
    });

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      socket.off("playerPings");
    };
  }, [gameCode, playerId]);

  // Fetch players, seed ready state, then rejoin
  useEffect(() => {
    if (!socket.connected) socket.connect();

    const init = async () => {
      if (!gameCode || !playerName || playerName === "Unknown") return;
      try {
        const res = await fetch(`${API_URL}/api/games/${gameCode}`);
        const data = await res.json();

        if (data.success && data.data.players) {
          if (data.data.host) setHostId(data.data.host);

          const rawReady = data.data.readyPlayers;
          if (Array.isArray(rawReady)) {
            for (const entry of rawReady) {
              if (entry?.ready && entry?.id) {
                readySetRef.current.add(entry.id);
              }
            }
          }

          setPlayers(
            data.data.players.map((p: { id: string; name: string }) => ({
              id: p.id,
              name: p.name,
              isReady: readySetRef.current.has(p.id),
            })),
          );

          if (readySetRef.current.has(playerId)) setPlayerReady(true);
        }

        if (gameCode && playerName) {
          const alreadyInGame = data.success && data.data.players?.some((p: { id: string }) => p.id === playerId);
          if (!alreadyInGame) {
            socket.emit("joinGame", { gameCode, playerName }, (response: { success: boolean; playerId?: string; error?: string }) => {
              if (response.success && response.playerId) {
                useGameStore.getState().setSession({
                  gameCode: gameCode,
                  playerId: response.playerId,
                  playerName: playerName,
                  isHost: false,
                });
              }
            });
          }
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
        reset();
        navigate("/");
      } else {
        readySetRef.current.delete(data.kickedPlayerId);
        setPlayers((prev) => prev.filter((p) => p.id !== data.kickedPlayerId));
        setPlayerPings((prev) => {
          const next = { ...prev };
          delete next[data.kickedPlayerId];
          return next;
        });
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
      setPlayerPings((prev) => {
        const next = { ...prev };
        delete next[data.playerId];
        return next;
      });
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
      setPhase("role");
      navigate(`/role-reveal/${gameCode}`);
    });

    socket.on("roleReveal", (data: { playerId: string; roleName: string; roleTeam: string; roleDescription: string }) => {
      setRoleInfo({ roleName: data.roleName, roleTeam: data.roleTeam, roleDescription: data.roleDescription });
      setPhase("role");
      navigate(`/role-reveal/${gameCode}`);
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
    reset();
    navigate("/");
  }, [gameCode, playerId, navigate, reset]);

  const handleKickConfirm = useCallback(() => {
    if (!kickConfirm) return;
    socket.emit("kickPlayer", { gameCode, hostId: playerId, kickedPlayerId: kickConfirm.id });
    setKickConfirm(null);
  }, [gameCode, playerId, kickConfirm]);

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

  // Long press handlers for kick (host only, on other players)
  const handlePressStart = useCallback(
    (p: PlayerStatus) => {
      if (!isHost || p.id === playerId) return;
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

      longPressTimerRef.current = setTimeout(() => {
        // Trigger shake animation
        setShakingPlayerId(p.id);
        // Open kick confirmation modal
        setKickConfirm({ id: p.id, name: p.name });
        // Clear shake after animation
        setTimeout(() => setShakingPlayerId(null), 400);
      }, LONG_PRESS_DURATION);
    },
    [isHost, playerId],
  );

  const handlePressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

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
            {players.map((p, index) => {
              const signal = pingToSignal(playerPings[p.id] ?? null);
              const isShaking = shakingPlayerId === p.id;
              const canLongPress = isHost && p.id !== playerId;
              return (
                <div
                  key={p.id}
                  className={`wr-player-row wr-anim-player-row${isShaking ? " wr-player-row--shake" : ""}`}
                  style={{ "--player-index": index, cursor: canLongPress ? "grab" : "default" } as React.CSSProperties}
                  onMouseDown={() => handlePressStart(p)}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressEnd}
                  onTouchStart={() => handlePressStart(p)}
                  onTouchEnd={handlePressEnd}
                  onTouchCancel={handlePressEnd}
                  onContextMenu={(e) => {
                    if (canLongPress) e.preventDefault();
                  }}
                >
                  {/* Left: name (green if ready) + host crown */}
                  <div className="wr-player-info">
                    <span className={`wr-player-name ${p.isReady ? "wr-player-name--ready" : ""}`}>{p.name}</span>
                    {p.id === hostId && (
                      <span className="wr-host-badge" title="Host">
                        <Crown size={13} strokeWidth={1.8} />
                      </span>
                    )}
                  </div>

                  {/* Right: signal bars */}
                  <div className="wr-player-right">
                    <SignalBars level={signal} />
                  </div>
                </div>
              );
            })}
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

      {/* ===== KICK CONFIRMATION MODAL ===== */}
      {kickConfirm && (
        <div className="wr-kick-overlay" onClick={() => setKickConfirm(null)}>
          <div className="wr-kick-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="wr-kick-modal-title">KICK PLAYER</h3>
            <p className="wr-kick-modal-text">
              Are you sure you want to kick <span className="wr-kick-modal-name">{kickConfirm.name}</span>?
            </p>
            <div className="wr-kick-modal-buttons">
              <button className="wr-kick-modal-no" onClick={() => setKickConfirm(null)}>
                NO
              </button>
              <button className="wr-kick-modal-yes" onClick={handleKickConfirm}>
                YES, KICK
              </button>
            </div>
          </div>
        </div>
      )}

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
                <div className="wr-settings-toggle-row"></div>
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
