import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import { useLeaveWarning } from "../hooks/useLeaveWarning";
import "./RoleReveal.css";

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

const cardMap: { [key: string]: string } = {
  werewolf: werewolfCard,
  minion: minionCard,
  seer: seerCard,
  robber: robberCard,
  troublemaker: troublemakerCard,
  mason: masonCard,
  drunk: drunkCard,
  insomniac: insomniacCard,
  clone: cloneCard,
  joker: jokerCard,
};

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

function RoleReveal() {
  const { gameCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const playerName = state?.playerName || "Unknown";
  const playerId = state?.playerId || "";
  const isHost = state?.isHost || false;

  const [flipped, setFlipped] = useState(false);
  const [confirmed, setConfirmed] = useState(state?.hasConfirmedRole || false);

  const [role, setRole] = useState<RoleInfo | null>(() => {
    const rejoinInfo = state?.rejoinRoleInfo;
    if (rejoinInfo) {
      return {
        roleName: rejoinInfo.roleName,
        roleTeam: rejoinInfo.roleTeam,
        roleDescription: rejoinInfo.roleDescription,
      };
    }
    return null;
  });

  useLeaveWarning(true);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    let pendingActiveRole: string | null = null;
    let pendingGroundCards: Array<{ id: string; label: string }> | null = null;

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
      pendingActiveRole = roleName;
    });

    socket.on("groundCards", (data: { cards: Array<{ id: string; label: string }> }) => {
      pendingGroundCards = data.cards;
    });

    socket.on("nightStarted", () => {
      setTimeout(() => {
        navigate(`/night/${gameCode}`, {
          state: {
            playerName,
            playerId,
            isHost,
            roleName: role?.roleName,
            initialActiveRole: pendingActiveRole,
            initialGroundCards: pendingGroundCards,
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
  }, [gameCode, playerId, navigate, playerName, isHost, role]);

  const handleFlip = () => {
    setFlipped(true);
  };

  const handleConfirm = () => {
    setConfirmed(true);
    socket.emit("confirmRoleReveal", { gameCode, playerId });
  };

  const getCardImage = (roleName: string): string => {
    return cardMap[roleName.toLowerCase()] || backCard;
  };

  // Waiting for role data
  if (!role) {
    return (
      <div style={styles.page} className="rr-page">
        <div style={styles.vignette} />
        <div style={styles.center}>
          <h1 style={styles.loadingTitle}>ASSIGNING ROLES</h1>
          <p style={styles.loadingText}>The fates are being decided...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page} className="rr-page">
      <div style={styles.vignette} />

      <div style={styles.content} className="rr-content">
        {/* Title */}
        {!flipped && (
          <div style={styles.topSection}>
            <p style={styles.warningText}>MAKE SURE NO ONE IS LOOKING</p>
            <h1 style={styles.heading}>YOUR FATE AWAITS</h1>
            <p style={styles.subText}>Tap the card to reveal your role</p>
          </div>
        )}

        {flipped && !confirmed && (
          <div style={styles.topSection}>
            <h1 style={styles.heading}>YOUR ROLE</h1>
          </div>
        )}

        {flipped && confirmed && (
          <div style={styles.topSection}>
            <h1 style={styles.heading}>YOUR ROLE</h1>
            <p style={styles.waitingText}>Waiting for other players...</p>
          </div>
        )}

        {/* Card */}
        <div style={styles.cardContainer} className="rr-card" onClick={!flipped ? handleFlip : undefined}>
          <div
            style={{
              ...styles.cardInner,
              transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
              cursor: !flipped ? "pointer" : "default",
            }}
          >
            {/* Front = back of card */}
            <div style={styles.cardFace}>
              <img src={backCard} alt="Card back" style={styles.cardImg} />
              {/* {!flipped && <div style={styles.tapOverlay}>TAP TO REVEAL</div>} */}
            </div>

            {/* Back = role card */}
            <div style={styles.cardFaceBack}>
              <img src={getCardImage(role.roleName)} alt={role.roleName} style={styles.cardImg} />
            </div>
          </div>
        </div>

        {/* Confirm button */}
        {flipped && !confirmed && (
          <button style={styles.confirmBtn} onClick={handleConfirm}>
            I'M READY
          </button>
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
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(ellipse at 50% 40%, #1a0a0a 0%, #0a0a0a 50%, #000 100%)",
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
  center: {
    position: "relative",
    zIndex: 10,
    textAlign: "center" as const,
  },
  loadingTitle: {
    fontSize: "24px",
    fontWeight: 700,
    letterSpacing: "8px",
    color: "#c9a84c",
    textShadow: "0 0 30px rgba(201,168,76,0.2)",
    marginBottom: "12px",
  },
  loadingText: {
    fontSize: "14px",
    color: "#5a4a30",
    fontFamily: "'Georgia', serif",
    fontStyle: "italic",
  },

  content: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "24px",
  },

  topSection: {
    textAlign: "center" as const,
  },
  warningText: {
    fontSize: "11px",
    letterSpacing: "4px",
    color: "#c41e1e",
    marginBottom: "8px",
  },
  heading: {
    fontSize: "28px",
    fontWeight: 700,
    letterSpacing: "8px",
    color: "#c9a84c",
    margin: 0,
    textShadow: "0 0 30px rgba(201,168,76,0.2)",
  },
  subText: {
    fontSize: "13px",
    color: "#5a4a30",
    fontFamily: "'Georgia', serif",
    fontStyle: "italic",
    marginTop: "8px",
  },
  waitingText: {
    fontSize: "13px",
    color: "#4a8a4a",
    fontFamily: "'Georgia', serif",
    fontStyle: "italic",
    marginTop: "8px",
  },

  // Card flip
  cardContainer: {
    width: "280px",
    height: "420px",
    perspective: "1200px",
  },
  cardInner: {
    position: "relative" as const,
    width: "100%",
    height: "100%",
    transition: "transform 0.8s ease",
    transformStyle: "preserve-3d" as const,
  },
  cardFace: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden" as const,
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 10px 40px rgba(0,0,0,0.8), 0 0 60px rgba(201,168,76,0.1)",
  },
  cardFaceBack: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden" as const,
    transform: "rotateY(180deg)",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 10px 40px rgba(0,0,0,0.8), 0 0 60px rgba(201,168,76,0.15)",
  },
  cardImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    display: "block",
  },
  tapOverlay: {
    position: "absolute" as const,
    bottom: "20px",
    left: 0,
    right: 0,
    textAlign: "center" as const,
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "4px",
    color: "#c9a84c",
    fontFamily: "'Cinzel', serif",
    textShadow: "0 0 10px rgba(0,0,0,0.8)",
    animation: "pulse 2s ease-in-out infinite",
  },

  confirmBtn: {
    padding: "14px 48px",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "4px",
    backgroundColor: "#c9a84c",
    color: "#0a0a0a",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "'Cinzel', serif",
    marginTop: "8px",
  },
};

export default RoleReveal;
