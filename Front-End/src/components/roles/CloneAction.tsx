import { useState, useEffect, useRef } from "react";
import { allCards, backCardImage } from "../../characters";
import "./CloneAction.css";

import WerewolfAction from "./WerewolfAction";
import SeerAction from "./SeerAction";
import MasonAction from "./MasonAction";
import RobberAction from "./RobberAction";
import TroublemakerAction from "./TroublemakerAction";
import DrunkAction from "./DrunkAction";
import JokerAction from "./JokerAction";
import InsomniacAction from "./InsomniacAction";

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
  players: Array<{ id: string; name: string }>;
  groundCards: Array<{ id: string; label: string }>;
  onAction: (action: Record<string, unknown>) => void;
  onCloneFirstAction: (action: Record<string, unknown>) => void;
  cloneResult: CloneResult | null;
  actionResult?: Record<string, unknown> | null;
}

// ===== HELPERS =====

function getCardImage(roleName: string): string {
  const card = allCards.find((c) => c.name.toLowerCase() === roleName.toLowerCase());
  return card?.image || backCardImage;
}

function getCloneCardImage(): string {
  return getCardImage("clone");
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

const ACTIVE_CLONE_ROLES = new Set(["seer", "robber", "troublemaker", "drunk", "joker"]);

type ClonePhase = "pick" | "cloning" | "morph" | "phase2";

// ===== COMPONENT =====

function CloneAction({ playerId, players, groundCards, onAction, onCloneFirstAction, cloneResult, actionResult }: Props) {
  const initialClonedRole = cloneResult?.clonedRole || "";

  const [phase, setPhase] = useState<ClonePhase>(cloneResult ? "phase2" : "pick");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [clonedRoleName, setClonedRoleName] = useState<string>(initialClonedRole);
  const hasProcessedCloneResult = useRef(!!cloneResult);

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  useEffect(() => {
    if (!cloneResult || hasProcessedCloneResult.current) return;
    hasProcessedCloneResult.current = true;

    queueMicrotask(() => {
      setClonedRoleName(cloneResult.clonedRole);
      setPhase("morph");
    });

    const timer = setTimeout(() => {
      setPhase("phase2");
    }, 2000);

    return () => clearTimeout(timer);
  }, [cloneResult]);

  const handlePlayerClick = (clickedId: string) => {
    if (phase !== "pick" || clickedId === playerId) return;

    setTargetId(clickedId);
    setPhase("cloning");
    onCloneFirstAction({ type: "clone", targetPlayer: { id: clickedId } });
  };

  const isClickable = phase === "pick";

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

    // Active roles — render their full action component
    if (ACTIVE_CLONE_ROLES.has(roleLower)) {
      return (
        <div className="cl-phase2">
          <div className="cl-banner">
            <span className="cl-banner-text">CLONED → {cloneResult.clonedRole.toUpperCase()}</span>
          </div>
          {roleLower === "seer" && <SeerAction onAction={onAction} playerId={playerId} players={phase2Players} groundCards={secondaryGroundCards} actionResult={actionResult as never} />}
          {roleLower === "robber" && <RobberAction onAction={onAction} playerId={playerId} players={phase2Players} actionResult={actionResult as never} />}
          {roleLower === "troublemaker" && <TroublemakerAction onAction={onAction} playerId={playerId} players={phase2Players} actionResult={actionResult as never} />}
          {roleLower === "drunk" && <DrunkAction onAction={onAction} playerId={playerId} players={phase2Players} groundCards={secondaryGroundCards} actionResult={actionResult as never} />}
          {roleLower === "joker" && <JokerAction onAction={onAction} playerId={playerId} players={phase2Players} groundCards={secondaryGroundCards} actionResult={actionResult as never} />}
        </div>
      );
    }

    // Werewolf
    if (roleLower === "werewolf") {
      return (
        <div className="cl-phase2">
          <div className="cl-banner">
            <span className="cl-banner-text">CLONED → WEREWOLF</span>
          </div>
          <WerewolfAction onAction={onAction} playerId={playerId} players={players} groundCards={groundCards} actionResult={cloneResult.autoResult as never} />
        </div>
      );
    }

    // Mason
    if (roleLower === "mason") {
      return (
        <div className="cl-phase2">
          <div className="cl-banner">
            <span className="cl-banner-text">CLONED → MASON</span>
          </div>
          <MasonAction onAction={onAction} playerId={playerId} players={players} actionResult={cloneResult.autoResult as never} />
        </div>
      );
    }

    // Insomniac — autoSubmitted so it waits for cloneInsomniacResult
    if (roleLower === "insomniac") {
      return (
        <div className="cl-phase2">
          <div className="cl-banner">
            <span className="cl-banner-text">CLONED → INSOMNIAC</span>
          </div>
          <InsomniacAction onAction={onAction} actionResult={actionResult as never} autoSubmitted />
        </div>
      );
    }

    // Minion / other passive — show message
    const autoMessage = cloneResult.autoResult ? (cloneResult.autoResult as { message?: string }).message || cloneResult.message : cloneResult.message;

    return (
      <div className="cl-phase2">
        <div className="cl-banner">
          <span className="cl-banner-text">CLONED → {cloneResult.clonedRole.toUpperCase()}</span>
        </div>
        <div className="cl-passive-result">
          <div className="cl-passive-card">
            <img src={getCardImage(cloneResult.clonedRole)} alt={cloneResult.clonedRole} draggable={false} />
          </div>
          <p className="cl-passive-text">{autoMessage}</p>
        </div>
      </div>
    );
  }

  // ===== PHASE 1 RENDER (pick / cloning / morph) =====

  return (
    <div className="cl-action">
      <div className="cl-circle-area">
        {players.map((player, i) => {
          const isSelf = player.id === playerId;
          const isTarget = player.id === targetId;
          const pos = positions[i];

          const showTargetFace = isTarget && (phase === "morph" || phase === "phase2") && !!clonedRoleName;

          const isMorphing = isSelf && phase === "morph";
          const isMorphed = isSelf && phase === "phase2";

          return (
            <div key={player.id} className={`cl-slot ${isSelf ? "cl-slot--self" : ""} ${showTargetFace ? "cl-slot--revealed" : ""} ${isClickable && !isSelf ? "cl-slot--clickable" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }} onClick={() => isClickable && !isSelf && handlePlayerClick(player.id)}>
              <span className={`cl-name ${isSelf ? "cl-name--self" : ""} ${showTargetFace ? "cl-name--target" : ""}`}>{isSelf ? "YOU" : player.name}</span>

              {isSelf ? (
                <div className={`cl-morph-container ${isMorphing ? "cl-morph-container--morphing" : ""}`}>
                  <div className={`cl-morph-card cl-morph-card--clone ${isMorphing ? "cl-morph-card--fade-out" : ""} ${isMorphed ? "cl-morph-card--hidden" : ""}`}>
                    <img src={getCloneCardImage()} alt="Clone" draggable={false} />
                  </div>
                  {clonedRoleName && (
                    <div className={`cl-morph-card cl-morph-card--role ${isMorphing ? "cl-morph-card--fade-in" : ""} ${isMorphed ? "cl-morph-card--visible" : ""} ${!isMorphing && !isMorphed ? "cl-morph-card--hidden" : ""}`}>
                      <img src={getCardImage(clonedRoleName)} alt={clonedRoleName} draggable={false} />
                    </div>
                  )}
                </div>
              ) : (
                <div className={`cl-flip ${showTargetFace ? "cl-flip--up" : ""}`}>
                  <div className="cl-flip-inner">
                    <div className="cl-flip-face cl-flip-face--back">
                      <img src={backCardImage} alt="Card back" draggable={false} />
                    </div>
                    <div className="cl-flip-face cl-flip-face--front">
                      <img src={showTargetFace ? getCardImage(clonedRoleName) : backCardImage} alt={showTargetFace ? clonedRoleName : "Card"} draggable={false} />
                    </div>
                  </div>
                </div>
              )}

              {showTargetFace && <div className="cl-glow cl-glow--green" />}
              {isSelf && <div className="cl-glow cl-glow--green cl-glow--subtle" />}
            </div>
          );
        })}

        {phase === "pick" && (
          <div className="cl-center-hint">
            <span className="cl-hint-text">PICK A PLAYER TO CLONE</span>
          </div>
        )}
        {phase === "cloning" && (
          <div className="cl-center-hint">
            <span className="cl-hint-text">CLONING...</span>
          </div>
        )}
        {phase === "morph" && clonedRoleName && (
          <div className="cl-center-message">
            <span className="cl-msg-text">CLONED → {clonedRoleName.toUpperCase()}</span>
          </div>
        )}
      </div>

      <div className="cl-bottom">
        {phase === "pick" && <span className="cl-bottom-hint">Tap a player to copy their role</span>}
        {phase === "cloning" && <span className="cl-bottom-status">CLONING...</span>}
        {phase === "morph" && <span className="cl-bottom-status cl-bottom-status--morph">Becoming {clonedRoleName}...</span>}
      </div>
    </div>
  );
}

export default CloneAction;
