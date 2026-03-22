import { useState, useEffect, useRef, useCallback } from "react";
import { backCardImage } from "../../characters";
import { getSquareImage, getFullCardImage, getCirclePositions } from "../../utils/roleHelpers";
import CardModal from "../CardModal";
import "../roles/shared/RoleShared.css";
import "./RobberAction.css";

// ===== TYPES =====

interface RobberResult {
  newRole: string;
  newTeam: string;
  targetPlayerId?: string;
  targetPlayerName?: string;
  message?: string;
}

interface Props {
  onAction: (action: { type: string; targetPlayer: { id: string } }) => void;
  locked?: boolean;
  playerId: string;
  players: Array<{ id: string; name: string }>;
  actionResult?: RobberResult | null;
}

type Phase = "idle" | "submitted" | "reveal" | "swap" | "done";

// ===== COMPONENT =====

function RobberAction({ onAction, locked = false, playerId, players, actionResult }: Props) {
  const isRejoin = !!actionResult;

  const [phase, setPhase] = useState<Phase>(isRejoin ? "done" : "idle");
  const [targetId, setTargetId] = useState<string | null>(isRejoin && actionResult.targetPlayerId ? actionResult.targetPlayerId : null);
  const [newRole, setNewRole] = useState<string>(isRejoin ? actionResult.newRole : "");
  const hasProcessedResult = useRef(isRejoin);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState<string | undefined>();

  const hasAutoModalFired = useRef(false);

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  const targetIndex = targetId ? players.findIndex((p) => p.id === targetId) : -1;

  // Animation sequencer — handles both manual action and auto-action
  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;

    // For auto-action: extract targetId from result if we don't have one
    const resolvedTargetId = targetId || actionResult.targetPlayerId || null;
    if (!resolvedTargetId) return;

    hasProcessedResult.current = true;

    // Set targetId if it came from auto-action
    if (!targetId) {
      setTargetId(resolvedTargetId);
    }

    setNewRole(actionResult.newRole);

    // Lock interactivity immediately
    if (phase === "idle") {
      setPhase("reveal");
    } else {
      setPhase("reveal");
    }

    const t1 = setTimeout(() => {
      setPhase("swap");

      const t2 = setTimeout(() => {
        setPhase("done");

        setTimeout(() => {
          if (hasAutoModalFired.current) return;
          hasAutoModalFired.current = true;
          const targetPlayer = players.find((p) => p.id === resolvedTargetId);
          setModalImage(getFullCardImage(actionResult.newRole));
          setModalName(actionResult.newRole);
          setModalSubtitle(targetPlayer?.name);
          setModalOpen(true);
        }, 400);
      }, 900);

      return () => clearTimeout(t2);
    }, 900);

    return () => clearTimeout(t1);
  }, [actionResult, targetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlayerClick = (clickedId: string) => {
    if (phase !== "idle" || locked || clickedId === playerId) return;

    setTargetId(clickedId);
    setPhase("submitted");
    onAction({ type: "robber", targetPlayer: { id: clickedId } });
  };

  const getSlotPosition = (playerIndex: number): { x: number; y: number } => {
    const shouldSwap = phase === "swap" || phase === "done";
    if (shouldSwap && targetIndex >= 0) {
      if (playerIndex === selfIndex) return positions[targetIndex];
      if (playerIndex === targetIndex) return positions[selfIndex];
    }
    return positions[playerIndex];
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

  const isClickable = !locked && phase === "idle";
  const hasTarget = targetId !== null;

  return (
    <div className="role-action">
      <div className="role-circle-area rb-circle-area">
        {players.map((player, i) => {
          const isSelf = player.id === playerId;
          const isTarget = player.id === targetId;
          const isRevealPhase = phase === "reveal" || phase === "swap" || phase === "done";
          const showTargetFace = isTarget && isRevealPhase && hasTarget;

          const pos = getSlotPosition(i);
          const isSwapping = phase === "swap" && (isSelf || isTarget);

          let faceImage = backCardImage;
          let faceAlt = "Card";
          let faceRole = "";
          if (isSelf) {
            faceImage = getSquareImage("robber");
            faceAlt = "Robber";
            faceRole = "robber";
          } else if (showTargetFace && newRole) {
            faceImage = getSquareImage(newRole);
            faceAlt = newRole;
            faceRole = newRole;
          }

          const showFace = isSelf || showTargetFace;

          return (
            <div
              key={player.id}
              className={`role-slot ${isSelf ? "role-slot--self" : ""} ${showTargetFace ? "role-slot--revealed" : ""} ${isClickable && !isSelf ? "role-slot--clickable rb-slot--clickable" : ""} ${isSwapping ? "rb-slot--swapping" : ""}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
              }}
              onClick={() => isClickable && !isSelf && handlePlayerClick(player.id)}
            >
              <span className={`role-name ${isSelf ? "role-name--self rb-name--self" : ""} ${showTargetFace ? "rb-name--target" : ""}`}>{phase === "swap" || phase === "done" ? (isSelf ? players.find((p) => p.id === targetId)?.name || player.name : isTarget ? "YOU" : player.name) : isSelf ? "YOU" : player.name}</span>

              <div
                className={`role-flip ${showFace ? "role-flip--up" : ""} ${isSelf || (showFace && !locked) ? "role-flip--tappable" : ""}`}
                onClick={
                  isSelf
                    ? (e) => {
                        e.stopPropagation();
                        openModal(getFullCardImage("robber"), "Robber", "You");
                      }
                    : showFace && !locked
                      ? (e) => {
                          e.stopPropagation();
                          openModal(getFullCardImage(faceRole), faceAlt, player.name);
                        }
                      : undefined
                }
              >
                <div className="role-flip-inner">
                  <div className="role-flip-face role-flip-face--back">
                    <img src={backCardImage} alt="Card back" draggable={false} />
                  </div>
                  <div className="role-flip-face role-flip-face--front">
                    <img src={faceImage} alt={faceAlt} draggable={false} />
                  </div>
                </div>
              </div>

              {showTargetFace && <div className="role-glow role-glow--gold" />}
              {isSelf && <div className="role-glow role-glow--subtle-gold" />}
            </div>
          );
        })}

        {phase === "reveal" && (
          <div className="role-center-message">
            <span className="role-status-text role-status-text--gold">STEALING...</span>
          </div>
        )}
        {phase === "swap" && (
          <div className="role-center-message">
            <span className="role-status-text role-status-text--gold">SWAPPING</span>
          </div>
        )}
        {phase === "done" && newRole && (
          <div className="role-center-message">
            <span className="role-status-text role-status-text--gold">STOLEN</span>
          </div>
        )}
      </div>

      <div className="role-bottom">
        {locked ? (
          <span className="role-bottom-status">WAITING FOR YOUR TURN...</span>
        ) : (
          <>
            {phase === "idle" && <span className="role-bottom-hint">Tap a player's card to steal their role</span>}
            {phase === "submitted" && <span className="role-bottom-status">REACHING OUT...</span>}
            {(phase === "reveal" || phase === "swap") && <span className="role-bottom-status">{phase === "reveal" ? "REVEALING..." : "SWAPPING..."}</span>}
            {phase === "done" && <span className="role-bottom-status role-bottom-status--done">{newRole ? `You are now the ${newRole}` : "Role stolen"}</span>}
          </>
        )}
      </div>

      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} subtitle={modalSubtitle} />
    </div>
  );
}

export default RobberAction;
