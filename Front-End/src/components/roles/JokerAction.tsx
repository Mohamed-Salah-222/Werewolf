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
  const [submitted, setSubmitted] = useState(!!actionResult);
  const [selectedGroundId, setSelectedGroundId] = useState<string | null>(null);
  const [revealedRole, setRevealedRole] = useState<string>("");
  const hasProcessedResult = useRef(!!actionResult);
  const hasAutoModalFired = useRef(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState<string | undefined>();

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    hasProcessedResult.current = true;

    if (actionResult.groundRole) {
      setRevealedRole(actionResult.groundRole);

      setTimeout(() => {
        if (hasAutoModalFired.current) return;
        hasAutoModalFired.current = true;
        setModalImage(getFullCardImage(actionResult.groundRole));
        setModalName(actionResult.groundRole);
        setModalSubtitle("Ground card");
        setModalOpen(true);
      }, 1000);
    }
  }, [actionResult]);

  useEffect(() => {
    if (actionResult?.groundRole && !revealedRole) {
      setRevealedRole(actionResult.groundRole);
    }
  }, [actionResult, revealedRole]);

  const handleGroundClick = (groundId: string) => {
    if (submitted) return;

    setSelectedGroundId(groundId);
    setSubmitted(true);
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

              {isSelf && <div className="role-glow role-glow--subtle-gold" />}
            </div>
          );
        })}

        <div className="role-ground">
          {groundCards.slice(0, 3).map((gc) => {
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
                {isRevealed && <div className="role-glow role-glow--gold" />}
              </div>
            );
          })}
        </div>

        {!submitted && (
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

      <div className="role-bottom">{locked ? <span className="role-bottom-status">WAITING FOR YOUR TURN...</span> : !submitted ? <span className="role-bottom-hint">Tap a ground card to see what it is</span> : !revealedRole ? <span className="role-bottom-status">PEEKING...</span> : <span className="role-bottom-status role-bottom-status--done">You saw a {revealedRole}</span>}</div>

      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} subtitle={modalSubtitle} />
    </div>
  );
}

export default JokerAction;
