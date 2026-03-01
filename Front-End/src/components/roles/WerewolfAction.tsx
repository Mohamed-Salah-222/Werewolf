import { useState, useEffect, useRef } from "react";
import { allCards, backCardImage } from "../../characters";
import "./WerewolfAction.css";

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

function getCardImage(roleName: string): string {
  const card = allCards.find((c) => c.name.toLowerCase() === roleName.toLowerCase());
  return card?.image || backCardImage;
}

function getWerewolfCardImage(): string {
  return getCardImage("werewolf");
}

function getCirclePositions(count: number, selfIndex: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const angleStep = 360 / count;

  for (let i = 0; i < count; i++) {
    const offset = (i - selfIndex + count) % count;
    const angleDeg = 270 + offset * angleStep;
    const angleRad = (angleDeg * Math.PI) / 180;

    const radiusX = 39;
    const radiusY = 37;
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

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

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

  return (
    <div className="ww-action">
      <div className="ww-circle-area">
        {/* Player cards around the full circle */}
        {players.map((player, i) => {
          const pos = positions[i];
          const isSelf = player.id === playerId;
          const isRevealed = revealedIds.has(player.id);

          return (
            <div key={player.id} className={`ww-slot ${isSelf ? "ww-slot--self" : ""} ${isRevealed ? "ww-slot--revealed" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              <span className={`ww-name ${isSelf ? "ww-name--self" : ""} ${isRevealed ? "ww-name--wolf" : ""}`}>{isSelf ? "YOU" : player.name}</span>

              <div className={`ww-flip ${isSelf || isRevealed ? "ww-flip--up" : ""}`}>
                <div className="ww-flip-inner">
                  <div className="ww-flip-face ww-flip-face--back">
                    <img src={backCardImage} alt="Card back" draggable={false} />
                  </div>
                  <div className="ww-flip-face ww-flip-face--front">
                    <img src={isSelf || isRevealed ? getWerewolfCardImage() : backCardImage} alt={isSelf || isRevealed ? "Werewolf" : "Card"} draggable={false} />
                  </div>
                </div>
              </div>

              {isRevealed && <div className="ww-glow ww-glow--red" />}
              {isSelf && <div className="ww-glow ww-glow--gold ww-glow--subtle" />}
            </div>
          );
        })}

        {/* 3 Ground cards side by side in the center */}
        <div className="ww-ground">
          {groundCards.slice(0, 3).map((gc, idx) => {
            const isFlipped = revealedGroundIdx === idx;

            return (
              <div key={gc.id} className={`ww-ground-card ${isFlipped ? "ww-ground-card--flipped" : ""}`}>
                <div className={`ww-flip ww-flip--ground ${isFlipped ? "ww-flip--up" : ""}`}>
                  <div className="ww-flip-inner">
                    <div className="ww-flip-face ww-flip-face--back">
                      <img src={backCardImage} alt="Ground card" draggable={false} />
                    </div>
                    <div className="ww-flip-face ww-flip-face--front">
                      <img src={isFlipped ? getCardImage(groundCardName) : backCardImage} alt={isFlipped ? groundCardName : "Ground card"} draggable={false} />
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

      {/* Button area — directly under the circle */}
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
    </div>
  );
}

export default WerewolfAction;
