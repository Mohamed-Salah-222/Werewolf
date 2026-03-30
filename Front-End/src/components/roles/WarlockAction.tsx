import { useState, useEffect, useRef, useCallback } from "react";
import { backCardImage } from "../../characters";
import { getSquareImage, getFullCardImage, getCirclePositions } from "../../utils/roleHelpers";
import CardModal from "../CardModal";
import "../roles/shared/RoleShared.css";
import "./WarlockAction.css";

// ===== TYPES =====

interface WarlockResult {
  targetName?: string;
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

  const [phase, setPhase] = useState<Phase>(isRejoin ? "done" : "idle");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [swapGroundIdx, setSwapGroundIdx] = useState<number | null>(null);
  const hasProcessedResult = useRef(isRejoin);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState<string | undefined>();

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  // Auto-action: when result arrives without manual submit (AFK timer)
  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    hasProcessedResult.current = true;

    const t0 = setTimeout(() => {
      const target = players.find((p) => p.name === actionResult.targetName);
      const randomGroundIdx = Math.floor(Math.random() * Math.max(groundCards.length, 1));

      if (target) {
        setTargetId(target.id);
      }
      setSwapGroundIdx(randomGroundIdx);
      setPhase("submitted");

      setTimeout(() => {
        setPhase("swap");
        setTimeout(() => {
          setPhase("done");
        }, 1000);
      }, 400);
    }, 0);

    return () => clearTimeout(t0);
  }, [actionResult, players, groundCards.length]);

  // Manual click handler
  const handlePlayerClick = useCallback(
    (clickedId: string) => {
      if (phase !== "idle" || locked || clickedId === playerId) return;

      const randomGroundIdx = Math.floor(Math.random() * groundCards.length);

      setTargetId(clickedId);
      setSwapGroundIdx(randomGroundIdx);
      setPhase("submitted");

      onAction({ type: "warlock", targetPlayer: { id: clickedId } });

      setTimeout(() => {
        setPhase("swap");
        setTimeout(() => {
          setPhase("done");
        }, 1000);
      }, 400);
    },
    [phase, locked, playerId, groundCards.length, onAction],
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

  // Get target player's position for the flying ground card
  const targetIndex = targetId ? players.findIndex((p) => p.id === targetId) : -1;
  const targetPos = targetIndex >= 0 ? positions[targetIndex] : null;

  return (
    <div className="role-action">
      <div className="role-circle-area wk-circle-area">
        {/* Player slots */}
        {players.map((player, i) => {
          const pos = positions[i];
          const isSelf = player.id === playerId;
          const isTargetPlayer = player.id === targetId;
          const isSwapping = isSwapPhase && isTargetPlayer;

          // Target player card moves to center (ground area) during swap
          const slotStyle: React.CSSProperties = isSwapping
            ? {
                left: "50%",
                top: "50%",
              }
            : {
                left: `${pos.x}%`,
                top: `${pos.y}%`,
              };

          return (
            <div key={player.id} className={`role-slot ${isSelf ? "role-slot--self" : ""} ${isClickable && !isSelf ? "role-slot--clickable wk-slot--clickable" : ""} ${isSwapping ? "wk-slot--swapping" : ""} ${isTargetPlayer && phase === "submitted" ? "wk-slot--targeted" : ""}`} style={slotStyle} onClick={() => isClickable && !isSelf && handlePlayerClick(player.id)}>
              <span className={`role-name ${isSelf ? "role-name--self wk-name--self" : ""} ${isTargetPlayer && phase !== "idle" ? "wk-name--target" : ""}`}>{isSelf ? "YOU" : player.name}</span>

              <div
                className={`role-flip ${isSelf ? "role-flip--up" : ""} ${isSelf ? "role-flip--tappable" : ""}`}
                onClick={
                  isSelf
                    ? (e) => {
                        e.stopPropagation();
                        openModal(getFullCardImage("warlock"), "Warlock", "You");
                      }
                    : undefined
                }
              >
                <div className="role-flip-inner">
                  <div className="role-flip-face role-flip-face--back">
                    <img src={backCardImage} alt="Card back" draggable={false} />
                  </div>
                  <div className="role-flip-face role-flip-face--front">
                    <img src={isSelf ? getSquareImage("warlock") : backCardImage} alt={isSelf ? "Warlock" : "Card"} draggable={false} />
                  </div>
                </div>
              </div>

              {isSelf && <div className="role-glow role-glow--subtle-gold" />}
              {isTargetPlayer && phase !== "idle" && <div className="role-glow role-glow--gold" />}
            </div>
          );
        })}

        {/* Ground cards — hide the one being swapped */}
        <div className="role-ground">
          {groundCards.slice(0, 3).map((gc, idx) => {
            const isSwappingGround = isSwapPhase && swapGroundIdx === idx;

            return (
              <div key={gc.id} className="role-ground-card" style={isSwappingGround ? { visibility: "hidden" } : {}}>
                <div className="role-flip role-flip--ground">
                  <div className="role-flip-inner">
                    <div className="role-flip-face role-flip-face--back">
                      <img src={backCardImage} alt="Ground card" draggable={false} />
                    </div>
                    <div className="role-flip-face role-flip-face--front">
                      <img src={backCardImage} alt="Ground card" draggable={false} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Flying ground card — moves from center to the target player's spot */}
        {isSwapPhase && swapGroundIdx !== null && targetPos && (
          <div
            className="wk-flying-ground"
            style={{
              left: `${targetPos.x}%`,
              top: `${targetPos.y}%`,
            }}
          >
            <div className="role-flip role-flip--ground">
              <div className="role-flip-inner">
                <div className="role-flip-face role-flip-face--back">
                  <img src={backCardImage} alt="Ground card" draggable={false} />
                </div>
                <div className="role-flip-face role-flip-face--front">
                  <img src={backCardImage} alt="Ground card" draggable={false} />
                </div>
              </div>
            </div>
            <div className="role-glow role-glow--gold" />
          </div>
        )}

        {/* Center status text */}
        {phase === "submitted" && (
          <div className="role-center-message">
            <span className="role-status-text role-status-text--gold">HEXING...</span>
          </div>
        )}
        {phase === "swap" && (
          <div className="role-center-message">
            <span className="role-status-text role-status-text--gold">SWAPPING</span>
          </div>
        )}
        {phase === "done" && (
          <div className="role-center-message">
            <span className="role-status-text role-status-text--gold">CURSED</span>
          </div>
        )}
      </div>

      <div className="role-bottom">
        {locked ? (
          <span className="role-bottom-status">WAITING FOR YOUR TURN...</span>
        ) : (
          <>
            {phase === "idle" && <span className="role-bottom-hint">Tap a player to swap their role with a ground card</span>}
            {phase === "submitted" && <span className="role-bottom-status">CASTING HEX...</span>}
            {phase === "swap" && <span className="role-bottom-status">SWAPPING ROLES...</span>}
            {phase === "done" && <span className="role-bottom-status role-bottom-status--done">{actionResult?.targetName ? `${actionResult.targetName}'s role was swapped` : "Role swapped with ground card"}</span>}
          </>
        )}
      </div>

      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} subtitle={modalSubtitle} />
    </div>
  );
}

export default WarlockAction;
