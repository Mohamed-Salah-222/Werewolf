import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import { API_URL } from "../config";
import { useLeaveWarning } from "../hooks/useLeaveWarning";
import { allCards, backCardImage } from "../characters";
import "./RoleReveal.css";

// ===== TYPES =====

interface LocationState {
  playerName: string;
  playerId: string;
  isHost: boolean;
  rejoinRoleInfo?: {
    roleName: string;
    roleTeam: string;
    roleDescription: string;
  } | null;
  hasConfirmedRole?: boolean;
}

interface RoleInfo {
  roleName: string;
  roleTeam: string;
  roleDescription: string;
}

// ===== HELPER =====

function getCardImage(roleName: string): string {
  const key = roleName.toLowerCase();
  const card = allCards.find((c) => c.id === key);
  return card?.image || "";
}

// ===== COMPONENT =====

function RoleReveal() {
  const { gameCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const playerName = state?.playerName || "Unknown";
  const playerId = state?.playerId || "";
  const isHost = state?.isHost || false;

  const [flipped, setFlipped] = useState(() => !!state?.rejoinRoleInfo);
  const [confirmed, setConfirmed] = useState(state?.hasConfirmedRole || false);
  const [role, setRole] = useState<RoleInfo | null>(() => {
    const info = state?.rejoinRoleInfo;
    return info
      ? {
          roleName: info.roleName,
          roleTeam: info.roleTeam,
          roleDescription: info.roleDescription,
        }
      : null;
  });

  const [playerStatuses, setPlayerStatuses] = useState<Array<{ id: string; name: string; confirmed: boolean }>>([]);
  const [showSlackers, setShowSlackers] = useState(false);

  // Refs to avoid stale closures and unnecessary effect re-runs
  const roleNameRef = useRef(role?.roleName ?? null);
  const pendingActiveRoleRef = useRef<string | null>(null);
  const pendingGroundCardsRef = useRef<Array<{
    id: string;
    label: string;
  }> | null>(null);

  // Keep roleNameRef in sync
  useEffect(() => {
    roleNameRef.current = role?.roleName ?? null;
  }, [role]);

  useLeaveWarning(true);

  // Fetch players + listen for confirmations
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await fetch(`${API_URL}/api/games/${gameCode}`);
        const data = await res.json();
        if (data.success && data.data.players) {
          const confirmedList: string[] = data.data.confirmedPlayerRoleReveal || [];
          setPlayerStatuses(
            data.data.players.map((p: { id: string; name: string }) => ({
              id: p.id,
              name: p.name,
              confirmed: confirmedList.includes(p.id),
            })),
          );
        }
      } catch (err) {
        console.error("Failed to fetch players", err);
      }
    };

    fetchPlayers();

    socket.on("playerRoleConfirmed", (data: { playerId: string }) => {
      setPlayerStatuses((prev) => prev.map((p) => (p.id === data.playerId ? { ...p, confirmed: true } : p)));
    });

    return () => {
      socket.off("playerRoleConfirmed");
    };
  }, [gameCode]);

  // Socket listeners
  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.on("roleReveal", (data: { playerId: string; roleName: string; roleTeam: string; roleDescription?: string }) => {
      if (data.playerId === playerId) {
        setRole({
          roleName: data.roleName,
          roleTeam: data.roleTeam,
          roleDescription: data.roleDescription || "",
        });
      }
    });

    socket.on("roleActionQueue", (roleName: string) => {
      pendingActiveRoleRef.current = roleName;
    });

    socket.on("groundCards", (data: { cards: Array<{ id: string; label: string }> }) => {
      pendingGroundCardsRef.current = data.cards;
    });

    socket.on("nightStarted", (roleQueue: { roleName: string; seconds: number }[]) => {
      setTimeout(() => {
        navigate(`/night/${gameCode}`, {
          state: {
            playerName,
            playerId,
            isHost,
            roleQueue,
            roleName: roleNameRef.current,
            initialActiveRole: pendingActiveRoleRef.current,
            initialGroundCards: pendingGroundCardsRef.current,
          },
        });
      }, 300);
    });

    return () => {
      socket.off("roleReveal");
      socket.off("nightStarted");
      socket.off("roleActionQueue");
      socket.off("groundCards");
    };
  }, [gameCode, playerId, navigate, playerName, isHost]);

  const handleFlip = useCallback(() => {
    setFlipped(true);
  }, []);

  const handleConfirm = useCallback(() => {
    setConfirmed(true);
    setPlayerStatuses((prev) => prev.map((p) => (p.id === playerId ? { ...p, confirmed: true } : p)));
    socket.emit("confirmRoleReveal", { gameCode, playerId });
  }, [gameCode, playerId]);

  // Derived counts
  const readyCount = playerStatuses.filter((p) => p.confirmed).length;
  const totalCount = playerStatuses.length;
  const notReady = playerStatuses.filter((p) => !p.confirmed);
  const allReady = totalCount > 0 && readyCount === totalCount;

  // ===== LOADING STATE =====
  if (!role) {
    return (
      <div className="rr-page">
        <div className="rr-vignette" />
        <div className="rr-loading">
          <h1 className="rr-loading-title">ASSIGNING ROLES</h1>
          <p className="rr-loading-text">The fates are being decided...</p>
        </div>
      </div>
    );
  }

  const cardImage = getCardImage(role.roleName);

  // ===== MAIN RENDER =====
  return (
    <div className="rr-page">
      <div className="rr-vignette" />

      <div className="rr-content">
        {/* Player status bar */}
        <div className="rr-status-bar">
          <div className={`rr-status-line ${allReady ? "rr-status-line--all-ready" : ""}`}>
            <span className="rr-status-label">Players</span>
            <span className="rr-status-count">
              <span className="rr-status-ready">{readyCount}</span>
              <span className="rr-status-separator">/</span>
              <span className="rr-status-total">{totalCount}</span>
            </span>
          </div>
          {notReady.length > 0 && (
            <button className="rr-info-btn" onClick={() => setShowSlackers(true)} aria-label="Show unready players">
              !
            </button>
          )}
        </div>

        {!flipped && <p className="rr-sub-text">Tap the card to reveal your role</p>}
        {flipped && confirmed && <p className="rr-waiting-text">Waiting for other players</p>}

        {/* Card with flip */}
        <div className={`rr-card-container ${!flipped ? "rr-card-container--clickable" : ""}`} onClick={!flipped ? handleFlip : undefined}>
          <div className={`rr-card-inner ${flipped ? "rr-card-inner--flipped" : ""}`}>
            {/* Front: card back */}
            <div className="rr-card-face rr-card-face--front">
              <img src={backCardImage} alt="Card back" className="rr-card-img" />
            </div>
            {/* Back: role card image */}
            <div className="rr-card-face rr-card-face--back">
              <img src={cardImage} alt={role.roleName} className="rr-card-img" />
            </div>
          </div>
        </div>

        {/* Confirm button */}
        {flipped && !confirmed && (
          <button className="rr-confirm-btn" onClick={handleConfirm}>
            I'M READY
          </button>
        )}
      </div>

      {/* Slackers modal */}
      {showSlackers && (
        <div className="rr-modal-overlay" onClick={() => setShowSlackers(false)}>
          <div className="rr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rr-modal-header">
              <span className="rr-modal-icon">💀</span>
              <h2 className="rr-modal-title">BRAIN DEAD</h2>
              <p className="rr-modal-subtitle">Still loading their last brain cell</p>
            </div>
            <div className="rr-modal-list">
              {notReady.map((p) => (
                <div key={p.id} className="rr-modal-player">
                  <span className="rr-modal-dot" />
                  <span className="rr-modal-name">{p.name}</span>
                </div>
              ))}
            </div>
            <button className="rr-modal-close" onClick={() => setShowSlackers(false)}>
              DISMISS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoleReveal;
