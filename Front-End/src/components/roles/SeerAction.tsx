import { useState, useEffect, useRef, useCallback } from "react";
import { backCardImage } from "../../characters";
import { getSquareImage, getFullCardImage, getCirclePositions } from "../../utils/roleHelpers";
import CardModal from "../CardModal";
import "../roles/shared/RoleShared.css";
import "./SeerAction.css";

// ===== TYPES =====

interface SeerResult {
  actionType: "player" | "ground";
  playerName?: string;
  role?: string;
  team?: string;
  groundRole1?: string;
  groundRole2?: string;
  message?: string;
}

interface Props {
  onAction: (action: Record<string, unknown>) => void;
  locked?: boolean;
  playerId: string;
  players: Array<{ id: string; name: string }>;
  groundCards: Array<{ id: string; label: string }>;
  actionResult?: SeerResult | null;
}

// ===== COMPONENT =====

function SeerAction({ onAction, locked = false, playerId, players, groundCards, actionResult }: Props) {
  const [mode, setMode] = useState<"player" | "ground" | null>(null);
  const [submitted, setSubmitted] = useState(!!actionResult);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [revealedPlayerId, setRevealedPlayerId] = useState<string | null>(null);
  const [revealedPlayerRole, setRevealedPlayerRole] = useState<string>("");

  const [selectedGroundIds, setSelectedGroundIds] = useState<string[]>([]);
  const [revealedGroundMap, setRevealedGroundMap] = useState<Record<string, string>>({});

  const hasProcessedResult = useRef(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState<string | undefined>();

  const [groundModalOpen, setGroundModalOpen] = useState(false);
  const [groundModalCards, setGroundModalCards] = useState<Array<{ name: string; image: string }>>([]);

  const hasAutoModalFired = useRef(false);

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  // Lock clicks immediately when result arrives
  useEffect(() => {
    if (actionResult && !submitted) {
      setSubmitted(true);
    }
  }, [actionResult]);

  // Process result animation
  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    hasProcessedResult.current = true;

    if (actionResult.actionType === "player" && actionResult.role) {
      setMode("player");
      setRevealedPlayerRole(actionResult.role);
      const target = players.find((p) => p.name === actionResult.playerName);
      if (target) {
        setTimeout(() => {
          setRevealedPlayerId(target.id);
        }, 400);

        setTimeout(() => {
          if (hasAutoModalFired.current) return;
          hasAutoModalFired.current = true;
          setModalImage(getFullCardImage(actionResult.role!));
          setModalName(actionResult.role!);
          setModalSubtitle(actionResult.playerName);
          setModalOpen(true);
        }, 1100);
      }
    } else if (actionResult.actionType === "ground") {
      setMode("ground");

      // For auto-action: if no ground cards were selected by player, pick first two
      let groundIds = selectedGroundIds;
      if (groundIds.length === 0 && groundCards.length >= 2) {
        groundIds = [groundCards[0].id, groundCards[1].id];
        setSelectedGroundIds(groundIds);
      }

      const map: Record<string, string> = {};

      if (actionResult.groundRole1 && groundIds[0]) {
        map[groundIds[0]] = actionResult.groundRole1;
      }
      if (actionResult.groundRole2 && groundIds[1]) {
        map[groundIds[1]] = actionResult.groundRole2;
      }

      const entries = Object.entries(map);
      entries.forEach(([id, role], i) => {
        setTimeout(
          () => {
            setRevealedGroundMap((prev) => ({ ...prev, [id]: role }));
          },
          400 + i * 400,
        );
      });

      const totalFlipTime = 400 + (entries.length - 1) * 400;
      setTimeout(() => {
        if (hasAutoModalFired.current) return;
        hasAutoModalFired.current = true;

        const cards: Array<{ name: string; image: string }> = [];
        if (actionResult.groundRole1) {
          cards.push({ name: actionResult.groundRole1, image: getFullCardImage(actionResult.groundRole1) });
        }
        if (actionResult.groundRole2) {
          cards.push({ name: actionResult.groundRole2, image: getFullCardImage(actionResult.groundRole2) });
        }
        setGroundModalCards(cards);
        setGroundModalOpen(true);
      }, totalFlipTime + 600);
    }
  }, [actionResult, players, groundCards, selectedGroundIds]);

  const handlePlayerClick = useCallback(
    (targetId: string) => {
      if (submitted || mode === "ground" || targetId === playerId) return;

      setMode("player");
      setSelectedPlayerId(targetId);
      setSubmitted(true);

      onAction({
        type: "seer_player_role",
        targetPlayer: { id: targetId },
      });
    },
    [submitted, mode, playerId, onAction],
  );

  const handleGroundClick = useCallback(
    (groundId: string) => {
      if (submitted || mode === "player") return;
      if (selectedGroundIds.includes(groundId)) return;

      setMode("ground");

      const newSelected = [...selectedGroundIds, groundId];
      setSelectedGroundIds(newSelected);

      if (newSelected.length === 2) {
        setSubmitted(true);
        onAction({
          type: "seer_ground_roles",
          groundRole1: { id: newSelected[0] },
          groundRole2: { id: newSelected[1] },
        });
      }
    },
    [submitted, mode, selectedGroundIds, onAction],
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

  const canClickPlayers = !locked && !submitted && mode !== "ground";
  const canClickGround = !locked && !submitted && mode !== "player";

  return (
    <div className="role-action">
      <div className="role-circle-area">
        {players.map((player, i) => {
          const pos = positions[i];
          const isSelf = player.id === playerId;
          const isRevealed = revealedPlayerId === player.id;
          const isClickable = canClickPlayers && !isSelf;
          const isFaceUp = isSelf || isRevealed;

          return (
            <div key={player.id} className={`role-slot ${isSelf ? "role-slot--self" : ""} ${isRevealed ? "role-slot--revealed" : ""} ${isClickable ? "role-slot--clickable sr-slot--clickable" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }} onClick={() => isClickable && handlePlayerClick(player.id)}>
              <span className={`role-name ${isSelf ? "role-name--self sr-name--self" : ""} ${isRevealed ? "sr-name--revealed" : ""}`}>{isSelf ? "YOU" : player.name}</span>

              <div
                className={`role-flip ${isFaceUp ? "role-flip--up" : ""} ${isSelf || (isFaceUp && !locked) ? "role-flip--tappable" : ""}`}
                onClick={
                  isSelf
                    ? (e) => {
                        e.stopPropagation();
                        openModal(getFullCardImage("seer"), "Seer", "You");
                      }
                    : isFaceUp && !locked
                      ? (e) => {
                          e.stopPropagation();
                          openModal(getFullCardImage(revealedPlayerRole), revealedPlayerRole, player.name);
                        }
                      : undefined
                }
              >
                <div className="role-flip-inner">
                  <div className="role-flip-face role-flip-face--back">
                    <img src={backCardImage} alt="Card back" draggable={false} />
                  </div>
                  <div className="role-flip-face role-flip-face--front">
                    <img src={isSelf ? getSquareImage("seer") : isRevealed ? getSquareImage(revealedPlayerRole) : backCardImage} alt={isSelf ? "Seer" : isRevealed ? revealedPlayerRole : "Card"} draggable={false} />
                  </div>
                </div>
              </div>

              {isRevealed && <div className="role-glow role-glow--green" />}
              {isSelf && <div className="role-glow role-glow--subtle-green" />}
            </div>
          );
        })}

        <div className="role-ground">
          {groundCards.slice(0, 3).map((gc) => {
            const isRevealed = !!revealedGroundMap[gc.id];
            const isSelected = selectedGroundIds.includes(gc.id);
            const isClickable = canClickGround && !isRevealed;
            const revealedRole = revealedGroundMap[gc.id] || "";

            return (
              <div key={gc.id} className={`role-ground-card ${isSelected ? "sr-ground-card--selected" : ""} ${isRevealed ? "role-ground-card--revealed" : ""} ${isClickable ? "role-ground-card--clickable sr-ground-card--clickable" : ""}`} onClick={() => isClickable && handleGroundClick(gc.id)}>
                <div
                  className={`role-flip role-flip--ground ${isRevealed ? "role-flip--up" : ""} ${isRevealed ? "role-flip--tappable" : ""}`}
                  onClick={
                    isRevealed
                      ? (e) => {
                          e.stopPropagation();
                          openModal(getFullCardImage(revealedRole), revealedRole);
                        }
                      : undefined
                  }
                >
                  <div className="role-flip-inner">
                    <div className="role-flip-face role-flip-face--back">
                      <img src={backCardImage} alt="Ground card" draggable={false} />
                    </div>
                    <div className="role-flip-face role-flip-face--front">
                      <img src={isRevealed ? getSquareImage(revealedRole) : backCardImage} alt={isRevealed ? revealedRole : "Ground card"} draggable={false} />
                    </div>
                  </div>
                </div>
                {isRevealed && <div className="role-glow role-glow--green" />}
              </div>
            );
          })}
        </div>

        {!submitted && mode === "ground" && selectedGroundIds.length === 1 && (
          <div className="role-center-hint">
            <span className="role-hint-text">PICK ONE MORE</span>
          </div>
        )}
      </div>

      <div className="role-bottom">
        {locked ? (
          <span className="role-bottom-status">WAITING FOR YOUR TURN...</span>
        ) : !submitted ? (
          <span className="role-bottom-hint">{mode === "ground" ? `${selectedGroundIds.length}/2 ground cards selected` : "Choose a player's card or two ground cards"}</span>
        ) : !actionResult ? (
          <span className="role-bottom-status">REVEALING...</span>
        ) : (
          <span className="role-bottom-status role-bottom-status--done">{actionResult.actionType === "player" ? `You saw ${actionResult.playerName}'s role` : "You peeked at the ground"}</span>
        )}
      </div>

      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} subtitle={modalSubtitle} />

      {groundModalOpen && (
        <div className="role-pack-overlay" onClick={() => setGroundModalOpen(false)}>
          <div className="role-pack-modal" onClick={(e) => e.stopPropagation()}>
            <span className="role-pack-title role-pack-title--green">GROUND CARDS</span>
            <div className="role-pack-cards">
              {groundModalCards.map((card, i) => (
                <div key={i} className="role-pack-card">
                  <img src={card.image} alt={card.name} className="role-pack-img role-pack-img--green" />
                  <span className="role-pack-name">{card.name}</span>
                </div>
              ))}
            </div>
            <button className="role-pack-close" onClick={() => setGroundModalOpen(false)}>
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SeerAction;
