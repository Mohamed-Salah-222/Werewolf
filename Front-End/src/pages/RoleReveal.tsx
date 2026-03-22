import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket from "../socket";
import { API_URL } from "../config";
import { useGameStore } from "../store/gameStore";
import { allCards, backCardImage } from "../characters";
import "./RoleReveal.css";

// ===== TYPES =====

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
  const navigate = useNavigate();

  const playerName = useGameStore((s) => s.playerName) || "Unknown";
  const playerId = useGameStore((s) => s.playerId) || "";
  const isHost = useGameStore((s) => s.isHost);
  const storeRoleName = useGameStore((s) => s.roleName);
  const storeRoleTeam = useGameStore((s) => s.roleTeam);
  const storeRoleDescription = useGameStore((s) => s.roleDescription);
  const hasConfirmedRoleStore = useGameStore((s) => s.hasConfirmedRole);
  const setHasConfirmedRole = useGameStore((s) => s.setHasConfirmedRole);
  const setRoleInfo = useGameStore((s) => s.setRoleInfo);
  const setPhase = useGameStore((s) => s.setPhase);
  const setNightData = useGameStore((s) => s.setNightData);

  const [flipped, setFlipped] = useState(() => !!storeRoleName);
  const [confirmed, setConfirmed] = useState(hasConfirmedRoleStore);
  const [role, setRole] = useState<RoleInfo | null>(() => {
    return storeRoleName
      ? {
          roleName: storeRoleName,
          roleTeam: storeRoleTeam || "",
          roleDescription: storeRoleDescription || "",
        }
      : null;
  });

  const [playerStatuses, setPlayerStatuses] = useState<Array<{ id: string; name: string; confirmed: boolean }>>([]);
  const [showSlackers, setShowSlackers] = useState(false);
  const [showPhaseInfo, setShowPhaseInfo] = useState(false);

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
      console.log("playerRoleConfirmed received:", data);
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
        setRoleInfo({ roleName: data.roleName, roleTeam: data.roleTeam, roleDescription: data.roleDescription });
      }
    });

    socket.on("roleActionQueue", (roleName: string) => {
      pendingActiveRoleRef.current = roleName;
      useGameStore.getState().setInitialActiveRole(roleName);
    });

    socket.on("groundCards", (data: { cards: Array<{ id: string; label: string }> }) => {
      pendingGroundCardsRef.current = data.cards;
      useGameStore.getState().setGroundCards(data.cards);
    });

    socket.on("nightStarted", (roleQueue: { roleName: string; seconds: number }[]) => {
      setNightData({
        roleQueue,
        initialActiveRole: pendingActiveRoleRef.current,
        groundCards: pendingGroundCardsRef.current || [],
      });
      setPhase("night");
      setTimeout(() => {
        navigate(`/night/${gameCode}`);
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
    setFlipped((prev) => !prev);
  }, []);

  const handleConfirm = useCallback(() => {
    setConfirmed(true);
    setHasConfirmedRole(true);
    setPlayerStatuses((prev) => prev.map((p) => (p.id === playerId ? { ...p, confirmed: true } : p)));
    socket.emit("confirmRoleReveal", { gameCode, playerId });
  }, [gameCode, playerId, setHasConfirmedRole]);

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
        {/* Status bar */}
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
            <button className="rr-info-btn rr-info-btn--slackers" onClick={() => setShowSlackers(true)} aria-label="Show unready players">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </button>
          )}
          <button className="rr-info-btn rr-info-btn--hint" onClick={() => setShowPhaseInfo(true)} aria-label="Phase info">
            !
          </button>
        </div>

        {!flipped && <p className="rr-sub-text">Tap to reveal your role</p>}
        {flipped && !confirmed && <p className="rr-sub-text">Tap card again to hide it</p>}
        {flipped && confirmed && <p className="rr-waiting-text">Waiting for other players</p>}

        {/* Card with flip */}
        <div className="rr-card-container rr-card-container--clickable" onClick={handleFlip}>
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

      {/* Phase info modal */}
      {showPhaseInfo && (
        <div className="rr-modal-overlay" onClick={() => setShowPhaseInfo(false)}>
          <div className="rr-phase-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rr-phase-header">
              <h2 className="rr-phase-title">ROLE REVEAL</h2>
              <button className="rr-phase-close" onClick={() => setShowPhaseInfo(false)}>
                ✕
              </button>
            </div>
            <div className="rr-phase-body">
              <p className="rr-phase-flavor">Everyone secretly discovers who they are. Remember your role you'll need it.</p>

              <div className="rr-phase-item">
                <div>
                  <span className="rr-phase-item-title"> 👁️👁️ REVEAL YOUR ROLE</span>
                  <p className="rr-phase-item-desc">Tap the face-down card to flip it and see which role you've been assigned. This is your identity for the round.</p>
                </div>
              </div>

              <div className="rr-phase-item">
                <div>
                  <span className="rr-phase-item-title"> 🫣 HIDE YOUR CARD</span>
                  <p className="rr-phase-item-desc">Tap the card again to flip it back face-down. Useful if someone nearby is peeking at your screen.</p>
                </div>
              </div>

              <div className="rr-phase-item">
                <div>
                  <span className="rr-phase-item-title"> ✅ CONFIRM READY</span>
                  <p className="rr-phase-item-desc">Once you've memorized your role, hit the "I'M READY" button. The night phase begins when everyone confirms.</p>
                </div>
              </div>

              <div className="rr-phase-item">
                <div>
                  <span className="rr-phase-item-title"> 🔢 PLAYER COUNTER</span>
                  <p className="rr-phase-item-desc">The status bar shows how many players have confirmed. The red button reveals who's still not ready.</p>
                </div>
              </div>

              <div className="rr-phase-item">
                <div>
                  <span className="rr-phase-item-title"> 🤫 KEEP IT SECRET</span>
                  <p className="rr-phase-item-desc">Don't tell anyone your role. Not yet. The lying, bluffing, and accusing comes later during discussion.</p>
                </div>
              </div>
            </div>
            <div className="rr-phase-footer">
              <button className="rr-phase-dismiss" onClick={() => setShowPhaseInfo(false)}>
                GOT IT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoleReveal;
