import { useState, useEffect, useRef, useCallback } from "react";
import { backCardImage } from "../../characters";
import { getSquareImage, getFullCardImage, getCirclePositions } from "../../utils/roleHelpers";
import CardModal from "../CardModal";
import "../roles/shared/RoleShared.css";
import "./TroublemakerAction.css";

// ===== TYPES =====

interface TroublemakerResult {
  player1Id?: string;
  player1Name: string;
  player2Id?: string;
  player2Name: string;
  message?: string;
}

interface Props {
  onAction: (action: { type: string; player1: { id: string }; player2: { id: string } }) => void;
  locked?: boolean;
  playerId: string;
  players: Array<{ id: string; name: string }>;
  actionResult?: TroublemakerResult | null;
}

type Phase = "picking" | "submitted" | "swap" | "done";

// ===== COMPONENT =====

function TroublemakerAction({ onAction, locked = false, playerId, players, actionResult }: Props) {
  const isRejoin = !!actionResult;

  const [phase, setPhase] = useState<Phase>(isRejoin ? "done" : "picking");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [target1Id, setTarget1Id] = useState<string | null>(null);
  const [target2Id, setTarget2Id] = useState<string | null>(null);
  const hasProcessedResult = useRef(isRejoin);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState<string | undefined>();

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  // Resolve targets on rejoin
  useEffect(() => {
    if (!isRejoin || !actionResult) return;
    const p1 = players.find((p) => p.id === actionResult.player1Id) || players.find((p) => p.name === actionResult.player1Name);
    const p2 = players.find((p) => p.id === actionResult.player2Id) || players.find((p) => p.name === actionResult.player2Name);
    setTimeout(() => {
      if (p1) setTarget1Id(p1.id);
      if (p2) setTarget2Id(p2.id);
    }, 0);
  }, [isRejoin, actionResult, players]);

  // Process result — handles both manual and auto-action
  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    hasProcessedResult.current = true;

    // Resolve targets from result if not already set (auto-action case)
    let t1Id = target1Id;
    let t2Id = target2Id;

    if (!t1Id && (actionResult.player1Id || actionResult.player1Name)) {
      const p = players.find((pl) => pl.id === actionResult.player1Id) || players.find((pl) => pl.name === actionResult.player1Name);
      if (p) {
        t1Id = p.id;
      }
    }
    if (!t2Id && (actionResult.player2Id || actionResult.player2Name)) {
      const p = players.find((pl) => pl.id === actionResult.player2Id) || players.find((pl) => pl.name === actionResult.player2Name);
      if (p) {
        t2Id = p.id;
      }
    }

    if (phase === "done") return;
    if (!t1Id || !t2Id) return;

    const resolvedT1 = t1Id;
    const resolvedT2 = t2Id;

    setTimeout(() => {
      setTarget1Id(resolvedT1);
      setTarget2Id(resolvedT2);
      setPhase("swap");
    }, 0);

    const t = setTimeout(() => setPhase("done"), 900);
    return () => clearTimeout(t);
  }, [actionResult, players]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlayerClick = (clickedId: string) => {
    if (phase !== "picking" || locked || clickedId === playerId) return;

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

  const openModal = useCallback((image: string, name: string, subtitle?: string) => {
    setModalImage(image);
    setModalName(name);
    setModalSubtitle(subtitle);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

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
    <div className="role-action">
      <div className="role-circle-area tm-circle-area">
        {players.map((player, i) => {
          const isSelf = player.id === playerId;
          const isTarget = player.id === target1Id || player.id === target2Id;
          const isSelected = selectedIds.includes(player.id);
          const isClickable = !locked && phase === "picking" && !isSelf;
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
              className={`role-slot ${isSelf ? "role-slot--self" : ""} ${isSelected ? "tm-slot--selected" : ""} ${isTarget && phase !== "picking" ? "tm-slot--target" : ""} ${isClickable ? "role-slot--clickable tm-slot--clickable" : ""} ${isAnimating ? "tm-slot--swapping" : ""}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
              }}
              onClick={() => isClickable && handlePlayerClick(player.id)}
            >
              <span className={`role-name ${isSelf ? "role-name--self tm-name--self" : ""} ${isSelected || isTarget ? "tm-name--highlight" : ""}`}>{displayName}</span>

              <div
                className={`role-flip ${isSelf ? "role-flip--up" : ""}${isSelf ? " role-flip--tappable" : ""}`}
                onClick={
                  isSelf
                    ? (e) => {
                        e.stopPropagation();
                        openModal(getFullCardImage("troublemaker"), "Troublemaker", "You");
                      }
                    : undefined
                }
              >
                <div className="role-flip-inner">
                  <div className="role-flip-face role-flip-face--back">
                    <img src={backCardImage} alt="Card back" draggable={false} />
                  </div>
                  <div className="role-flip-face role-flip-face--front">
                    <img src={isSelf ? getSquareImage("troublemaker") : backCardImage} alt={isSelf ? "Troublemaker" : "Card"} draggable={false} />
                  </div>
                </div>
              </div>

              {/* {isSelf && <div className="role-glow role-glow--subtle-green" />} */}
              {/* {isSelected && !isSelf && <div className="tm-select-ring" />} */}
              {/* {isTarget && (phase === "swap" || phase === "done") && <div className="role-glow role-glow--gold" />} */}
            </div>
          );
        })}

        {/* Center button — replaces ground cards area */}
        {!locked && phase === "picking" && selectedIds.length === 2 && (
          <div className="role-ground">
            <button className="role-btn tm-center-btn" onClick={handleConfirm}>
              SWAP ROLES
            </button>
          </div>
        )}

        {phase === "picking" && selectedIds.length === 0 && (
          <div className="role-center-message">
            <span className="role-hint-text">PICK TWO PLAYERS</span>
          </div>
        )}
        {phase === "picking" && selectedIds.length === 1 && (
          <div className="role-center-message">
            <span className="role-hint-text">PICK ONE MORE</span>
          </div>
        )}
        {phase === "swap" && (
          <div className="role-center-message">
            <span className="role-status-text role-status-text--gold">SWAPPING...</span>
          </div>
        )}
        {phase === "done" && hasTargets && (
          <div className="role-center-message">
            <span className="role-status-text role-status-text--gold">SWAPPED</span>
          </div>
        )}
      </div>

      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} subtitle={modalSubtitle} />
    </div>
  );
}

export default TroublemakerAction;
