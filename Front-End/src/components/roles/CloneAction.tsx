import { useState, useEffect, useRef, useCallback } from "react";
import { characters, allCards, backCardImage } from "../../characters";
import CardModal from "../CardModal";
import "./CloneAction.css";
import "../roles/shared/RoleShared.css";
import { getCirclePositions } from "../../utils/roleHelpers";

import WerewolfAction from "./WerewolfAction";
import SeerAction from "./SeerAction";
import MasonAction from "./MasonAction";
import RobberAction from "./RobberAction";
import TroublemakerAction from "./TroublemakerAction";
import DrunkAction from "./DrunkAction";
import JokerAction from "./JokerAction";
import InsomniacAction from "./InsomniacAction";
import WarlockAction from "./WarlockAction";
import OracleAction from "./OracleAction";

// ===== TYPES =====

interface CloneResult {
  clonedRole: string;
  clonedRoleTeam: string;
  needsSecondAction: boolean;
  autoResult: Record<string, unknown> | null;
  groundCards: Array<{ id: string; label: string }> | null;
  otherPlayers: Array<{ id: string; name: string }> | null;
  message: string;
}

interface Props {
  playerId: string;
  locked?: boolean;
  players: Array<{ id: string; name: string }>;
  groundCards: Array<{ id: string; label: string }>;
  onAction: (action: Record<string, unknown>) => void;
  onCloneFirstAction: (action: Record<string, unknown>) => void;
  cloneResult: CloneResult | null;
  actionResult?: Record<string, unknown> | null;
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

const ACTIVE_CLONE_ROLES = new Set(["seer", "robber", "troublemaker", "drunk", "joker", "warlock"]);

type ClonePhase = "pick" | "cloning" | "morph" | "phase2";

// ===== COMPONENT =====

function CloneAction({ playerId, locked = false, players, groundCards, onAction, onCloneFirstAction, cloneResult, actionResult }: Props) {
  const [phase, setPhase] = useState<ClonePhase>(cloneResult ? "phase2" : "pick");
  const [targetId, setTargetId] = useState<string | null>(null);
  const clonedRoleName = cloneResult?.clonedRole || "";
  const hasProcessedCloneResult = useRef(!!cloneResult);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState<string | undefined>();

  // Auto-modal ref
  const hasAutoModalFired = useRef(false);

  // Track mounted state to prevent setState on unmounted component
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  // Process clone result — morph animation then transition to phase 2
  useEffect(() => {
    if (!cloneResult || hasProcessedCloneResult.current) return;
    hasProcessedCloneResult.current = true;

    const morphTimer = setTimeout(() => {
      if (!mountedRef.current) return;
      setPhase("morph");
    }, 50);

    const modalTimer = setTimeout(() => {
      if (!mountedRef.current) return;
      if (hasAutoModalFired.current) return;
      hasAutoModalFired.current = true;
      setModalImage(getFullCardImage(cloneResult.clonedRole));
      setModalName(cloneResult.clonedRole);
      setModalSubtitle("You cloned this role");
      setModalOpen(true);
    }, 1200);

    const phaseTimer = setTimeout(() => {
      if (!mountedRef.current) return;
      setPhase("phase2");
    }, 2000);

    return () => {
      clearTimeout(morphTimer);
      clearTimeout(modalTimer);
      clearTimeout(phaseTimer);
    };
  }, [cloneResult]);

  const handlePlayerClick = (clickedId: string) => {
    if (locked || phase !== "pick" || clickedId === playerId) return;

    setTargetId(clickedId);
    setPhase("cloning");
    onCloneFirstAction({ type: "clone", targetPlayer: { id: clickedId } });
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

  const isClickable = !locked && phase === "pick";

  const buildPlayerListForPhase2 = (): Array<{ id: string; name: string }> => {
    const selfPlayer = players.find((p) => p.id === playerId);
    const selfEntry = selfPlayer || { id: playerId, name: "Player" };
    const others = cloneResult?.otherPlayers || players.filter((p) => p.id !== playerId);

    const hasId = others.some((p) => p.id === playerId);
    if (hasId) return others;
    return [selfEntry, ...others];
  };

  // ===== PHASE 2 RENDER =====

  if (phase === "phase2" && cloneResult) {
    const roleLower = cloneResult.clonedRole.toLowerCase();

    const phase2Players = buildPlayerListForPhase2();
    const secondaryGroundCards = cloneResult.groundCards || groundCards;

    if (ACTIVE_CLONE_ROLES.has(roleLower)) {
      return (
        <div className="cl-phase2">
          {roleLower === "seer" && <SeerAction onAction={onAction} locked={locked} playerId={playerId} players={phase2Players} groundCards={secondaryGroundCards} actionResult={actionResult as never} />}
          {roleLower === "robber" && <RobberAction onAction={onAction} locked={locked} playerId={playerId} players={phase2Players} actionResult={actionResult as never} />}
          {roleLower === "troublemaker" && <TroublemakerAction onAction={onAction} locked={locked} playerId={playerId} players={phase2Players} actionResult={actionResult as never} />}
          {roleLower === "drunk" && <DrunkAction onAction={onAction} locked={locked} playerId={playerId} players={phase2Players} groundCards={secondaryGroundCards} actionResult={actionResult as never} />}
          {roleLower === "joker" && <JokerAction onAction={onAction} locked={locked} playerId={playerId} players={phase2Players} groundCards={secondaryGroundCards} actionResult={(actionResult && "groundRole" in actionResult ? actionResult : null) as never} />}
          {roleLower === "warlock" && <WarlockAction onAction={onAction} locked={locked} playerId={playerId} players={phase2Players} groundCards={secondaryGroundCards} actionResult={actionResult as never} />}
        </div>
      );
    }

    if (roleLower === "werewolf") {
      return (
        <div className="cl-phase2">
          <div className="cl-banner">
            <span className="cl-banner-text">CLONED → WEREWOLF</span>
          </div>
          <WerewolfAction onAction={onAction} locked={locked} playerId={playerId} players={players} groundCards={groundCards} actionResult={cloneResult.autoResult as never} />
        </div>
      );
    }

    if (roleLower === "mason") {
      return (
        <div className="cl-phase2">
          <MasonAction onAction={onAction} locked={locked} playerId={playerId} players={players} actionResult={cloneResult.autoResult as never} />
        </div>
      );
    }

    if (roleLower === "insomniac") {
      return (
        <div className="cl-phase2">
          <InsomniacAction onAction={onAction} locked={locked} actionResult={actionResult as never} autoSubmitted />
        </div>
      );
    }

    if (roleLower === "oracle") {
      return (
        <div className="cl-phase2">
          <OracleAction onAction={onAction} locked={locked} actionResult={actionResult as never} autoSubmitted />
        </div>
      );
    }

    // Minion / other passive
    const autoMessage = cloneResult.autoResult ? (cloneResult.autoResult as { message?: string }).message || cloneResult.message : cloneResult.message;

    return (
      <div className="cl-phase2">
        <div className="cl-banner">
          <span className="cl-banner-text">CLONED → {cloneResult.clonedRole.toUpperCase()}</span>
        </div>
        <div className="cl-passive-result">
          <div className="cl-passive-card cl-passive-card--tappable" onClick={() => openModal(getFullCardImage(cloneResult.clonedRole), cloneResult.clonedRole)}>
            <img src={getSquareImage(cloneResult.clonedRole)} alt={cloneResult.clonedRole} draggable={false} />
          </div>
          <p className="cl-passive-text">{autoMessage}</p>
        </div>
        <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} subtitle={modalSubtitle} />
      </div>
    );
  }

  // ===== PHASE 1 RENDER (pick / cloning / morph) =====

  return (
    <div className="role-action">
      <div className="role-circle-area">
        {players.map((player, i) => {
          const isSelf = player.id === playerId;
          const isTarget = player.id === targetId;
          const pos = positions[i];

          const showTargetFace = isTarget && (phase === "morph" || phase === "phase2") && !!clonedRoleName;

          const isMorphing = isSelf && phase === "morph";
          const isMorphed = isSelf && phase === "phase2";

          return (
            <div key={player.id} className={`role-slot ${isSelf ? "role-slot--self" : ""} ${showTargetFace ? "role-slot--revealed" : ""} ${isClickable && !isSelf ? "role-slot--clickable cl-slot--clickable" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }} onClick={() => isClickable && !isSelf && handlePlayerClick(player.id)}>
              <span className={`role-name ${isSelf ? "role-name--self cl-name--self" : ""} ${showTargetFace ? "cl-name--target" : ""}`}>{isSelf ? "YOU" : player.name}</span>

              {isSelf ? (
                <div
                  className={`cl-morph-container ${isMorphing ? "cl-morph-container--morphing" : ""} cl-morph-container--tappable`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const role = clonedRoleName || "clone";
                    openModal(getFullCardImage(role), role, "You");
                  }}
                >
                  <div className={`cl-morph-card cl-morph-card--clone ${isMorphing ? "cl-morph-card--fade-out" : ""} ${isMorphed ? "cl-morph-card--hidden" : ""}`}>
                    <img src={getSquareImage("clone")} alt="Clone" draggable={false} />
                  </div>
                  {clonedRoleName && (
                    <div className={`cl-morph-card cl-morph-card--role ${isMorphing ? "cl-morph-card--fade-in" : ""} ${isMorphed ? "cl-morph-card--visible" : ""} ${!isMorphing && !isMorphed ? "cl-morph-card--hidden" : ""}`}>
                      <img src={getSquareImage(clonedRoleName)} alt={clonedRoleName} draggable={false} />
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`role-flip ${showTargetFace ? "role-flip--up" : ""} ${isSelf || (showTargetFace && !locked) ? "role-flip--tappable" : ""}`}
                  onClick={
                    showTargetFace && !locked
                      ? (e) => {
                          e.stopPropagation();
                          openModal(getFullCardImage(clonedRoleName), clonedRoleName, player.name);
                        }
                      : undefined
                  }
                >
                  <div className="role-flip-inner">
                    <div className="role-flip-face role-flip-face--back">
                      <img src={backCardImage} alt="Card back" draggable={false} />
                    </div>
                    <div className="role-flip-face role-flip-face--front">
                      <img src={showTargetFace ? getSquareImage(clonedRoleName) : backCardImage} alt={showTargetFace ? clonedRoleName : "Card"} draggable={false} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {phase === "pick" && !locked && (
          <div className="role-center-hint">
            <span className="role-hint-text">PICK A PLAYER TO CLONE</span>
          </div>
        )}
        {phase === "cloning" && (
          <div className="role-center-hint">
            <span className="role-hint-text">CLONING...</span>
          </div>
        )}
        {phase === "morph" && clonedRoleName && (
          <div className="role-center-message">
            <span className="role-status-text role-status-text--green">CLONED → {clonedRoleName.toUpperCase()}</span>
          </div>
        )}
      </div>

      <div className="role-bottom">
        {locked ? (
          <span className="role-bottom-status">WAITING FOR YOUR TURN...</span>
        ) : (
          <>
            {phase === "pick" && <span className="role-bottom-hint">Tap a player to copy their role</span>}
            {phase === "cloning" && <span className="role-bottom-status">CLONING...</span>}
            {phase === "morph" && <span className="role-bottom-status cl-bottom-status--morph">Becoming {clonedRoleName}...</span>}
          </>
        )}
      </div>

      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} subtitle={modalSubtitle} />
    </div>
  );
}

export default CloneAction;
