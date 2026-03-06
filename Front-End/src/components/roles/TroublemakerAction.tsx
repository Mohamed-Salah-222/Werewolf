import { useState, useEffect, useRef, useCallback } from "react";
import { characters, allCards, backCardImage } from "../../characters";
import CardModal from "../CardModal";
import "./TroublemakerAction.css";

// ===== TYPES =====

interface TroublemakerResult {
  player1Name: string;
  player2Name: string;
  message?: string;
}

interface Props {
  onAction: (action: { type: string; player1: { id: string }; player2: { id: string } }) => void;
  playerId: string;
  players: Array<{ id: string; name: string }>;
  actionResult?: TroublemakerResult | null;
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

type Phase = "picking" | "submitted" | "swap" | "done";

// ===== COMPONENT =====

function TroublemakerAction({ onAction, playerId, players, actionResult }: Props) {
  const isRejoin = !!actionResult;

  const [phase, setPhase] = useState<Phase>(isRejoin ? "done" : "picking");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [target1Id, setTarget1Id] = useState<string | null>(null);
  const [target2Id, setTarget2Id] = useState<string | null>(null);
  const hasProcessedResult = useRef(isRejoin);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState<string | undefined>();

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  // Resolve targets on rejoin
  useEffect(() => {
    if (!isRejoin || !actionResult) return;
    const p1 = players.find((p) => p.name === actionResult.player1Name);
    const p2 = players.find((p) => p.name === actionResult.player2Name);
    if (p1) setTarget1Id(p1.id);
    if (p2) setTarget2Id(p2.id);
  }, [isRejoin, actionResult, players]);

  // Process result and run animation
  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    hasProcessedResult.current = true;

    let t1Id = target1Id;
    let t2Id = target2Id;

    if (!t1Id && actionResult.player1Name) {
      const p = players.find((pl) => pl.name === actionResult.player1Name);
      if (p) {
        t1Id = p.id;
        setTarget1Id(p.id);
      }
    }
    if (!t2Id && actionResult.player2Name) {
      const p = players.find((pl) => pl.name === actionResult.player2Name);
      if (p) {
        t2Id = p.id;
        setTarget2Id(p.id);
      }
    }

    if (phase === "done") return;
    if (!t1Id || !t2Id) return;

    setPhase("swap");
    const t = setTimeout(() => setPhase("done"), 900);
    return () => clearTimeout(t);
  }, [actionResult, players]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlayerClick = (clickedId: string) => {
    if (phase !== "picking" || clickedId === playerId) return;

    setSelectedIds((prev) => {
      if (prev.includes(clickedId)) return prev.filter((id) => id !== clickedId);
      if (prev.length >= 2) return prev;
      return [...prev, clickedId];
    });
  };

  const handleConfirm = () => {
    if (selectedIds.length !== 2) return;

    setTarget1Id(selectedIds[0]);
    setTarget2Id(selectedIds[1]);
    setPhase("submitted");

    onAction({
      type: "troublemaker",
      player1: { id: selectedIds[0] },
      player2: { id: selectedIds[1] },
    });
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

  // Position logic: during swap and done, targets exchange positions
  const getSlotPosition = (playerIndex: number): { x: number; y: number } => {
    const t1Idx = target1Id ? players.findIndex((p) => p.id === target1Id) : -1;
    const t2Idx = target2Id ? players.findIndex((p) => p.id === target2Id) : -1;

    const shouldSwap = phase === "swap" || phase === "done";
    if (shouldSwap && t1Idx >= 0 && t2Idx >= 0) {
      if (playerIndex === t1Idx) return positions[t2Idx];
      if (playerIndex === t2Idx) return positions[t1Idx];
    }
    return positions[playerIndex];
  };

  const hasTargets = target1Id !== null && target2Id !== null;

  return (
    <div className="tm-action">
      <div className="tm-circle-area">
        {players.map((player, i) => {
          const isSelf = player.id === playerId;
          const isTarget = player.id === target1Id || player.id === target2Id;
          const isSelected = selectedIds.includes(player.id);
          const isClickable = phase === "picking" && !isSelf;
          const pos = getSlotPosition(i);
          const isAnimating = phase === "swap" && isTarget;

          const displayName = (() => {
            const shouldSwap = phase === "swap" || phase === "done";
            if (shouldSwap && isTarget) {
              if (player.id === target1Id) {
                const other = players.find((p) => p.id === target2Id);
                return other?.id === playerId ? "YOU" : other?.name || player.name;
              }
              if (player.id === target2Id) {
                const other = players.find((p) => p.id === target1Id);
                return other?.id === playerId ? "YOU" : other?.name || player.name;
              }
            }
            return isSelf ? "YOU" : player.name;
          })();

          return (
            <div
              key={player.id}
              className={`tm-slot ${isSelf ? "tm-slot--self" : ""} ${isSelected ? "tm-slot--selected" : ""} ${isTarget && phase !== "picking" ? "tm-slot--target" : ""} ${isClickable ? "tm-slot--clickable" : ""} ${isAnimating ? "tm-slot--swapping" : ""}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
              }}
              onClick={() => isClickable && handlePlayerClick(player.id)}
            >
              <span className={`tm-name ${isSelf ? "tm-name--self" : ""} ${isSelected || isTarget ? "tm-name--highlight" : ""}`}>{displayName}</span>

              <div
                className={`tm-flip ${isSelf ? "tm-flip--up" : ""}${isSelf ? " tm-flip--tappable" : ""}`}
                onClick={
                  isSelf
                    ? (e) => {
                        e.stopPropagation();
                        openModal(getFullCardImage("troublemaker"), "Troublemaker", "You");
                      }
                    : undefined
                }
              >
                <div className="tm-flip-inner">
                  <div className="tm-flip-face tm-flip-face--back">
                    <img src={backCardImage} alt="Card back" draggable={false} />
                  </div>
                  <div className="tm-flip-face tm-flip-face--front">
                    <img src={isSelf ? getSquareImage("troublemaker") : backCardImage} alt={isSelf ? "Troublemaker" : "Card"} draggable={false} />
                  </div>
                </div>
              </div>

              {isSelf && <div className="tm-glow tm-glow--green tm-glow--subtle" />}
              {isSelected && !isSelf && <div className="tm-select-ring" />}
              {isTarget && (phase === "swap" || phase === "done") && <div className="tm-glow tm-glow--gold" />}
            </div>
          );
        })}

        {phase === "picking" && selectedIds.length === 0 && (
          <div className="tm-center-hint">
            <span className="tm-hint-text">PICK TWO PLAYERS</span>
          </div>
        )}
        {phase === "picking" && selectedIds.length === 1 && (
          <div className="tm-center-hint">
            <span className="tm-hint-text">PICK ONE MORE</span>
          </div>
        )}
        {phase === "swap" && (
          <div className="tm-center-message">
            <span className="tm-msg-text">SWAPPING...</span>
          </div>
        )}
        {phase === "done" && hasTargets && (
          <div className="tm-center-message">
            <span className="tm-msg-text">SWAPPED</span>
          </div>
        )}
      </div>

      <div className="tm-bottom">
        {phase === "picking" && selectedIds.length < 2 && <span className="tm-bottom-hint">{selectedIds.length === 0 ? "Tap two players to swap their roles" : `${selectedIds.length}/2 selected`}</span>}
        {phase === "picking" && selectedIds.length === 2 && (
          <button className="tm-btn" onClick={handleConfirm}>
            <span className="tm-btn-text">SWAP ROLES</span>
          </button>
        )}
        {(phase === "submitted" || phase === "swap") && <span className="tm-bottom-status">SWAPPING...</span>}
        {phase === "done" && <span className="tm-bottom-status tm-bottom-status--done">Roles have been swapped</span>}
      </div>

      {/* Card Modal */}
      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} subtitle={modalSubtitle} />
    </div>
  );
}

export default TroublemakerAction;
