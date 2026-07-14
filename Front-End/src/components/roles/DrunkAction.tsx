import { useState, useEffect, useRef, useCallback } from "react";
import { backCardImage } from "../../characters";
import { getSquareImage, getFullCardImage, getCirclePositions } from "../../utils/roleHelpers";
import CardModal from "../CardModal";
import "../roles/shared/RoleShared.css";
import "./DrunkAction.css";

interface DrunkResult {
  success: boolean;
  targetRoleId?: string;
  targetGroundIndex?: number;
  message?: string;
}

interface Props {
  onAction: (action: Record<string, unknown>) => void;
  locked?: boolean;
  playerId: string;
  players: Array<{ id: string; name: string }>;
  groundCards: Array<{ id: string; label: string }>;
  actionResult?: DrunkResult | null;
}

type Phase = "idle" | "submitted" | "swap" | "done";

function DrunkAction({ locked = false, playerId, players, groundCards, actionResult }: Props) {
  const isRejoin = !!actionResult;
  const initialGroundIndex = typeof actionResult?.targetGroundIndex === "number" ? actionResult.targetGroundIndex : null;

  const [phase, setPhase] = useState<Phase>(isRejoin ? "done" : "idle");
  const [selectedGroundIndex, setSelectedGroundIndex] = useState<number | null>(initialGroundIndex);
  const hasProcessedResult = useRef(isRejoin);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState<string | undefined>();

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const playerPositions = getCirclePositions(players.length, selfIndex);
  const selfPos = playerPositions[selfIndex];

  const visibleGround = groundCards.slice(0, 3);

  const groundPositions: Array<{ x: number; y: number }> = visibleGround.map((_, idx) => {
    const spacing = 16;
    const startX = 50 - ((visibleGround.length - 1) * spacing) / 2;
    return { x: startX + idx * spacing, y: 50 };
  });

  const resolvedGroundIndex = selectedGroundIndex ?? -1;

  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    hasProcessedResult.current = true;
    if (phase === "done") return;

    const resultGroundIndex =
      typeof actionResult.targetGroundIndex === "number"
        ? actionResult.targetGroundIndex
        : actionResult.targetRoleId
          ? visibleGround.findIndex((gc) => gc.id === actionResult.targetRoleId)
          : -1;

    if (resultGroundIndex < 0 || resultGroundIndex >= visibleGround.length) return;

    setTimeout(() => {
      setSelectedGroundIndex(resultGroundIndex);
      setPhase("submitted");
    }, 0);

    const swapTimer = setTimeout(() => {
      setPhase("swap");
      setTimeout(() => setPhase("done"), 900);
    }, 100);

    return () => clearTimeout(swapTimer);
  }, [actionResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const openModal = useCallback((image: string, name: string, subtitle?: string) => {
    setModalImage(image);
    setModalName(name);
    setModalSubtitle(subtitle);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const shouldSwap = phase === "swap" || phase === "done";

  const getSelfPos = (): { x: number; y: number } => {
    if (shouldSwap && resolvedGroundIndex >= 0) {
      return groundPositions[resolvedGroundIndex];
    }
    return selfPos;
  };

  const getGroundPos = (idx: number): { x: number; y: number } => {
    if (shouldSwap && idx === resolvedGroundIndex) {
      return selfPos;
    }
    return groundPositions[idx];
  };

  return (
    <div className="role-action">
      <div className="role-circle-area dk-circle-area">
        {players.map((player, i) => {
          const isSelf = player.id === playerId;
          const pos = isSelf ? getSelfPos() : playerPositions[i];
          const isSwapping = isSelf && shouldSwap;

          return (
            <div key={player.id} className={`dk-slot ${isSelf ? "dk-slot--self" : ""} ${isSwapping ? "dk-slot--swapping" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              <span className={`role-name ${isSelf ? "role-name--self dk-name--self" : ""}`}>{isSelf ? (shouldSwap ? "" : "YOU") : player.name}</span>

              <div className={`dk-card ${isSelf ? "dk-card--face dk-card--tappable" : ""}`} onClick={isSelf ? () => openModal(getFullCardImage("drunk"), "Drunk", "You") : undefined}>
                <img src={isSelf ? getSquareImage("drunk") : backCardImage} alt={isSelf ? "Drunk" : "Card back"} className="dk-card-img" draggable={false} />
              </div>
            </div>
          );
        })}

        {visibleGround.map((gc, idx) => {
          const isSelected = idx === resolvedGroundIndex;
          const pos = getGroundPos(idx);
          const isSwapping = isSelected && shouldSwap;

          return (
            <div key={`${gc.id}-${idx}`} className={`dk-slot dk-slot--ground ${isSelected ? "dk-slot--selected" : ""} ${isSwapping ? "dk-slot--swapping" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              <span className={`role-name ${isSwapping ? "dk-name--self" : ""}`}>{isSwapping ? "YOU" : "\u00A0"}</span>
              <div className="dk-card dk-card--ground">
                <img src={backCardImage} alt="Ground card" className="dk-card-img" draggable={false} />
              </div>
            </div>
          );
        })}

        {phase === "idle" && !locked && (
          <div className="role-center-hint">
            <span className="role-hint-text">A GROUND CARD CALLS</span>
          </div>
        )}
        {phase === "swap" && (
          <div className="role-center-message dk-center-message">
            <span className="role-status-text role-status-text--gold">SWAPPING...</span>
          </div>
        )}
        {phase === "done" && (
          <div className="role-center-message dk-center-message">
            <span className="role-status-text role-status-text--gold">SWAPPED</span>
          </div>
        )}
      </div>

      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} subtitle={modalSubtitle} />
    </div>
  );
}

export default DrunkAction;
