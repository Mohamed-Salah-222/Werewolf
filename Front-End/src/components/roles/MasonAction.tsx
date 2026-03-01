import { useState, useEffect, useRef } from "react";
import { allCards, backCardImage } from "../../characters";
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

function getCardImage(roleName: string): string {
  const card = allCards.find((c) => c.name.toLowerCase() === roleName.toLowerCase());
  return card?.image || backCardImage;
}

function getMasonCardImage(): string {
  return getCardImage("mason");
}

function getCirclePositions(count: number, selfIndex: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const angleStep = 360 / count;

  for (let i = 0; i < count; i++) {
    const offset = (i - selfIndex + count) % count;
    const angleDeg = 270 + offset * angleStep;
    const angleRad = (angleDeg * Math.PI) / 180;

    positions.push({
      x: 50 + 39 * Math.cos(angleRad),
      y: 50 + 37 * Math.sin(angleRad),
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

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

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

  return (
    <div className="ms-action">
      <div className="ms-circle-area">
        {/* Player cards around the circle */}
        {players.map((player, i) => {
          const pos = positions[i];
          const isSelf = player.id === playerId;
          const isRevealed = revealedIds.has(player.id);

          return (
            <div key={player.id} className={`ms-slot ${isSelf ? "ms-slot--self" : ""} ${isRevealed ? "ms-slot--revealed" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              <span className={`ms-name ${isSelf ? "ms-name--self" : ""} ${isRevealed ? "ms-name--mason" : ""}`}>{isSelf ? "YOU" : player.name}</span>

              <div className={`ms-flip ${isSelf || isRevealed ? "ms-flip--up" : ""}`}>
                <div className="ms-flip-inner">
                  <div className="ms-flip-face ms-flip-face--back">
                    <img src={backCardImage} alt="Card back" draggable={false} />
                  </div>
                  <div className="ms-flip-face ms-flip-face--front">
                    <img src={isSelf || isRevealed ? getMasonCardImage() : backCardImage} alt={isSelf || isRevealed ? "Mason" : "Card"} draggable={false} />
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
            <span className="ms-btn-icon">◆</span>
            <span className="ms-btn-text">SEE MASONS</span>
          </button>
        ) : !actionResult ? (
          <span className="ms-bottom-status">LOOKING...</span>
        ) : (
          <span className="ms-bottom-status ms-bottom-status--done">{actionResult.masons.length > 0 ? "You found your brothers" : "You stand alone"}</span>
        )}
      </div>
    </div>
  );
}

export default MasonAction;
