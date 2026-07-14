import { useState, useEffect, useRef, useCallback } from "react";
import { backCardImage } from "../../characters";
import { getSquareImage, getFullCardImage, getCirclePositions } from "../../utils/roleHelpers";
import CardModal from "../CardModal";
import "../roles/shared/RoleShared.css";
import "./WarlockAction.css";

// ===== TYPES =====

interface WarlockResult {
  targetPlayerId?: string;
  targetName?: string;
  targetRoleId?: string;
  targetGroundIndex?: number;
  message?: string;
}

interface Props {
  onAction: (action: { type: string; targetPlayer: { id: string } }) => void;
  locked?: boolean;
  playerId: string;
  players: Array<{ id: string; name: string }>;
  groundCards: Array<{ id: string; label: string }>;
  actionResult?: WarlockResult | null;
}

type Phase = "idle" | "submitted" | "swap" | "done";

// ===== COMPONENT =====

function WarlockAction({ onAction, locked = false, playerId, players, groundCards, actionResult }: Props) {
  const isRejoin = !!actionResult;

  const initialTargetId =
    actionResult?.targetPlayerId ?? (actionResult?.targetName ? players.find((p) => p.name === actionResult.targetName)?.id : null) ?? null;
  const initialGroundIndex =
    typeof actionResult?.targetGroundIndex === "number"
      ? actionResult.targetGroundIndex
      : actionResult?.targetRoleId
        ? groundCards.slice(0, 3).findIndex((gc) => gc.id === actionResult.targetRoleId)
        : null;

  const [phase, setPhase] = useState<Phase>(isRejoin ? "done" : "idle");
  const [targetId, setTargetId] = useState<string | null>(initialTargetId);
  const [swapGroundIdx, setSwapGroundIdx] = useState<number | null>(initialGroundIndex !== null && initialGroundIndex >= 0 ? initialGroundIndex : null);
  const hasProcessedResult = useRef(isRejoin);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState<string | undefined>();

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  const visibleGround = groundCards.slice(0, 3);

  // Ground card positions — absolute percentages, same approach as Drunk
  const groundPositions: Array<{ x: number; y: number }> = visibleGround.map((_, idx) => {
    const spacing = 16;
    const startX = 50 - ((visibleGround.length - 1) * spacing) / 2;
    return { x: startX + idx * spacing, y: 50 };
  });

  // Auto-action: when result arrives without manual submit (AFK timer)
  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    hasProcessedResult.current = true;

    const t0 = setTimeout(() => {
      const target = actionResult.targetPlayerId ? players.find((p) => p.id === actionResult.targetPlayerId) : players.find((p) => p.name === actionResult.targetName);
      const resultGroundIdx =
        typeof actionResult.targetGroundIndex === "number"
          ? actionResult.targetGroundIndex
          : actionResult.targetRoleId
            ? visibleGround.findIndex((gc) => gc.id === actionResult.targetRoleId)
            : -1;

      if (target) {
        setTargetId(target.id);
      }
      if (resultGroundIdx >= 0 && resultGroundIdx < visibleGround.length) {
        setSwapGroundIdx(resultGroundIdx);
      }
      setPhase("submitted");

      setTimeout(() => {
        setPhase("swap");
        setTimeout(() => {
          setPhase("done");
        }, 1000);
      }, 400);
    }, 0);

    return () => clearTimeout(t0);
  }, [actionResult, players, visibleGround.length]);

  // Manual click handler
  const handlePlayerClick = useCallback(
    (clickedId: string) => {
      if (phase !== "idle" || locked || clickedId === playerId) return;

      setTargetId(clickedId);
      setPhase("submitted");

      onAction({ type: "warlock", targetPlayer: { id: clickedId } });
    },
    [phase, locked, playerId, onAction],
  );

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
  const isSwapPhase = phase === "swap" || phase === "done";

  // Target player's original circle position (where flying ground card goes)
  const targetIndex = targetId ? players.findIndex((p) => p.id === targetId) : -1;
  const targetPos = targetIndex >= 0 ? positions[targetIndex] : null;

  // Selected ground card position (where target player card goes)
  const groundTargetPos = swapGroundIdx !== null && swapGroundIdx < groundPositions.length ? groundPositions[swapGroundIdx] : null;

  return (
    <div className="role-action">
      <div className="role-circle-area wk-circle-area">
        {/* Player slots — name stays at original position, card moves */}
        {players.map((player, i) => {
          const pos = positions[i];
          const isSelf = player.id === playerId;
          const isTargetPlayer = player.id === targetId;

          const slotStyle: React.CSSProperties =
            isSwapPhase && isTargetPlayer && groundTargetPos
              ? {
                  left: `${groundTargetPos.x}%`,
                  top: `${groundTargetPos.y}%`,
                }
              : {
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                };

          return (
            <div key={player.id}>
              {/* Name anchored at original position — never moves */}
              <div className="wk-name-anchor" style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
                <span className={`role-name ${isSelf ? "role-name--self wk-name--self" : ""} ${isTargetPlayer && phase !== "idle" ? "wk-name--target" : ""}`}>{isSelf ? "YOU" : player.name}</span>
              </div>

              {/* Card — moves during swap */}
              <div className={`wk-slot ${isSelf ? "wk-slot--self" : ""} ${isClickable && !isSelf ? "wk-slot--clickable" : ""} ${isSwapPhase && isTargetPlayer ? "wk-slot--swapping" : ""} ${isTargetPlayer && phase === "submitted" ? "wk-slot--targeted" : ""}`} style={slotStyle} onClick={() => isClickable && !isSelf && handlePlayerClick(player.id)}>
                <div
                  className={`wk-card ${isSelf ? "wk-card--face wk-card--tappable" : ""}`}
                  onClick={
                    isSelf
                      ? (e) => {
                          e.stopPropagation();
                          openModal(getFullCardImage("warlock"), "Warlock", "You");
                        }
                      : undefined
                  }
                >
                  <img src={isSelf ? getSquareImage("warlock") : backCardImage} alt={isSelf ? "Warlock" : "Card"} className="wk-card-img" draggable={false} />
                </div>

                {/* {isSelf && <div className="role-glow role-glow--subtle-gold" />}
                {isTargetPlayer && phase !== "idle" && <div className="role-glow role-glow--gold" />} */}
              </div>
            </div>
          );
        })}

        {/* Ground card slots — absolutely positioned */}
        {visibleGround.map((gc, idx) => {
          const isSwappingGround = isSwapPhase && swapGroundIdx === idx;
          const pos = groundPositions[idx];

          return (
            <div key={gc.id} className={`wk-slot wk-slot--ground ${isSwappingGround ? "wk-slot--ground-hidden" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              <div className="wk-card wk-card--ground">
                <img src={backCardImage} alt="Ground card" className="wk-card-img" draggable={false} />
              </div>
            </div>
          );
        })}

        {/* Flying ground card — moves from ground position to target player's spot */}
        {isSwapPhase && swapGroundIdx !== null && targetPos && (
          <div
            className="wk-slot wk-slot--flying"
            style={{
              left: `${targetPos.x}%`,
              top: `${targetPos.y}%`,
            }}
          >
            <div className="wk-card wk-card--ground">
              <img src={backCardImage} alt="Ground card" className="wk-card-img" draggable={false} />
            </div>
            {/* <div className="role-glow role-glow--gold" /> */}
          </div>
        )}

        {/* Center status text — above ground cards */}
        {phase === "idle" && !locked && (
          <div className="role-center-hint">
            <span className="role-hint-text">PICK A PLAYER TO HEX</span>
          </div>
        )}
        {phase === "submitted" && (
          <div className="role-status-above wk-status">
            <span className="role-status-text role-status-text--gold">HEXING...</span>
          </div>
        )}
        {phase === "swap" && (
          <div className="role-status-above wk-status">
            <span className="role-status-text role-status-text--gold">SWAPPING</span>
          </div>
        )}
        {phase === "done" && (
          <div className="role-status-above wk-status">
            <span className="role-status-text role-status-text--gold">CURSED</span>
          </div>
        )}
      </div>

      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} subtitle={modalSubtitle} />
    </div>
  );
}

export default WarlockAction;
