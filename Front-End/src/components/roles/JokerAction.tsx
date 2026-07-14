import { useState, useEffect, useRef, useCallback } from "react";
import { backCardImage } from "../../characters";
import { getSquareImage, getFullCardImage, getCirclePositions } from "../../utils/roleHelpers";
import CardModal from "../CardModal";
import "../roles/shared/RoleShared.css";
import "./JokerAction.css";

interface JokerResult {
  targetRoleId?: string;
  targetGroundIndex?: number;
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

function JokerAction({ locked = false, playerId, players, groundCards, actionResult }: Props) {
  const isRejoin = !!actionResult;
  const initialGroundIndex = typeof actionResult?.targetGroundIndex === "number" ? actionResult.targetGroundIndex : null;

  const [selectedGroundIndex, setSelectedGroundIndex] = useState<number | null>(initialGroundIndex);
  const [revealedRole, setRevealedRole] = useState<string>(isRejoin ? actionResult?.groundRole || "" : "");
  const hasProcessedResult = useRef(isRejoin);
  const hasAutoModalFired = useRef(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState<string | undefined>();

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  const visibleGround = groundCards.slice(0, 3);
  const submitted = !!actionResult;
  const resolvedGroundIndex = selectedGroundIndex ?? -1;

  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    hasProcessedResult.current = true;

    const resultGroundIndex =
      typeof actionResult.targetGroundIndex === "number"
        ? actionResult.targetGroundIndex
        : actionResult.targetRoleId
          ? visibleGround.findIndex((gc) => gc.id === actionResult.targetRoleId)
          : -1;

    if (resultGroundIndex >= 0 && resultGroundIndex < visibleGround.length) {
      setTimeout(() => setSelectedGroundIndex(resultGroundIndex), 0);
    }

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
  }, [actionResult, visibleGround]);

  const openModal = useCallback((image: string, name: string, subtitle?: string) => {
    setModalImage(image);
    setModalName(name);
    setModalSubtitle(subtitle);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

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
          {visibleGround.map((gc, idx) => {
            const isSelected = idx === resolvedGroundIndex;
            const isRevealed = isSelected && !!revealedRole;

            return (
              <div key={`${gc.id}-${idx}`} className={`role-ground-card ${isRevealed ? "role-ground-card--revealed" : ""}`}>
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
            <span className="role-hint-text">THE JOKE PICKS A CARD</span>
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
