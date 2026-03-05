import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import { API_URL } from "../config";
import { useLeaveWarning } from "../hooks/useLeaveWarning";
import { characters, backCardImage } from "../characters";
import GameCard from "../components/GameCard";
// import VoiceChat from "../components/VoiceChat";
import "./RoleReveal.css";

// ===== FULL ART IMPORTS =====
import werewolfArt from "../assets/werewolf_fullart.png";
import minionArt from "../assets/minion_fullart.png";
import seerArt from "../assets/seer_fullart.png";
import robberArt from "../assets/robber_fullart.png";
import troublemakerArt from "../assets/troublemaker_fullart.png";
import masonArt from "../assets/mason_fullart.png";
import drunkArt from "../assets/drunk_fullart.png";
import insomniacArt from "../assets/insomaniac_fullart.png";
import cloneArt from "../assets/clone_fullart.png";
import jokerArt from "../assets/joker_fullart.png";

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

// ===== CARD DATA PER ROLE =====

const cardDataMap: Record<string, { image: string; frameColor: string; panelColor: string; borderColor: string }> = {
  werewolf: { image: werewolfArt, frameColor: "#4a0e0e", panelColor: "#470d0d", borderColor: "#252525" },
  minion: { image: minionArt, frameColor: "#4a0e0e", panelColor: "#470d0d", borderColor: "#252525" },
  seer: { image: seerArt, frameColor: "#2a2a2a", panelColor: "#1e1e1e", borderColor: "#3a3a3a" },
  robber: { image: robberArt, frameColor: "#2a2a2a", panelColor: "#1e1e1e", borderColor: "#3a3a3a" },
  troublemaker: { image: troublemakerArt, frameColor: "#2a2a2a", panelColor: "#1e1e1e", borderColor: "#3a3a3a" },
  mason: { image: masonArt, frameColor: "#2a2a2a", panelColor: "#1e1e1e", borderColor: "#3a3a3a" },
  drunk: { image: drunkArt, frameColor: "#2a2a2a", panelColor: "#1e1e1e", borderColor: "#3a3a3a" },
  insomniac: { image: insomniacArt, frameColor: "#2a2a2a", panelColor: "#1e1e1e", borderColor: "#3a3a3a" },
  clone: { image: cloneArt, frameColor: "#2a2a2a", panelColor: "#1e1e1e", borderColor: "#3a3a3a" },
  joker: { image: jokerArt, frameColor: "#0e2a1a", panelColor: "#0a2015", borderColor: "#1a3a2a" },
};

function getCardProps(roleName: string) {
  const key = roleName.toLowerCase();
  const data = cardDataMap[key] || cardDataMap["werewolf"];
  const char = characters.find((c) => c.id === key);

  return {
    name: char?.name || roleName,
    ability: char?.ability || "",
    image: data.image,
    frameColor: data.frameColor,
    panelColor: data.panelColor,
    borderColor: data.borderColor,
  };
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

  const [playerStatuses, setPlayerStatuses] = useState<Array<{ id: string; name: string; confirmed: boolean }>>([]);

  // Refs to avoid stale closures and unnecessary effect re-runs
  const roleNameRef = useRef(role?.roleName ?? null);
  const pendingActiveRoleRef = useRef<string | null>(null);
  const pendingGroundCardsRef = useRef<Array<{ id: string; label: string }> | null>(null);

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

  const cardProps = getCardProps(role.roleName);

  // ===== MAIN RENDER =====
  return (
    <div className="rr-page">
      <div className="rr-vignette" />

      <div className="rr-content">
        {/* Voice Chat - temporarily disabled
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px", width: "clamp(200px, 60vw, 300px)" }}>
          <VoiceChat gameCode={gameCode || ""} playerId={playerId} />
        </div>
        */}

        {/* Top section */}
        <div className="rr-top-section">
          {!flipped && <p className="rr-sub-text">Tap the card to reveal your role</p>}

          <div className="rr-player-status-list">
            {playerStatuses.map((p) => (
              <span key={p.id} className={`rr-player-tag ${p.confirmed ? "rr-player-tag--ready" : ""}`}>
                {p.name}
              </span>
            ))}
          </div>

          {flipped && (
            <>
              <h1 className="rr-heading">YOUR ROLE</h1>
              {confirmed && <p className="rr-waiting-text">Waiting for other players</p>}
            </>
          )}
        </div>

        {/* Card with flip */}
        <div className={`rr-card-container ${!flipped ? "rr-card-container--clickable" : ""}`} onClick={!flipped ? handleFlip : undefined}>
          <div className={`rr-card-inner ${flipped ? "rr-card-inner--flipped" : ""}`}>
            {/* Front: card back */}
            <div className="rr-card-face">
              <img src={backCardImage} alt="Card back" className="rr-card-img" />
            </div>
            {/* Back: GameCard component */}
            <div className="rr-card-face rr-card-face--back rr-card-face--gamecard">
              <GameCard name={cardProps.name} ability={cardProps.ability} image={cardProps.image} frameColor={cardProps.frameColor} panelColor={cardProps.panelColor} borderColor={cardProps.borderColor} className="rr-gamecard" />
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
