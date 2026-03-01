import { useState, useEffect, useRef } from "react";
import { allCards, backCardImage } from "../../characters";
import "./JokerAction.css";

// ===== TYPES =====

interface JokerResult {
  groundRole: string;
  message?: string;
}

interface Props {
  onAction: (action: Record<string, unknown>) => void;
  playerId: string;
  players: Array<{ id: string; name: string }>;
  groundCards: Array<{ id: string; label: string }>;
  actionResult?: JokerResult | null;
}

// ===== HELPERS =====

function getCardImage(roleName: string): string {
  const card = allCards.find((c) => c.name.toLowerCase() === roleName.toLowerCase());
  return card?.image || backCardImage;
}

function getJokerCardImage(): string {
  return getCardImage("joker");
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

function JokerAction({ onAction, playerId, players, groundCards, actionResult }: Props) {
  const [submitted, setSubmitted] = useState(!!actionResult);
  const [selectedGroundId, setSelectedGroundId] = useState<string | null>(null);
  const [revealedRole, setRevealedRole] = useState<string>("");
  const hasProcessedResult = useRef(!!actionResult);

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  // Process result
  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    hasProcessedResult.current = true;

    if (actionResult.groundRole) {
      setRevealedRole(actionResult.groundRole);
    }
  }, [actionResult]);

  // On rejoin, set revealed role immediately
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

  const isClickable = !submitted;

  return (
    <div className="jk-action">
      <div className="jk-circle-area">
        {/* Player cards around the circle */}
        {players.map((player, i) => {
          const isSelf = player.id === playerId;
          const pos = positions[i];

          return (
            <div key={player.id} className={`jk-slot ${isSelf ? "jk-slot--self" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              <span className={`jk-name ${isSelf ? "jk-name--self" : ""}`}>{isSelf ? "YOU" : player.name}</span>

              <div className={`jk-flip ${isSelf ? "jk-flip--up" : ""}`}>
                <div className="jk-flip-inner">
                  <div className="jk-flip-face jk-flip-face--back">
                    <img src={backCardImage} alt="Card back" draggable={false} />
                  </div>
                  <div className="jk-flip-face jk-flip-face--front">
                    <img src={isSelf ? getJokerCardImage() : backCardImage} alt={isSelf ? "Joker" : "Card"} draggable={false} />
                  </div>
                </div>
              </div>

              {isSelf && <div className="jk-glow jk-glow--gold jk-glow--subtle" />}
            </div>
          );
        })}

        {/* Ground cards in the center */}
        <div className="jk-ground">
          {groundCards.slice(0, 3).map((gc) => {
            const isSelected = gc.id === selectedGroundId;
            const isRevealed = isSelected && !!revealedRole;
            const canClick = isClickable;

            return (
              <div key={gc.id} className={`jk-ground-card ${canClick ? "jk-ground-card--clickable" : ""} ${isRevealed ? "jk-ground-card--revealed" : ""}`} onClick={() => canClick && handleGroundClick(gc.id)}>
                <div className={`jk-flip jk-flip--ground ${isRevealed ? "jk-flip--up" : ""}`}>
                  <div className="jk-flip-inner">
                    <div className="jk-flip-face jk-flip-face--back">
                      <img src={backCardImage} alt="Ground card" draggable={false} />
                    </div>
                    <div className="jk-flip-face jk-flip-face--front">
                      <img src={isRevealed ? getCardImage(revealedRole) : backCardImage} alt={isRevealed ? revealedRole : "Ground card"} draggable={false} />
                    </div>
                  </div>
                </div>
                {isRevealed && <div className="jk-glow jk-glow--gold" />}
              </div>
            );
          })}
        </div>

        {/* Center hints */}
        {!submitted && (
          <div className="jk-center-hint">
            <span className="jk-hint-text">PEEK AT A GROUND CARD</span>
          </div>
        )}
        {submitted && !revealedRole && (
          <div className="jk-center-hint">
            <span className="jk-hint-text">PEEKING...</span>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="jk-bottom">{!submitted ? <span className="jk-bottom-hint">Tap a ground card to see what it is</span> : !revealedRole ? <span className="jk-bottom-status">PEEKING...</span> : <span className="jk-bottom-status jk-bottom-status--done">You saw a {revealedRole}</span>}</div>
    </div>
  );
}

export default JokerAction;
