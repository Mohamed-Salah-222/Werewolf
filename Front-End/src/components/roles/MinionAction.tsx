import { useState, useEffect, useRef } from "react";
import { allCards, backCardImage } from "../../characters";
import "./MinionAction.css";

// ===== TYPES =====

interface MinionResult {
  werewolves: Array<{ id: string; name: string }>;
  message?: string;
}

interface Props {
  onAction: (action: Record<string, unknown>) => void;
  playerId: string;
  players: Array<{ id: string; name: string }>;
  actionResult?: MinionResult | null;
}

// ===== HELPERS =====

function getCardImage(roleName: string): string {
  const card = allCards.find((c) => c.name.toLowerCase() === roleName.toLowerCase());
  return card?.image || backCardImage;
}

function getMinionCardImage(): string {
  return getCardImage("minion");
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

    positions.push({
      x: 50 + 39 * Math.cos(angleRad),
      y: 50 + 37 * Math.sin(angleRad),
    });
  }

  return positions;
}

// ===== COMPONENT =====

function MinionAction({ onAction, playerId, players, actionResult }: Props) {
  const [submitted, setSubmitted] = useState(!!actionResult);
  useEffect(() => {
    if (actionResult && !submitted) {
      setSubmitted(true);
    }
  }, [actionResult]);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [showNoWolves, setShowNoWolves] = useState(false);
  const hasProcessedResult = useRef(false);

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    hasProcessedResult.current = true;

    if (actionResult.werewolves.length > 0) {
      const wwIds = actionResult.werewolves.map((w) => w.id);
      wwIds.forEach((id, i) => {
        setTimeout(
          () => {
            setRevealedIds((prev) => new Set([...prev, id]));
          },
          500 + i * 400,
        );
      });
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

  return (
    <div className="mn-action">
      <div className="mn-circle-area">
        {/* Player cards around the circle */}
        {players.map((player, i) => {
          const pos = positions[i];
          const isSelf = player.id === playerId;
          const isRevealed = revealedIds.has(player.id);

          return (
            <div key={player.id} className={`mn-slot ${isSelf ? "mn-slot--self" : ""} ${isRevealed ? "mn-slot--revealed" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              <span className={`mn-name ${isSelf ? "mn-name--self" : ""} ${isRevealed ? "mn-name--wolf" : ""}`}>{isSelf ? "YOU" : player.name}</span>

              <div className={`mn-flip ${isSelf || isRevealed ? "mn-flip--up" : ""}`}>
                <div className="mn-flip-inner">
                  <div className="mn-flip-face mn-flip-face--back">
                    <img src={backCardImage} alt="Card back" draggable={false} />
                  </div>
                  <div className="mn-flip-face mn-flip-face--front">
                    <img src={isSelf ? getMinionCardImage() : isRevealed ? getWerewolfCardImage() : backCardImage} alt={isSelf ? "Minion" : isRevealed ? "Werewolf" : "Card"} draggable={false} />
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
        {!submitted ? (
          <button className="mn-btn" onClick={handleAction}>
            <span className="mn-btn-icon">👁</span>
            <span className="mn-btn-text">SEE WEREWOLVES</span>
          </button>
        ) : !actionResult ? (
          <span className="mn-bottom-status">LOOKING...</span>
        ) : (
          <span className="mn-bottom-status mn-bottom-status--done">{actionResult.werewolves.length > 0 ? "Serve them well" : "No wolves to serve"}</span>
        )}
      </div>
    </div>
  );
}

export default MinionAction;
