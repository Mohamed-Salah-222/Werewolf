import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
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

// ===== HELPERS =====

/** Build a card lookup from the shared allCards array */
const cardMap: Record<string, string> = Object.fromEntries(allCards.map((c) => [c.id, c.image]));

function getCardImage(roleName: string): string {
  return cardMap[roleName.toLowerCase()] || backCardImage;
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
    return info ? { roleName: info.roleName, roleTeam: info.roleTeam, roleDescription: info.roleDescription } : null;
  });

  // Refs to avoid stale closures and unnecessary effect re-runs
  const roleNameRef = useRef(role?.roleName ?? null);
  const pendingActiveRoleRef = useRef<string | null>(null);
  const pendingGroundCardsRef = useRef<Array<{ id: string; label: string }> | null>(null);

  // Keep roleNameRef in sync
  useEffect(() => {
    roleNameRef.current = role?.roleName ?? null;
  }, [role]);

  useLeaveWarning(true);

  // Socket listeners — no dependency on `role` since we use roleNameRef
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
    socket.emit("confirmRoleReveal", { gameCode, playerId });
  }, [gameCode, playerId]);

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

  // ===== MAIN RENDER =====
  return (
    <div className="rr-page">
      <div className="rr-vignette" />

      <div className="rr-content">
        {/* Top section — changes based on phase */}
        <div className="rr-top-section">
          {!flipped && (
            <>
              <p className="rr-warning">MAKE SURE NO ONE IS LOOKING</p>
              <h1 className="rr-heading">YOUR FATE AWAITS</h1>
              <p className="rr-sub-text">Tap the card to reveal your role</p>
            </>
          )}

          {flipped && (
            <>
              <h1 className="rr-heading">YOUR ROLE</h1>
              {confirmed && <p className="rr-waiting-text">Waiting for other players...</p>}
            </>
          )}
        </div>

        {/* Card */}
        <div className={`rr-card-container ${!flipped ? "rr-card-container--clickable" : ""}`} onClick={!flipped ? handleFlip : undefined}>
          <div className={`rr-card-inner ${flipped ? "rr-card-inner--flipped" : ""}`}>
            <div className="rr-card-face">
              <img src={backCardImage} alt="Card back" className="rr-card-img" />
            </div>
            <div className="rr-card-face rr-card-face--back">
              <img src={getCardImage(role.roleName)} alt={role.roleName} className="rr-card-img" />
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
    </div>
  );
}

export default RoleReveal;
