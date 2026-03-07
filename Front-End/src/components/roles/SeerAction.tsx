import { useState, useEffect, useRef, useCallback } from "react";
import { characters, allCards, backCardImage } from "../../characters";
import CardModal from "../CardModal";
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
  playerId: string;
  players: Array<{ id: string; name: string }>;
  groundCards: Array<{ id: string; label: string }>;
  actionResult?: SeerResult | null;
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

// ===== COMPONENT =====

function SeerAction({ onAction, playerId, players, groundCards, actionResult }: Props) {
  const [mode, setMode] = useState<"player" | "ground" | null>(null);
  const [submitted, setSubmitted] = useState(!!actionResult);

  // Player selection
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [revealedPlayerId, setRevealedPlayerId] = useState<string | null>(null);
  const [revealedPlayerRole, setRevealedPlayerRole] = useState<string>("");

  // Ground selection
  const [selectedGroundIds, setSelectedGroundIds] = useState<string[]>([]);
  const [revealedGroundMap, setRevealedGroundMap] = useState<Record<string, string>>({});

  const hasProcessedResult = useRef(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState<string | undefined>();

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  // Process action result
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
      }
    } else if (actionResult.actionType === "ground") {
      setMode("ground");
      const map: Record<string, string> = {};

      if (actionResult.groundRole1 && selectedGroundIds[0]) {
        map[selectedGroundIds[0]] = actionResult.groundRole1;
      }
      if (actionResult.groundRole2 && selectedGroundIds[1]) {
        map[selectedGroundIds[1]] = actionResult.groundRole2;
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

  const canClickPlayers = !submitted && mode !== "ground";
  const canClickGround = !submitted && mode !== "player";

  return (
    <div className="sr-action">
      <div className="sr-circle-area">
        {/* Player cards around the circle */}
        {players.map((player, i) => {
          const pos = positions[i];
          const isSelf = player.id === playerId;
          const isRevealed = revealedPlayerId === player.id;
          const isClickable = canClickPlayers && !isSelf;
          const isFaceUp = isSelf || isRevealed;

          return (
            <div key={player.id} className={`sr-slot ${isSelf ? "sr-slot--self" : ""} ${isRevealed ? "sr-slot--revealed" : ""} ${isClickable ? "sr-slot--clickable" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }} onClick={() => isClickable && handlePlayerClick(player.id)}>
              <span className={`sr-name ${isSelf ? "sr-name--self" : ""} ${isRevealed ? "sr-name--revealed" : ""}`}>{isSelf ? "YOU" : player.name}</span>

              <div
                className={`sr-flip ${isFaceUp ? "sr-flip--up" : ""} ${isFaceUp ? "sr-flip--tappable" : ""}`}
                onClick={
                  isFaceUp
                    ? (e) => {
                        e.stopPropagation();
                        openModal(isSelf ? getFullCardImage("seer") : getFullCardImage(revealedPlayerRole), isSelf ? "Seer" : revealedPlayerRole, isSelf ? "You" : player.name);
                      }
                    : undefined
                }
              >
                <div className="sr-flip-inner">
                  <div className="sr-flip-face sr-flip-face--back">
                    <img src={backCardImage} alt="Card back" draggable={false} />
                  </div>
                  <div className="sr-flip-face sr-flip-face--front">
                    <img src={isSelf ? getSquareImage("seer") : isRevealed ? getSquareImage(revealedPlayerRole) : backCardImage} alt={isSelf ? "Seer" : isRevealed ? revealedPlayerRole : "Card"} draggable={false} />
                  </div>
                </div>
              </div>

              {isRevealed && <div className="sr-glow sr-glow--green" />}
              {isSelf && <div className="sr-glow sr-glow--green sr-glow--subtle" />}
            </div>
          );
        })}

        {/* Ground cards in the center */}
        <div className="sr-ground">
          {groundCards.slice(0, 3).map((gc) => {
            const isRevealed = !!revealedGroundMap[gc.id];
            const isSelected = selectedGroundIds.includes(gc.id);
            const isClickable = canClickGround && !isRevealed;
            const revealedRole = revealedGroundMap[gc.id] || "";

            return (
              <div key={gc.id} className={`sr-ground-card ${isSelected ? "sr-ground-card--selected" : ""} ${isRevealed ? "sr-ground-card--revealed" : ""} ${isClickable ? "sr-ground-card--clickable" : ""}`} onClick={() => isClickable && handleGroundClick(gc.id)}>
                <div
                  className={`sr-flip sr-flip--ground ${isRevealed ? "sr-flip--up" : ""} ${isRevealed ? "sr-flip--tappable" : ""}`}
                  onClick={
                    isRevealed
                      ? (e) => {
                          e.stopPropagation();
                          openModal(getFullCardImage(revealedRole), revealedRole);
                        }
                      : undefined
                  }
                >
                  <div className="sr-flip-inner">
                    <div className="sr-flip-face sr-flip-face--back">
                      <img src={backCardImage} alt="Ground card" draggable={false} />
                    </div>
                    <div className="sr-flip-face sr-flip-face--front">
                      <img src={isRevealed ? getSquareImage(revealedRole) : backCardImage} alt={isRevealed ? revealedRole : "Ground card"} draggable={false} />
                    </div>
                  </div>
                </div>
                {isRevealed && <div className="sr-glow sr-glow--green" />}
              </div>
            );
          })}
        </div>

        {/* Instruction / status in center */}

        {!submitted && mode === "ground" && selectedGroundIds.length === 1 && (
          <div className="sr-center-hint">
            <span className="sr-hint-text">PICK ONE MORE</span>
          </div>
        )}
      </div>

      {/* Bottom status */}
      <div className="sr-bottom">
        {!submitted ? (
          <span className="sr-bottom-hint">{mode === "ground" ? `${selectedGroundIds.length}/2 ground cards selected` : "Choose a player's card or two ground cards"}</span>
        ) : !actionResult ? (
          <span className="sr-bottom-status">REVEALING...</span>
        ) : (
          <span className="sr-bottom-status sr-bottom-status--done">{actionResult.actionType === "player" ? `You saw ${actionResult.playerName}'s role` : "You peeked at the ground"}</span>
        )}
      </div>

      {/* Card Modal */}
      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} subtitle={modalSubtitle} />
    </div>
  );
}

export default SeerAction;
