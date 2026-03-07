import { useState, useEffect, useRef, useCallback } from "react";
import { characters, allCards, backCardImage } from "../../characters";
import CardModal from "../CardModal";
import "./MasonAction.css";

// ===== TYPES =====

interface MasonResult {
  masons: Array<{ id: string; name: string }>;
  message?: string;
}

interface Props {
  onAction: (action: Record<string, unknown>) => void;
  playerId: string;
  players: Array<{ id: string; name: string }>;
  actionResult?: MasonResult | null;
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

// ===== COMPONENT =====

function MasonAction({ onAction, playerId, players, actionResult }: Props) {
  const [submitted, setSubmitted] = useState(!!actionResult);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [showAlone, setShowAlone] = useState(false);
  const hasProcessedResult = useRef(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState<string | undefined>();

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  useEffect(() => {
    if (actionResult && !submitted) {
      setSubmitted(true);
    }
  }, [actionResult]);

  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    hasProcessedResult.current = true;

    if (actionResult.masons.length > 0) {
      const masonIds = actionResult.masons.map((m) => m.id);
      masonIds.forEach((id, i) => {
        setTimeout(
          () => {
            setRevealedIds((prev) => new Set([...prev, id]));
          },
          500 + i * 400,
        );
      });
    } else {
      setTimeout(() => {
        setShowAlone(true);
      }, 500);
    }
  }, [actionResult]);

  const handleAction = () => {
    setSubmitted(true);
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
    <div className="ms-action">
      <div className="ms-circle-area">
        {/* Player cards around the circle */}
        {players.map((player, i) => {
          const pos = positions[i];
          const isSelf = player.id === playerId;
          const isRevealed = revealedIds.has(player.id);
          const isFaceUp = isSelf || isRevealed;

          return (
            <div key={player.id} className={`ms-slot ${isSelf ? "ms-slot--self" : ""} ${isRevealed ? "ms-slot--revealed" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              <span className={`ms-name ${isSelf ? "ms-name--self" : ""} ${isRevealed ? "ms-name--mason" : ""}`}>{isSelf ? "YOU" : player.name}</span>

              <div className={`ms-flip ${isFaceUp ? "ms-flip--up" : ""} ${isFaceUp ? "ms-flip--tappable" : ""}`} onClick={isFaceUp ? () => openModal(getFullCardImage("mason"), "Mason", isSelf ? "You" : player.name) : undefined}>
                <div className="ms-flip-inner">
                  <div className="ms-flip-face ms-flip-face--back">
                    <img src={backCardImage} alt="Card back" draggable={false} />
                  </div>
                  <div className="ms-flip-face ms-flip-face--front">
                    <img src={isFaceUp ? getSquareImage("mason") : backCardImage} alt={isFaceUp ? "Mason" : "Card"} draggable={false} />
                  </div>
                </div>
              </div>

              {isRevealed && <div className="ms-glow ms-glow--green" />}
              {isSelf && <div className="ms-glow ms-glow--green ms-glow--subtle" />}
            </div>
          );
        })}

        {/* Center message — alone */}
        {showAlone && (
          <div className="ms-center-message">
            <span className="ms-alone-icon">◆</span>
            <span className="ms-alone-text">LONE MASON</span>
            <span className="ms-alone-sub">No brothers found</span>
          </div>
        )}

        {/* Center message — found masons */}
        {revealedIds.size > 0 && (
          <div className="ms-center-message">
            <span className="ms-found-text">BROTHERHOOD</span>
          </div>
        )}
      </div>

      {/* Button — below the circle */}
      <div className="ms-bottom">
        {!submitted ? (
          <button className="ms-btn" onClick={handleAction}>
            <span className="ms-btn-text">SEE MASONS</span>
          </button>
        ) : !actionResult ? (
          <span className="ms-bottom-status">LOOKING...</span>
        ) : (
          <span className="ms-bottom-status ms-bottom-status--done">{actionResult.masons.length > 0 ? "You found your brothers" : "You stand alone"}</span>
        )}
      </div>

      {/* Card Modal */}
      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} subtitle={modalSubtitle} />
    </div>
  );
}

export default MasonAction;
