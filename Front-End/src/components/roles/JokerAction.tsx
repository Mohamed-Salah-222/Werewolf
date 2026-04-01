import { useState, useEffect, useRef, useCallback } from "react";
import { backCardImage } from "../../characters";
import { getSquareImage, getFullCardImage, getCirclePositions } from "../../utils/roleHelpers";
import CardModal from "../CardModal";
import "../roles/shared/RoleShared.css";
import "./JokerAction.css";

// ===== TYPES =====

interface JokerResult {
  groundRole: string;
  message?: string;
}

interface Props {
  onAction: (action: Record<string, unknown>) => void;
  locked?: boolean;
  playerId: string;
  players: Array<{ id: string; name: string }>;
  groundCards: Array<{ id: string; label: string }>;
  actionResult?: JokerResult | null;
}

// ===== COMPONENT =====

function JokerAction({ onAction, locked = false, playerId, players, groundCards, actionResult }: Props) {
  const isRejoin = !!actionResult;

  const [manuallySubmitted, setManuallySubmitted] = useState(false);
  const [selectedGroundId, setSelectedGroundId] = useState<string | null>(null);
  const [revealedRole, setRevealedRole] = useState<string>(isRejoin ? actionResult?.groundRole || "" : "");
  const submitted = manuallySubmitted || !!actionResult;
  const hasProcessedResult = useRef(isRejoin);
  const hasAutoModalFired = useRef(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState<string | undefined>();

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  const visibleGround = groundCards.slice(0, 3);

  // On rejoin, pick a random ground card to show as selected
  useEffect(() => {
    if (isRejoin && !selectedGroundId && visibleGround.length > 0) {
      const t = setTimeout(() => {
        const randomGround = visibleGround[Math.floor(Math.random() * visibleGround.length)];
        if (randomGround) {
          setSelectedGroundId(randomGround.id);
        }
      }, 0);
      return () => clearTimeout(t);
    }
  }, [isRejoin, selectedGroundId, visibleGround]);

  // Process result — handles auto-action (AFK) and manual action result arriving
  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    hasProcessedResult.current = true;

    const isAutoAction = !manuallySubmitted;

    // Auto-action: pick a random ground card visually
    if (isAutoAction && visibleGround.length > 0) {
      setTimeout(() => {
        const randomGround = visibleGround[Math.floor(Math.random() * visibleGround.length)];
        if (randomGround) {
          setSelectedGroundId(randomGround.id);
        }
      }, 0);
      // no return cleanup here — the rest of the effect still needs to run
    }

    // Reveal after a short delay for the flip animation
    if (actionResult.groundRole) {
      setTimeout(() => {
        setRevealedRole(actionResult.groundRole);
      }, 300);

      setTimeout(() => {
        if (hasAutoModalFired.current) return;
        hasAutoModalFired.current = true;
        setModalImage(getFullCardImage(actionResult.groundRole));
        setModalName(actionResult.groundRole);
        setModalSubtitle("Ground card");
        setModalOpen(true);
      }, 1200);
    }
  }, [actionResult, manuallySubmitted, visibleGround]);

  const handleGroundClick = (groundId: string) => {
    if (locked || submitted) return;

    setSelectedGroundId(groundId);
    setManuallySubmitted(true);
    onAction({ type: "joker", targetRoleId: groundId });
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

  const isClickable = !locked && !submitted;

  return (
    <div className="role-action">
      <div className="role-circle-area">
        {players.map((player, i) => {
          const isSelf = player.id === playerId;
          const pos = positions[i];

          return (
            <div key={player.id} className={`role-slot ${isSelf ? "role-slot--self" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              <span className={`role-name ${isSelf ? "role-name--self jk-name--self" : ""}`}>{isSelf ? "YOU" : player.name}</span>

              <div className={`role-flip ${isSelf ? "role-flip--up" : ""}${isSelf ? " role-flip--tappable" : ""}`} onClick={isSelf ? () => openModal(getFullCardImage("joker"), "Joker", "You") : undefined}>
                <div className="role-flip-inner">
                  <div className="role-flip-face role-flip-face--back">
                    <img src={backCardImage} alt="Card back" draggable={false} />
                  </div>
                  <div className="role-flip-face role-flip-face--front">
                    <img src={isSelf ? getSquareImage("joker") : backCardImage} alt={isSelf ? "Joker" : "Card"} draggable={false} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="role-ground">
          {visibleGround.map((gc) => {
            const isSelected = gc.id === selectedGroundId;
            const isRevealed = isSelected && !!revealedRole;
            const canClick = isClickable;

            return (
              <div key={gc.id} className={`role-ground-card ${canClick ? "role-ground-card--clickable jk-ground-card--clickable" : ""} ${isRevealed ? "role-ground-card--revealed" : ""}`} onClick={() => canClick && handleGroundClick(gc.id)}>
                <div
                  className={`role-flip role-flip--ground ${isRevealed ? "role-flip--up" : ""}${isRevealed ? " role-flip--tappable" : ""}`}
                  onClick={
                    isRevealed
                      ? (e) => {
                          e.stopPropagation();
                          openModal(getFullCardImage(revealedRole), revealedRole);
                        }
                      : undefined
                  }
                >
                  <div className="role-flip-inner">
                    <div className="role-flip-face role-flip-face--back">
                      <img src={backCardImage} alt="Ground card" draggable={false} />
                    </div>
                    <div className="role-flip-face role-flip-face--front">
                      <img src={isRevealed ? getSquareImage(revealedRole) : backCardImage} alt={isRevealed ? revealedRole : "Ground card"} draggable={false} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!submitted && !locked && (
          <div className="role-center-hint">
            <span className="role-hint-text">PEEK AT A GROUND CARD</span>
          </div>
        )}
        {submitted && !revealedRole && (
          <div className="role-center-hint">
            <span className="role-hint-text">PEEKING...</span>
          </div>
        )}
      </div>

      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} subtitle={modalSubtitle} />
    </div>
  );
}

export default JokerAction;
