import { useState, useEffect, useRef, useCallback } from "react";
import { backCardImage } from "../../characters";
import { getSquareImage, getFullCardImage, getCirclePositions } from "../../utils/roleHelpers";
import CardModal from "../CardModal";
import "../roles/shared/RoleShared.css";
import "./MinionAction.css";

// ===== TYPES =====

interface MinionResult {
  werewolves: Array<{ id: string; name: string }>;
  message?: string;
}

interface Props {
  onAction: (action: Record<string, unknown>) => void;
  locked?: boolean;
  playerId: string;
  players: Array<{ id: string; name: string }>;
  actionResult?: MinionResult | null;
}

// ===== COMPONENT =====

function MinionAction({ onAction, locked = false, playerId, players, actionResult }: Props) {
  const [manuallySubmitted, setManuallySubmitted] = useState(!!actionResult);
  const submitted = manuallySubmitted || !!actionResult;
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [showNoWolves, setShowNoWolves] = useState(false);
  const hasProcessedResult = useRef(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState<string | undefined>();

  const [packModalOpen, setPackModalOpen] = useState(false);
  const [packWolves, setPackWolves] = useState<Array<{ name: string; image: string }>>([]);

  const hasAutoModalFired = useRef(false);

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    hasProcessedResult.current = true;

    if (actionResult.werewolves.length > 0) {
      const wwIds = actionResult.werewolves.map((w) => w.id);
      const totalFlipTime = 500 + (wwIds.length - 1) * 400;

      wwIds.forEach((id, i) => {
        setTimeout(
          () => {
            setRevealedIds((prev) => new Set([...prev, id]));
          },
          500 + i * 400,
        );
      });

      setTimeout(() => {
        if (hasAutoModalFired.current) return;
        hasAutoModalFired.current = true;

        if (actionResult.werewolves.length === 1) {
          const wolf = actionResult.werewolves[0];
          setModalImage(getFullCardImage("werewolf"));
          setModalName("Werewolf");
          setModalSubtitle(wolf.name);
          setModalOpen(true);
        } else {
          const wolves = actionResult.werewolves.map((w) => ({
            name: w.name,
            image: getFullCardImage("werewolf"),
          }));
          setPackWolves(wolves);
          setPackModalOpen(true);
        }
      }, totalFlipTime + 600);
    } else {
      setTimeout(() => {
        setShowNoWolves(true);
      }, 500);
    }
  }, [actionResult]);

  const handleAction = () => {
    setManuallySubmitted(true);
    onAction({ type: "minion" });
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

  return (
    <div className="role-action">
      <div className="role-circle-area">
        {players.map((player, i) => {
          const pos = positions[i];
          const isSelf = player.id === playerId;
          const isRevealed = revealedIds.has(player.id);
          const isFaceUp = isSelf || isRevealed;

          return (
            <div key={player.id} className={`role-slot ${isSelf ? "role-slot--self" : ""} ${isRevealed ? "role-slot--revealed" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              <span className={`role-name ${isSelf ? "role-name--self mn-name--self" : ""} ${isRevealed ? "mn-name--wolf" : ""}`}>{isSelf ? "YOU" : player.name}</span>

              <div className={`role-flip ${isFaceUp ? "role-flip--up" : ""} ${isSelf || (isFaceUp && !locked) ? "role-flip--tappable" : ""}`} onClick={isSelf ? () => openModal(getFullCardImage("minion"), "Minion", "You") : isFaceUp && !locked ? () => openModal(getFullCardImage("werewolf"), "Werewolf", player.name) : undefined}>
                <div className="role-flip-inner">
                  <div className="role-flip-face role-flip-face--back">
                    <img src={backCardImage} alt="Card back" draggable={false} />
                  </div>
                  <div className="role-flip-face role-flip-face--front">
                    <img src={isSelf ? getSquareImage("minion") : isRevealed ? getSquareImage("werewolf") : backCardImage} alt={isSelf ? "Minion" : isRevealed ? "Werewolf" : "Card"} draggable={false} />
                  </div>
                </div>
              </div>

              {isRevealed && <div className="role-glow role-glow--red" />}
              {isSelf && <div className="role-glow role-glow--subtle-red" />}
            </div>
          );
        })}

        {showNoWolves && (
          <div className="role-center-message">
            <span className="role-no-result-icon">☽</span>
            <span className="role-no-result-text">NO WEREWOLVES</span>
            <span className="role-no-result-sub">You're on your own</span>
          </div>
        )}

        {revealedIds.size > 0 && (
          <div className="role-center-message">
            <span className="role-status-text role-status-text--red">YOUR MASTERS</span>
          </div>
        )}
      </div>

      <div className="role-bottom">
        {locked ? (
          <span className="role-bottom-status">WAITING FOR YOUR TURN...</span>
        ) : !submitted ? (
          <button className="role-btn" onClick={handleAction}>
            SEE WEREWOLVES
          </button>
        ) : !actionResult ? (
          <span className="role-bottom-status">LOOKING...</span>
        ) : (
          <span className="role-bottom-status role-bottom-status--done">{actionResult.werewolves.length > 0 ? "Serve them well" : "No wolves to serve"}</span>
        )}
      </div>

      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} subtitle={modalSubtitle} />

      {packModalOpen && (
        <div className="role-pack-overlay" onClick={() => setPackModalOpen(false)}>
          <div className="role-pack-modal" onClick={(e) => e.stopPropagation()}>
            <span className="role-pack-title role-pack-title--red">YOUR MASTERS</span>
            <div className="role-pack-cards">
              {packWolves.map((wolf, i) => (
                <div key={i} className="role-pack-card">
                  <span className="role-pack-name">{wolf.name}</span>
                  <img src={wolf.image} alt={wolf.name} className="role-pack-img role-pack-img--red" />
                </div>
              ))}
            </div>
            <button className="role-pack-close" onClick={() => setPackModalOpen(false)}>
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MinionAction;
