import { useState, useEffect, useRef, useCallback } from "react";
import { characters, allCards, backCardImage } from "../../characters";
import CardModal from "../CardModal";
import "./werewolfAction.css";

// ===== TYPES =====

interface WerewolfResult {
  isAlone: boolean;
  werewolves?: Array<{ id: string; name: string }>;
  groundCard?: string;
  message?: string;
}

interface Props {
  onAction: (action: Record<string, unknown>) => void;
  playerId: string;
  players: Array<{ id: string; name: string }>;
  groundCards: Array<{ id: string; label: string }>;
  actionResult?: WerewolfResult | null;
}

// ===== HELPERS =====

/** Get the square image for circle/board display */
function getSquareImage(roleName: string): string {
  const char = characters.find((c) => c.name.toLowerCase() === roleName.toLowerCase());
  return char?.square || backCardImage;
}

/** Get the full card image for the modal */
function getFullCardImage(roleName: string): string {
  const card = allCards.find((c) => c.name.toLowerCase() === roleName.toLowerCase());
  return card?.image || backCardImage;
}

function getWerewolfSquare(): string {
  return getSquareImage("werewolf");
}

function getWerewolfCard(): string {
  return getFullCardImage("werewolf");
}

function getCirclePositions(count: number, selfIndex: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const angleStep = 360 / count;

  for (let i = 0; i < count; i++) {
    const offset = (i - selfIndex + count) % count;
    const angleDeg = 270 + offset * angleStep;
    const angleRad = (angleDeg * Math.PI) / 180;

    const radiusX = 44;
    const radiusY = 42;
    const cx = 50;
    const cy = 50;

    positions.push({
      x: cx + radiusX * Math.cos(angleRad),
      y: cy + radiusY * Math.sin(angleRad),
    });
  }

  return positions;
}

// ===== COMPONENT =====

function WerewolfAction({ onAction, playerId, players, groundCards, actionResult }: Props) {
  const [submitted, setSubmitted] = useState(!!actionResult);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [revealedGroundIdx, setRevealedGroundIdx] = useState<number | null>(null);
  const [groundCardName, setGroundCardName] = useState<string>("");
  const hasProcessedResult = useRef(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState<string | undefined>();

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  // Auto-submit if actionResult arrives from server (timer expired)
  useEffect(() => {
    if (actionResult && !submitted) {
      setSubmitted(true);
    }
  }, [actionResult]);

  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    hasProcessedResult.current = true;

    if (!actionResult.isAlone && actionResult.werewolves) {
      const wwIds = actionResult.werewolves.map((w) => w.id);
      wwIds.forEach((id, i) => {
        setTimeout(
          () => {
            setRevealedIds((prev) => new Set([...prev, id]));
          },
          500 + i * 400,
        );
      });
    } else if (actionResult.isAlone && actionResult.groundCard) {
      setGroundCardName(actionResult.groundCard);
      const randomIdx = Math.floor(Math.random() * Math.max(groundCards.length, 1));
      setTimeout(() => {
        setRevealedGroundIdx(randomIdx);
      }, 500);
    }
  }, [actionResult, groundCards.length]);

  const handleOpenEyes = () => {
    setSubmitted(true);
    onAction({ type: "werewolf" });
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

  const handlePlayerCardTap = (playerId: string, playerName: string) => {
    const isSelf = playerId === playerId;
    const isRevealed = revealedIds.has(playerId);
    if (isSelf || isRevealed) {
      openModal(getWerewolfCard(), "Werewolf", playerName);
    }
  };

  const handleGroundCardTap = () => {
    if (revealedGroundIdx !== null && groundCardName) {
      openModal(getFullCardImage(groundCardName), groundCardName);
    }
  };

  return (
    <div className="ww-action">
      <div className="ww-circle-area">
        {/* Player cards around the circle */}
        {players.map((player, i) => {
          const pos = positions[i];
          const isSelf = player.id === playerId;
          const isRevealed = revealedIds.has(player.id);
          const isFaceUp = isSelf || isRevealed;

          return (
            <div key={player.id} className={`ww-slot ${isSelf ? "ww-slot--self" : ""} ${isRevealed ? "ww-slot--revealed" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              <span className={`ww-name ${isSelf ? "ww-name--self" : ""} ${isRevealed ? "ww-name--wolf" : ""}`}>{isSelf ? "YOU" : player.name}</span>

              <div className={`ww-flip ${isFaceUp ? "ww-flip--up" : ""} ${isFaceUp ? "ww-flip--tappable" : ""}`} onClick={isFaceUp ? () => openModal(getWerewolfCard(), "Werewolf", isSelf ? "You" : player.name) : undefined}>
                <div className="ww-flip-inner">
                  <div className="ww-flip-face ww-flip-face--back">
                    <img src={backCardImage} alt="Card back" draggable={false} />
                  </div>
                  <div className="ww-flip-face ww-flip-face--front">
                    <img src={isFaceUp ? getWerewolfSquare() : backCardImage} alt={isFaceUp ? "Werewolf" : "Card"} draggable={false} />
                  </div>
                </div>
              </div>

              {isRevealed && <div className="ww-glow ww-glow--red" />}
              {isSelf && <div className="ww-glow ww-glow--gold ww-glow--subtle" />}
            </div>
          );
        })}

        {/* Ground cards in the center */}
        <div className="ww-ground">
          {groundCards.slice(0, 3).map((gc, idx) => {
            const isFlipped = revealedGroundIdx === idx;

            return (
              <div key={gc.id} className={`ww-ground-card ${isFlipped ? "ww-ground-card--flipped" : ""}`}>
                <div className={`ww-flip ww-flip--ground ${isFlipped ? "ww-flip--up" : ""} ${isFlipped ? "ww-flip--tappable" : ""}`} onClick={isFlipped ? handleGroundCardTap : undefined}>
                  <div className="ww-flip-inner">
                    <div className="ww-flip-face ww-flip-face--back">
                      <img src={backCardImage} alt="Ground card" draggable={false} />
                    </div>
                    <div className="ww-flip-face ww-flip-face--front">
                      <img src={isFlipped ? getSquareImage(groundCardName) : backCardImage} alt={isFlipped ? groundCardName : "Ground card"} draggable={false} />
                    </div>
                  </div>
                </div>
                {isFlipped && <div className="ww-glow ww-glow--gold" />}
              </div>
            );
          })}
        </div>

        {/* Status text above ground cards */}
        {actionResult?.isAlone && revealedGroundIdx !== null && (
          <div className="ww-status ww-status--above">
            <span className="ww-status-text ww-status-text--gold">LONE WOLF</span>
          </div>
        )}
        {!actionResult?.isAlone && revealedIds.size > 0 && (
          <div className="ww-status ww-status--above">
            <span className="ww-status-text ww-status-text--red">THE PACK</span>
          </div>
        )}
      </div>

      {/* Button area */}
      <div className="ww-bottom">
        {!submitted ? (
          <button className="ww-btn" onClick={handleOpenEyes}>
            <span className="ww-btn-icon">👁</span>
            <span className="ww-btn-text">OPEN EYES</span>
          </button>
        ) : !actionResult ? (
          <span className="ww-bottom-status">LOOKING...</span>
        ) : (
          <span className="ww-bottom-status ww-bottom-status--done">{actionResult.isAlone ? "You peeked at a ground card" : "You found your pack"}</span>
        )}
      </div>

      {/* Card Modal */}
      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} subtitle={modalSubtitle} />
    </div>
  );
}

export default WerewolfAction;
