import { useState, useEffect, useRef, useCallback } from "react";
import { backCardImage } from "../../characters";
import { getSquareImage, getFullCardImage, getCirclePositions } from "../../utils/roleHelpers";
import CardModal from "../CardModal";
import "../roles/shared/RoleShared.css";
import "./MasonAction.css";

// ===== TYPES =====

interface MasonResult {
  masons: Array<{ id: string; name: string }>;
  message?: string;
}

interface Props {
  onAction: (action: Record<string, unknown>) => void;
  locked?: boolean;
  playerId: string;
  players: Array<{ id: string; name: string }>;
  actionResult?: MasonResult | null;
}

// ===== COMPONENT =====

function MasonAction({ onAction, locked = false, playerId, players, actionResult }: Props) {
  const [manuallySubmitted, setManuallySubmitted] = useState(!!actionResult);
  const submitted = manuallySubmitted || !!actionResult;

  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [showAlone, setShowAlone] = useState(false);
  const hasProcessedResult = useRef(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState<string | undefined>();

  const [packModalOpen, setPackModalOpen] = useState(false);
  const [packMasons, setPackMasons] = useState<Array<{ name: string; image: string }>>([]);

  const hasAutoModalFired = useRef(false);

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    hasProcessedResult.current = true;

    if (actionResult.masons?.length > 0) {
      const masonIds = actionResult.masons.map((m) => m.id);
      const totalFlipTime = 500 + (masonIds.length - 1) * 400;

      masonIds.forEach((id, i) => {
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

        if (actionResult.masons.length === 1) {
          const mason = actionResult.masons[0];
          setModalImage(getFullCardImage("mason"));
          setModalName("Mason");
          setModalSubtitle(mason.name);
          setModalOpen(true);
        } else {
          const masons = actionResult.masons.map((m) => ({
            name: m.name,
            image: getFullCardImage("mason"),
          }));
          setPackMasons(masons);
          setPackModalOpen(true);
        }
      }, totalFlipTime + 600);
    } else {
      setTimeout(() => {
        setShowAlone(true);
      }, 500);
    }
  }, [actionResult]);

  const handleAction = () => {
    setManuallySubmitted(true);
    onAction({ type: "mason" });
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
              <span className={`role-name ${isSelf ? "role-name--self ms-name--self" : ""} ${isRevealed ? "ms-name--mason" : ""}`}>{isSelf ? "YOU" : player.name}</span>

              <div className={`role-flip ${isFaceUp ? "role-flip--up" : ""} ${isSelf || (isFaceUp && !locked) ? "role-flip--tappable" : ""}`} onClick={isSelf ? () => openModal(getFullCardImage("mason"), "Mason", "You") : isFaceUp && !locked ? () => openModal(getFullCardImage("mason"), "Mason", player.name) : undefined}>
                <div className="role-flip-inner">
                  <div className="role-flip-face role-flip-face--back">
                    <img src={backCardImage} alt="Card back" draggable={false} />
                  </div>
                  <div className="role-flip-face role-flip-face--front">
                    <img src={isFaceUp ? getSquareImage("mason") : backCardImage} alt={isFaceUp ? "Mason" : "Card"} draggable={false} />
                  </div>
                </div>
              </div>

              {/* {isRevealed && <div className="role-glow role-glow--green" />}
              {isSelf && <div className="role-glow role-glow--subtle-green" />} */}
            </div>
          );
        })}

        {/* Center action button */}
        {!submitted && !locked && (
          <div className="role-ground">
            <button className="role-btn ms-center-btn" onClick={handleAction}>
              SEE MASONS
            </button>
          </div>
        )}

        {showAlone && (
          <div className="role-center-message">
            <span className="ms-alone-text">LONE MASON</span>
            <span className="ms-alone-sub">No brothers found</span>
          </div>
        )}

        {revealedIds.size > 0 && (
          <div className="role-center-message">
            <span className="role-status-text role-status-text--green">BROTHERHOOD</span>
          </div>
        )}
      </div>

      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} subtitle={modalSubtitle} />

      {packModalOpen && (
        <div className="role-pack-overlay" onClick={() => setPackModalOpen(false)}>
          <div className="role-pack-modal" onClick={(e) => e.stopPropagation()}>
            <span className="role-pack-title role-pack-title--green">BROTHERHOOD</span>
            <div className="role-pack-cards">
              {packMasons.map((mason, i) => (
                <div key={i} className="role-pack-card">
                  <span className="role-pack-name">{mason.name}</span>
                  <img src={mason.image} alt={mason.name} className="role-pack-img role-pack-img--green" />
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

export default MasonAction;
