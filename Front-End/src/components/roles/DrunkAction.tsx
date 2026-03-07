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

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  // Process result — trigger swap animation
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
  const swapped = phase === "swap" || phase === "done";

  return (
    <div className="dk-action">
      <div className="dk-circle-area">
        {/* Player cards around the circle */}
        {players.map((player, i) => {
          const isSelf = player.id === playerId;
          const pos = positions[i];

          // After swap: self slot shows a face-down card (the ground card that moved here)
          // Before swap: self slot shows the drunk face-up
          const showDrunkFace = isSelf && !swapped;
          const showGroundCardHere = isSelf && swapped;

          return (
            <div
              key={player.id}
              className={`dk-slot ${isSelf ? "dk-slot--self" : ""}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
              }}
            >
              <span className={`dk-name ${isSelf ? "dk-name--self" : ""}`}>{isSelf ? "YOU" : player.name}</span>

              {isSelf ? (
                showGroundCardHere ? (
                  /* After swap: face-down ground card sits at player position */
                  <div className="dk-flip dk-card-arrive">
                    <div className="dk-flip-inner">
                      <div className="dk-flip-face dk-flip-face--back">
                        <img src={backCardImage} alt="Unknown role" draggable={false} />
                      </div>
                      <div className="dk-flip-face dk-flip-face--front">
                        <img src={backCardImage} alt="Unknown role" draggable={false} />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Before swap: drunk card face-up */
                  <div className={`dk-flip dk-flip--up dk-flip--tappable`} onClick={() => openModal(getFullCardImage("drunk"), "Drunk", "You")}>
                    <div className="dk-flip-inner">
                      <div className="dk-flip-face dk-flip-face--back">
                        <img src={backCardImage} alt="Card back" draggable={false} />
                      </div>
                      <div className="dk-flip-face dk-flip-face--front">
                        <img src={getSquareImage("drunk")} alt="Drunk" draggable={false} />
                      </div>
                    </div>
                  </div>
                )
              ) : (
                /* Other players: always face-down */
                <div className="dk-flip">
                  <div className="dk-flip-inner">
                    <div className="dk-flip-face dk-flip-face--back">
                      <img src={backCardImage} alt="Card back" draggable={false} />
                    </div>
                    <div className="dk-flip-face dk-flip-face--front">
                      <img src={backCardImage} alt="Card" draggable={false} />
                    </div>
                  </div>
                </div>
              )}

              {isSelf && !swapped && <div className="dk-glow dk-glow--green dk-glow--subtle" />}
            </div>
          );
        })}

        {/* Ground cards in the center */}
        <div className="dk-ground">
          {groundCards.slice(0, 3).map((gc) => {
            const isSelected = gc.id === selectedGroundId;
            const canClick = isClickable;

            // After swap: selected ground card shows the drunk face-up, others stay face-down
            const showDrunkHere = isSelected && swapped;

            return (
              <div key={gc.id} className={`dk-ground-card ${canClick ? "dk-ground-card--clickable" : ""} ${isSelected ? "dk-ground-card--selected" : ""}`} onClick={() => canClick && handleGroundClick(gc.id)}>
                {showDrunkHere ? (
                  /* After swap: drunk card appears here face-up */
                  <div
                    className="dk-flip dk-flip--ground dk-flip--up dk-flip--tappable dk-card-arrive"
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal(getFullCardImage("drunk"), "Drunk");
                    }}
                  >
                    <div className="dk-flip-inner">
                      <div className="dk-flip-face dk-flip-face--back">
                        <img src={backCardImage} alt="Card back" draggable={false} />
                      </div>
                      <div className="dk-flip-face dk-flip-face--front">
                        <img src={getSquareImage("drunk")} alt="Drunk" draggable={false} />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Normal: face-down ground card */
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
                )}

                {showDrunkHere && <div className="dk-glow dk-glow--gold" />}
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
