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

function DrunkAction({ onAction, playerId, players, groundCards, actionResult }: Props) {
  const isRejoin = !!actionResult;

  const [phase, setPhase] = useState<Phase>(isRejoin ? "done" : "idle");
  const [selectedGroundId, setSelectedGroundId] = useState<string | null>(null);
  const hasProcessedResult = useRef(isRejoin);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState<string | undefined>();

  // Refs for swap animation
  const selfSlotRef = useRef<HTMLDivElement | null>(null);
  const groundRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  // Process result
  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    hasProcessedResult.current = true;

    if (phase === "done") return;

    setPhase("swap");
    setTimeout(() => setPhase("done"), 1000);
  }, [actionResult, phase]);

  const handleGroundClick = (groundId: string) => {
    if (phase !== "idle") return;

    setSelectedGroundId(groundId);
    setPhase("submitted");
    onAction({ type: "drunk", targetRoleId: groundId });
  };

  // Modal handlers
  const openModal = useCallback((image: string, name: string, subtitle?: string) => {
    setModalImage(image);
    setModalName(name);
    setModalSubtitle(subtitle);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const isClickable = phase === "idle";

  // Swap animation offsets
  const [selfOffset, setSelfOffset] = useState<{ x: number; y: number } | null>(null);
  const [groundOffset, setGroundOffset] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (phase !== "swap" || !selectedGroundId) return;

    const selfEl = selfSlotRef.current;
    const groundEl = groundRefs.current[selectedGroundId];
    if (!selfEl || !groundEl) return;

    requestAnimationFrame(() => {
      const selfRect = selfEl.getBoundingClientRect();
      const groundRect = groundEl.getBoundingClientRect();

      const dx = groundRect.left - selfRect.left;
      const dy = groundRect.top - selfRect.top;

      requestAnimationFrame(() => {
        setSelfOffset({ x: dx, y: dy });
        setGroundOffset({ x: -dx, y: -dy });
      });
    });
  }, [phase, selectedGroundId]);

  const getSelfSwapStyle = (): React.CSSProperties => {
    if (phase === "swap" && selfOffset) {
      return {
        transform: `translate(calc(-50% + ${selfOffset.x}px), calc(-50% + ${selfOffset.y}px))`,
      };
    }
    return {};
  };

  const getGroundSwapStyle = (groundId: string): React.CSSProperties => {
    if (phase === "swap" && groundId === selectedGroundId && groundOffset) {
      return {
        transform: `translate(${groundOffset.x}px, ${groundOffset.y}px)`,
      };
    }
    return {};
  };

  return (
    <div className="dk-action">
      <div className="dk-circle-area">
        {/* Player cards around the circle */}
        {players.map((player, i) => {
          const isSelf = player.id === playerId;
          const pos = positions[i];
          const isSwapping = phase === "swap" && isSelf;

          return (
            <div
              key={player.id}
              ref={isSelf ? selfSlotRef : undefined}
              className={`dk-slot ${isSelf ? "dk-slot--self" : ""} ${isSwapping ? "dk-slot--swapping" : ""}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                ...(isSelf ? getSelfSwapStyle() : {}),
              }}
            >
              <span className={`dk-name ${isSelf ? "dk-name--self" : ""}`}>{isSelf ? "YOU" : player.name}</span>

              <div
                className={`dk-flip ${isSelf ? "dk-flip--up" : ""}${isSelf ? " dk-flip--tappable" : ""}`}
                onClick={
                  isSelf
                    ? (e) => {
                        e.stopPropagation();
                        openModal(getFullCardImage("drunk"), "Drunk", "You");
                      }
                    : undefined
                }
              >
                <div className="dk-flip-inner">
                  <div className="dk-flip-face dk-flip-face--back">
                    <img src={backCardImage} alt="Card back" draggable={false} />
                  </div>
                  <div className="dk-flip-face dk-flip-face--front">
                    <img src={isSelf ? getSquareImage("drunk") : backCardImage} alt={isSelf ? "Drunk" : "Card"} draggable={false} />
                  </div>
                </div>
              </div>

              {isSelf && phase !== "done" && <div className="dk-glow dk-glow--green dk-glow--subtle" />}
            </div>
          );
        })}

        {/* Ground cards in the center */}
        <div className="dk-ground">
          {groundCards.slice(0, 3).map((gc) => {
            const isSelected = gc.id === selectedGroundId;
            const isSwapping = phase === "swap" && isSelected;
            const canClick = isClickable;

            return (
              <div
                key={gc.id}
                ref={(el) => {
                  groundRefs.current[gc.id] = el;
                }}
                className={`dk-ground-card ${canClick ? "dk-ground-card--clickable" : ""} ${isSelected ? "dk-ground-card--selected" : ""} ${isSwapping ? "dk-ground-card--swapping" : ""}`}
                style={getGroundSwapStyle(gc.id)}
                onClick={() => canClick && handleGroundClick(gc.id)}
              >
                <div className="dk-flip dk-flip--ground">
                  <div className="dk-flip-inner">
                    <div className="dk-flip-face dk-flip-face--back">
                      <img src={backCardImage} alt="Ground card" draggable={false} />
                    </div>
                    <div className="dk-flip-face dk-flip-face--front">
                      <img src={backCardImage} alt="Ground card" draggable={false} />
                    </div>
                  </div>
                </div>

                {isSelected && (phase === "swap" || phase === "done") && <div className="dk-glow dk-glow--gold" />}
              </div>
            );
          })}
        </div>

        {/* Center messages */}
        {phase === "idle" && (
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
        {phase === "idle" && <span className="dk-bottom-hint">Tap a ground card to swap your role</span>}
        {phase === "submitted" && <span className="dk-bottom-status">SWAPPING...</span>}
        {phase === "swap" && <span className="dk-bottom-status">SWAPPING...</span>}
        {phase === "done" && <span className="dk-bottom-status dk-bottom-status--done">You swapped with a ground card</span>}
      </div>

      {/* Card Modal */}
      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} subtitle={modalSubtitle} />
    </div>
  );
}

export default DrunkAction;
