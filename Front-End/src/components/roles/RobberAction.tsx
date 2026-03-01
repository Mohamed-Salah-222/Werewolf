import { useState, useEffect, useRef } from "react";
import { allCards, backCardImage } from "../../characters";
import "./RobberAction.css";

// ===== TYPES =====

interface RobberResult {
  newRole: string;
  newTeam: string;
  message?: string;
}

interface Props {
  onAction: (action: { type: string; targetPlayer: { id: string } }) => void;
  playerId: string;
  players: Array<{ id: string; name: string }>;
  actionResult?: RobberResult | null;
}

// ===== HELPERS =====

function getCardImage(roleName: string): string {
  const card = allCards.find((c) => c.name.toLowerCase() === roleName.toLowerCase());
  return card?.image || backCardImage;
}

function getRobberCardImage(): string {
  return getCardImage("robber");
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

type Phase = "idle" | "submitted" | "reveal" | "swap" | "done";

// ===== COMPONENT =====

function RobberAction({ onAction, playerId, players, actionResult }: Props) {
  const isRejoin = !!actionResult;

  const [phase, setPhase] = useState<Phase>(isRejoin ? "done" : "idle");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>(isRejoin ? actionResult.newRole : "");
  const hasProcessedResult = useRef(isRejoin);

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  const targetIndex = targetId ? players.findIndex((p) => p.id === targetId) : -1;

  // Animation sequencer: reveal target card → swap positions → done
  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    hasProcessedResult.current = true;

    setNewRole(actionResult.newRole);

    if (phase === "done") return;

    // Step 1: Flip the target card face-up
    setPhase("reveal");

    // Step 2: After flip animation (~800ms), swap positions
    const t1 = setTimeout(() => {
      setPhase("swap");

      // Step 3: After swap animation (~900ms), finalize
      const t2 = setTimeout(() => {
        setPhase("done");
      }, 900);

      return () => clearTimeout(t2);
    }, 900);

    return () => clearTimeout(t1);
  }, [actionResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlayerClick = (clickedId: string) => {
    if (phase !== "idle" || clickedId === playerId) return;

    setTargetId(clickedId);
    setPhase("submitted");
    onAction({ type: "robber", targetPlayer: { id: clickedId } });
  };

  // Position logic: during swap and done, self and target exchange positions
  const getSlotPosition = (playerIndex: number): { x: number; y: number } => {
    const shouldSwap = phase === "swap" || phase === "done";
    if (shouldSwap && targetIndex >= 0) {
      if (playerIndex === selfIndex) return positions[targetIndex];
      if (playerIndex === targetIndex) return positions[selfIndex];
    }
    return positions[playerIndex];
  };

  const isClickable = phase === "idle";
  const hasTarget = targetId !== null;

  return (
    <div className="rb-action">
      <div className="rb-circle-area">
        {players.map((player, i) => {
          const isSelf = player.id === playerId;
          const isTarget = player.id === targetId;
          const isRevealPhase = phase === "reveal" || phase === "swap" || phase === "done";
          const showTargetFace = isTarget && isRevealPhase && hasTarget;

          const pos = getSlotPosition(i);
          const isSwapping = phase === "swap" && (isSelf || isTarget);

          // Card face image
          let faceImage = backCardImage;
          let faceAlt = "Card";
          if (isSelf) {
            faceImage = getRobberCardImage();
            faceAlt = "Robber";
          } else if (showTargetFace && newRole) {
            faceImage = getCardImage(newRole);
            faceAlt = newRole;
          }

          // Should the card show its face?
          const showFace = isSelf || showTargetFace;

          return (
            <div
              key={player.id}
              className={`rb-slot${isSelf ? " rb-slot--self" : ""}${showTargetFace ? " rb-slot--revealed" : ""}${isClickable && !isSelf ? " rb-slot--clickable" : ""}${isSwapping ? " rb-slot--swapping" : ""}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
              }}
              onClick={() => isClickable && !isSelf && handlePlayerClick(player.id)}
            >
              <span className={`rb-name${isSelf ? " rb-name--self" : ""}${showTargetFace ? " rb-name--target" : ""}`}>{phase === "swap" || phase === "done" ? (isSelf ? players.find((p) => p.id === targetId)?.name || player.name : isTarget ? "YOU" : player.name) : isSelf ? "YOU" : player.name}</span>

              <div className={`rb-flip${showFace ? " rb-flip--up" : ""}`}>
                <div className="rb-flip-inner">
                  <div className="rb-flip-face rb-flip-face--back">
                    <img src={backCardImage} alt="Card back" draggable={false} />
                  </div>
                  <div className="rb-flip-face rb-flip-face--front">
                    <img src={faceImage} alt={faceAlt} draggable={false} />
                  </div>
                </div>
              </div>

              {showTargetFace && <div className="rb-glow rb-glow--gold" />}
              {isSelf && <div className="rb-glow rb-glow--gold rb-glow--subtle" />}
            </div>
          );
        })}

        {phase === "reveal" && (
          <div className="rb-center-message">
            <span className="rb-msg-text rb-msg-text--gold">STEALING...</span>
          </div>
        )}
        {phase === "swap" && (
          <div className="rb-center-message">
            <span className="rb-msg-text rb-msg-text--gold">SWAPPING</span>
          </div>
        )}
        {phase === "done" && newRole && (
          <div className="rb-center-message">
            <span className="rb-msg-text rb-msg-text--gold">STOLEN</span>
          </div>
        )}
      </div>

      <div className="rb-bottom">
        {phase === "idle" && <span className="rb-bottom-hint">Tap a player's card to steal their role</span>}
        {phase === "submitted" && <span className="rb-bottom-status">REACHING OUT...</span>}
        {(phase === "reveal" || phase === "swap") && <span className="rb-bottom-status">{phase === "reveal" ? "REVEALING..." : "SWAPPING..."}</span>}
        {phase === "done" && <span className="rb-bottom-status rb-bottom-status--done">{newRole ? `You are now the ${newRole}` : "Role stolen"}</span>}
      </div>
    </div>
  );
}

export default RobberAction;
