import { useState, useEffect, useRef, useCallback } from "react";
import { characters, allCards, backCardImage } from "../../characters";
import CardModal from "../CardModal";
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

function MinionAction({ onAction, locked = false, playerId, players, actionResult }: Props) {
  const [submitted, setSubmitted] = useState(!!actionResult);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [showNoWolves, setShowNoWolves] = useState(false);
  const hasProcessedResult = useRef(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState<string | undefined>();

  // Pack modal state (werewolves reveal)
  const [packModalOpen, setPackModalOpen] = useState(false);
  const [packWolves, setPackWolves] = useState<Array<{ name: string; image: string }>>([]);

  // Track if auto-modal has fired
  const hasAutoModalFired = useRef(false);

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

      // After all cards flip, auto-open modal
      setTimeout(() => {
        if (hasAutoModalFired.current) return;
        hasAutoModalFired.current = true;

        if (actionResult.werewolves.length === 1) {
          // Single wolf — use big CardModal
          const wolf = actionResult.werewolves[0];
          setModalImage(getFullCardImage("werewolf"));
          setModalName("Werewolf");
          setModalSubtitle(wolf.name);
          setModalOpen(true);
        } else {
          // Multiple wolves — use pack modal
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
    setSubmitted(true);
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
    <div className="mn-action">
      <div className="mn-circle-area">
        {/* Player cards around the circle */}
        {players.map((player, i) => {
          const pos = positions[i];
          const isSelf = player.id === playerId;
          const isRevealed = revealedIds.has(player.id);
          const isFaceUp = isSelf || isRevealed;

          return (
            <div key={player.id} className={`mn-slot ${isSelf ? "mn-slot--self" : ""} ${isRevealed ? "mn-slot--revealed" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              <span className={`mn-name ${isSelf ? "mn-name--self" : ""} ${isRevealed ? "mn-name--wolf" : ""}`}>{isSelf ? "YOU" : player.name}</span>

              <div className={`mn-flip ${isFaceUp ? "mn-flip--up" : ""} ${isSelf || (isFaceUp && !locked) ? "mn-flip--tappable" : ""}`} onClick={isSelf ? () => openModal(getFullCardImage("minion"), "Minion", "You") : isFaceUp && !locked ? () => openModal(getFullCardImage("werewolf"), "Werewolf", player.name) : undefined}>
                <div className="mn-flip-inner">
                  <div className="mn-flip-face mn-flip-face--back">
                    <img src={backCardImage} alt="Card back" draggable={false} />
                  </div>
                  <div className="mn-flip-face mn-flip-face--front">
                    <img src={isSelf ? getSquareImage("minion") : isRevealed ? getSquareImage("werewolf") : backCardImage} alt={isSelf ? "Minion" : isRevealed ? "Werewolf" : "Card"} draggable={false} />
                  </div>
                </div>
              </div>

              {isRevealed && <div className="mn-glow mn-glow--red" />}
              {isSelf && <div className="mn-glow mn-glow--red mn-glow--subtle" />}
            </div>
          );
        })}

        {/* Center message — no werewolves */}
        {showNoWolves && (
          <div className="mn-center-message">
            <span className="mn-no-wolves-icon">☽</span>
            <span className="mn-no-wolves-text">NO WEREWOLVES</span>
            <span className="mn-no-wolves-sub">You're on your own</span>
          </div>
        )}

        {/* Center message — wolves found */}
        {revealedIds.size > 0 && (
          <div className="mn-center-message">
            <span className="mn-found-text">YOUR MASTERS</span>
          </div>
        )}
      </div>

      {/* Button — below the circle */}
      <div className="mn-bottom">
        {locked ? (
          <span className="mn-bottom-status">WAITING FOR YOUR TURN...</span>
        ) : !submitted ? (
          <button className="mn-btn" onClick={handleAction}>
            SEE WEREWOLVES
          </button>
        ) : !actionResult ? (
          <span className="mn-bottom-status">LOOKING...</span>
        ) : (
          <span className="mn-bottom-status mn-bottom-status--done">{actionResult.werewolves.length > 0 ? "Serve them well" : "No wolves to serve"}</span>
        )}
      </div>

      {/* Single Card Modal */}
      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} subtitle={modalSubtitle} />

      {/* Pack Modal (werewolves reveal) */}
      {packModalOpen && (
        <div className="mn-pack-overlay" onClick={() => setPackModalOpen(false)}>
          <div className="mn-pack-modal" onClick={(e) => e.stopPropagation()}>
            <span className="mn-pack-title">YOUR MASTERS</span>
            <div className="mn-pack-cards">
              {packWolves.map((wolf, i) => (
                <div key={i} className="mn-pack-card">
                  <span className="mn-pack-name">{wolf.name}</span>
                  <img src={wolf.image} alt={wolf.name} className="mn-pack-img" />
                </div>
              ))}
            </div>
            <button className="mn-pack-close" onClick={() => setPackModalOpen(false)}>
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MinionAction;
