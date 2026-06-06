import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, CircleHelp } from "lucide-react";
import socket from "../socket";
import { useGameStore } from "../store/gameStore";
import HowToPlay from "../components/HowToPlay";
import ShareButton from "../components/ShareButton";
import "./WaitingRoom.css";
import { gameActions } from "../store/sockets";

// ===== CONSTANTS =====

const MIN_PLAYERS = 6;
const PING_INTERVAL = 4000;
const SIGNAL_GREAT = 100;
const SIGNAL_GOOD = 200;
const SIGNAL_OKAY = 400;

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

type SignalLevel = 0 | 1 | 2 | 3 | 4;

// ===== HELPERS =====

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
  const gameCode = useGameStore((s) => s.gameCode) || "";
  const playerName = useGameStore((s) => s.playerName) || "Unknown";
  const playerId = useGameStore((s) => s.playerId) || "";
  const isHost = useGameStore((s) => s.isHost);
  const phase = useGameStore((s) => s.phase);
  const players = useGameStore((s) => s.players);
  const reset = useGameStore((s) => s.reset);

  const navigate = useNavigate();

  const [settings, setSettings] = useState<Settings>({ timer: DEFAULT_TIMER, showHint: true });
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const [copied, setCopied] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [hostTransferMsg, setHostTransferMsg] = useState<string | null>(null);
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null);
  const [htpOpen, setHtpOpen] = useState(false);
  const [htpPulsing, setHtpPulsing] = useState(() => {
    return sessionStorage.getItem("wr_htp_seen") !== "true";
  });
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState("");
  const [mounted, setMounted] = useState(false);

  const settingsRef = useRef<Settings>(settings);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mount animation
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      if (startErrorTimeoutRef.current) clearTimeout(startErrorTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, []);

  // Ping measurement (data comes back via snapshot players[].ping)
  useEffect(() => {
    if (!gameCode || !playerId) return;

    const measurePing = () => {
      const start = Date.now();
      socket.volatile.emit("pingMeasure", { gameCode, playerId }, () => {
        const latency = Date.now() - start;
        socket.emit("reportPing", { gameCode, playerId, ping: latency });
      });
    };

    measurePing();
    pingIntervalRef.current = setInterval(measurePing, PING_INTERVAL);

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [gameCode, playerId]);

  // Error listener for server-side errors
  useEffect(() => {
    const onError = (data: { message: string }) => {
      setStartError(data.message);
      if (startErrorTimeoutRef.current) clearTimeout(startErrorTimeoutRef.current);
      startErrorTimeoutRef.current = setTimeout(() => setStartError(null), 3000);
    };

    socket.on("error", onError);
    return () => {
      socket.off("error", onError);
    };
  }, []);

  // Host transfer notification
  useEffect(() => {
    const onTransfer = (data: { message: string }) => {
      setHostTransferMsg(data.message);
    };
    socket.on("hostTransferred", onTransfer);
    return () => {
      socket.off("hostTransferred", onTransfer);
    };
  }, []);

  // Phase watcher — navigate when game transitions
  useEffect(() => {
    if (phase !== "waiting" && phase !== "home" && gameCode) {
      const routeMap: Record<string, string> = {
        role: "role-reveal",
        night: "night",
        discussion: "discussion",
        vote: "vote",
        results: "results",
      };
      const route = routeMap[phase];
      if (route) {
        navigate(`/${route}/${gameCode}`);
      }
    }
  }, [phase, gameCode, navigate]);

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
    gameActions.startGame({ gameCode, playerId });
  }, [players, gameCode, playerId]);

  const handleUpdateSettings = useCallback(() => {
    gameActions.settingsUpdate({ gameCode, playerId, settings: settingsRef.current });
    setSettingsModalOpen(false);
  }, [gameCode, playerId]);

  const handleLeave = useCallback(() => {
    gameActions.leaveGame({ gameCode, playerId });
    reset();
    navigate("/");
  }, [gameCode, playerId, navigate, reset]);

  const handleReady = useCallback(() => {
    const currentReady = players.find((p) => p.id === playerId)?.isReady ?? false;
    gameActions.playerReady({ gameCode, playerId, ready: !currentReady });
  }, [players, gameCode, playerId]);

  const handleHintClick = useCallback(() => {
    setHtpOpen(true);
    if (htpPulsing) {
      setHtpPulsing(false);
      sessionStorage.setItem("wr_htp_seen", "true");
    }
  }, [htpPulsing]);

  const handleKick = useCallback(
    (kickedId: string) => {
      gameActions.kickPlayer({ gameCode, hostId: playerId, kickedPlayerId: kickedId });
      setKickTarget(null);
    },
    [gameCode, playerId],
  );

  const handleRenameOpen = useCallback(() => {
    setRenameValue(playerName);
    setRenameError("");
    setRenameModalOpen(true);
  }, [playerName]);

  const handleRenameSubmit = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed.length < 2) {
      setRenameError("Name must be at least 2 characters");
      return;
    }
    if (trimmed.length > 20) {
      setRenameError("Name must be 20 characters or less");
      return;
    }
    gameActions.changeName({ gameCode, playerId, newName: trimmed });
    sessionStorage.setItem("werewolf_playerName", trimmed);
    setRenameModalOpen(false);
  }, [renameValue, gameCode, playerId]);

  // ===== DERIVED =====

  const currentReady = players.find((p) => p.id === playerId)?.isReady ?? false;
  const canStart = players.length >= MIN_PLAYERS && players.every((p) => p.isReady);
  const notReadyCount = players.filter((p) => !p.isReady).length;
  const needMore = MIN_PLAYERS - players.length;
  const startButtonText = needMore > 0 ? `NEED ${needMore} MORE` : canStart ? "START GAME" : `${notReadyCount} NOT READY`;

  // ===== RENDER =====

  return (
    <div className={`wr-page ${mounted ? "wr-page--mounted" : ""}`}>
      <div className="wr-vignette" />

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
            <CircleHelp size={34} strokeWidth={1.5} />
          </button>
        </div>

        {hostTransferMsg && (
          <div className="wr-host-transfer-banner">
            {hostTransferMsg}
          </div>
        )}

        <div className="wr-code-section wr-anim-code">
          <span className="wr-code-label">GAME CODE</span>
          <button className="wr-code-button" onClick={handleCopyCode}>
            <span className="wr-code-text">{gameCode?.toUpperCase()}</span>
            <span className="wr-copy-hint">{copied ? "COPIED!" : "TAP TO COPY"}</span>
          </button>
          <ShareButton gameCode={gameCode || ""} />
        </div>

        <div className="wr-player-section wr-anim-players">
          <span className="wr-player-count">PLAYERS {players.length}/12</span>
          <div className="wr-player-list">
            {players.map((p, index) => {
              const signal = pingToSignal(p.ping === 0 ? null : p.ping);
              const isMe = p.id === playerId;
              const showKickDots = isHost && !isMe;

              return (
                <div key={p.id} className="wr-player-row wr-anim-player-row" style={{ "--player-index": index } as React.CSSProperties}>
                  <div className="wr-player-info">
                    <span className={`wr-player-name ${p.isReady ? "wr-player-name--ready" : ""}`}>{p.name}</span>
                    {p.isHost && (
                      <span className="wr-host-badge" title="Host">
                        <Crown size={13} strokeWidth={1.8} />
                      </span>
                    )}
                  </div>
                  <div className="wr-player-right">
                    <SignalBars level={signal} />
                    {isMe && (
                      <button className="wr-dots-btn" onClick={handleRenameOpen} aria-label="Change name">
                        ⋮
                      </button>
                    )}
                    {showKickDots && (
                      <button className="wr-dots-btn" onClick={() => setKickTarget({ id: p.id, name: p.name })} aria-label="Kick player">
                        ⋮
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="wr-actions wr-anim-actions">
          {startError && <div className="wr-error-message">{startError}</div>}
          {isHost && (
            <button className="wr-start-btn" onClick={handleStartGame} disabled={!canStart}>
              {startButtonText}
            </button>
          )}
          <button className={`wr-ready-btn ${currentReady ? "wr-ready-btn--active" : ""}`} onClick={handleReady}>
            {currentReady ? "✓ READY" : "READY"}
          </button>
          <button className="wr-leave-btn" onClick={handleLeave}>
            LEAVE
          </button>
        </div>
      </div>

      {/* ===== KICK MODAL (silver theme) ===== */}
      {kickTarget && (
        <div className="wr-kick-overlay" onClick={() => setKickTarget(null)}>
          <div className="wr-kick-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="wr-kick-modal-title">KICK PLAYER</h3>
            <p className="wr-kick-modal-text">
              Remove <span className="wr-kick-modal-name">{kickTarget.name}</span> from the game?
            </p>
            <div className="wr-kick-modal-buttons">
              <button className="wr-kick-modal-no" onClick={() => setKickTarget(null)}>
                CANCEL
              </button>
              <button className="wr-kick-modal-yes" onClick={() => handleKick(kickTarget.id)}>
                KICK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== RENAME MODAL ===== */}
      {renameModalOpen && (
        <div className="wr-kick-overlay" onClick={() => setRenameModalOpen(false)}>
          <div className="wr-kick-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="wr-kick-modal-title">CHANGE NAME</h3>
            <input className="wr-rename-input" type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} maxLength={20} onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit()} autoFocus />
            {renameError && <p className="wr-rename-error">{renameError}</p>}
            <div className="wr-kick-modal-buttons">
              <button className="wr-kick-modal-no" onClick={() => setRenameModalOpen(false)}>
                CANCEL
              </button>
              <button className="wr-kick-modal-save" onClick={handleRenameSubmit}>
                SAVE
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

      {/* ===== HOW TO PLAY ===== */}
      {htpOpen && <HowToPlay onClose={() => setHtpOpen(false)} />}
    </div>
  );
}

export default WaitingRoom;
