import { useState, useEffect, useRef, useCallback } from "react";
import { characters, allCards, backCardImage } from "../../characters";
import CardModal from "../CardModal";
import "./DrunkAction.css";

// ===== TYPES =====

interface DrunkResult {
  success: boolean;
  message?: string;
}

interface Props {
  onAction: (action: Record<string, unknown>) => void;
  locked?: boolean;
  playerId: string;
  players: Array<{ id: string; name: string }>;
  groundCards: Array<{ id: string; label: string }>;
  actionResult?: DrunkResult | null;
}

// ===== HELPERS =====

function getSquareImage(roleName: string): string {
  const char = characters.find((c) => c.name.toLowerCase() === roleName.toLowerCase());
  return char?.square || backCardImage;
}

function getFullCardImage(roleName: string): string {
  const card = allCards.find((c) => c.name.toLowerCase() === roleName.toLowerCase());
  return card?.image || backCardImage;
}

function getCirclePositions(count: number, selfIndex: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const angleStep = 360 / count;

  for (let i = 0; i < count; i++) {
    const offset = (i - selfIndex + count) % count;
    const angleDeg = 270 + offset * angleStep;
    const angleRad = (angleDeg * Math.PI) / 180;

    positions.push({
      x: 50 + 44 * Math.cos(angleRad),
      y: 50 + 42 * Math.sin(angleRad),
    });
  }

  return positions;
}

type Phase = "idle" | "submitted" | "swap" | "done";

// ===== COMPONENT =====

function DrunkAction({ onAction, locked = false, playerId, players, groundCards, actionResult }: Props) {
  const isRejoin = !!actionResult;

  const [phase, setPhase] = useState<Phase>(isRejoin ? "done" : "idle");
  const [selectedGroundId, setSelectedGroundId] = useState<string | null>(null);
  const hasProcessedResult = useRef(isRejoin);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState<string | undefined>();

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const playerPositions = getCirclePositions(players.length, selfIndex);
  const selfPos = playerPositions[selfIndex];

  const visibleGround = groundCards.slice(0, 3);

  // Ground card positions as percentages within circle area
  const groundPositions: Array<{ x: number; y: number }> = visibleGround.map((_, idx) => {
    const spacing = 16;
    const startX = 50 - ((visibleGround.length - 1) * spacing) / 2;
    return { x: startX + idx * spacing, y: 50 };
  });

  const selectedGroundIndex = selectedGroundId ? visibleGround.findIndex((gc) => gc.id === selectedGroundId) : -1;

  // Process result — trigger swap animation
  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    hasProcessedResult.current = true;
    if (phase === "done") return;

    setPhase("swap");
    setTimeout(() => setPhase("done"), 900);
  }, [actionResult, phase]);

  const handleGroundClick = (groundId: string) => {
    if (locked || phase !== "idle") return;

    setSelectedGroundId(groundId);
    setPhase("submitted");
    onAction({ type: "drunk", targetRoleId: groundId });
  };

  const openModal = useCallback((image: string, name: string, subtitle?: string) => {
    setModalImage(image);
    setModalName(name);
    setModalSubtitle(subtitle);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const shouldSwap = phase === "swap" || phase === "done";

  // Position getters — exact same pattern as Troublemaker
  const getSelfPos = (): { x: number; y: number } => {
    if (shouldSwap && selectedGroundIndex >= 0) {
      return groundPositions[selectedGroundIndex];
    }
    return selfPos;
  };

  const getGroundPos = (idx: number): { x: number; y: number } => {
    if (shouldSwap && idx === selectedGroundIndex) {
      return selfPos;
    }
    return groundPositions[idx];
  };

  return (
    <div className="dk-action">
      <div className="dk-circle-area">
        {/* ===== Player slots ===== */}
        {players.map((player, i) => {
          const isSelf = player.id === playerId;
          const pos = isSelf ? getSelfPos() : playerPositions[i];
          const isSwapping = isSelf && shouldSwap;

          return (
            <div key={player.id} className={`dk-slot ${isSelf ? "dk-slot--self" : ""} ${isSwapping ? "dk-slot--swapping" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              <span className={`dk-name ${isSelf ? "dk-name--self" : ""}`}>{isSelf ? (shouldSwap ? "" : "YOU") : player.name}</span>

              <div className={`dk-card ${isSelf ? "dk-card--face dk-card--tappable" : ""}`} onClick={isSelf ? () => openModal(getFullCardImage("drunk"), "Drunk", "You") : undefined}>
                <img src={isSelf ? getSquareImage("drunk") : backCardImage} alt={isSelf ? "Drunk" : "Card back"} className="dk-card-img" draggable={false} />
              </div>

              {isSelf && !shouldSwap && <div className="dk-glow dk-glow--green dk-glow--subtle" />}
            </div>
          );
        })}

        {/* ===== Ground card slots ===== */}
        {visibleGround.map((gc, idx) => {
          const isSelected = gc.id === selectedGroundId;
          const canClick = !locked && phase === "idle";
          const pos = getGroundPos(idx);
          const isSwapping = isSelected && shouldSwap;

          return (
            <div key={gc.id} className={`dk-slot dk-slot--ground ${canClick ? "dk-slot--clickable" : ""} ${isSelected ? "dk-slot--selected" : ""} ${isSwapping ? "dk-slot--swapping" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }} onClick={() => canClick && handleGroundClick(gc.id)}>
              <span className={`dk-name ${isSwapping ? "dk-name--self" : ""}`}>{isSwapping ? "YOU" : "\u00A0"}</span>
              <div className="dk-card dk-card--ground">
                <img src={backCardImage} alt="Ground card" className="dk-card-img" draggable={false} />
              </div>

              {isSwapping && <div className="dk-glow dk-glow--gold" />}
            </div>
          );
        })}

        {/* ===== Center messages ===== */}
        {phase === "idle" && !locked && (
          <div className="dk-center-hint">
            <span className="dk-hint-text">PICK A GROUND CARD</span>
          </div>
        )}
        {phase === "swap" && (
          <div className="dk-center-message">
            <span className="dk-msg-text">SWAPPING...</span>
          </div>
        )}
        {phase === "done" && (
          <div className="dk-center-message">
            <span className="dk-msg-text">SWAPPED</span>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="dk-bottom">
        {locked ? (
          <span className="dk-bottom-status">WAITING FOR YOUR TURN...</span>
        ) : (
          <>
            {phase === "idle" && <span className="dk-bottom-hint">Tap a ground card to swap your role</span>}
            {phase === "submitted" && <span className="dk-bottom-status">SWAPPING...</span>}
            {phase === "swap" && <span className="dk-bottom-status">SWAPPING...</span>}
            {phase === "done" && <span className="dk-bottom-status dk-bottom-status--done">You swapped with a ground card</span>}
          </>
        )}
      </div>

      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} subtitle={modalSubtitle} />
    </div>
  );
}

export default DrunkAction;
