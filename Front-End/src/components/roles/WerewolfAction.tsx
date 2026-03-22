import { useState, useEffect, useRef, useCallback } from "react";
import { backCardImage } from "../../characters";
import { getSquareImage, getFullCardImage, getCirclePositions } from "../../utils/roleHelpers";
import CardModal from "../CardModal";
import "../roles/shared/RoleShared.css";
import "./werewolfAction.css";

// ===== TYPES =====

interface WerewolfResult {
  isAlone: boolean;
  werewolves?: Array<{ id: string; name: string }>;
  groundCard?: string;
  message?: string;
}

interface Props {
  onAction: (action: Record<string, unknown>) => void;
  locked?: boolean;
  playerId: string;
  players: Array<{ id: string; name: string }>;
  groundCards: Array<{ id: string; label: string }>;
  actionResult?: WerewolfResult | null;
}

// ===== COMPONENT =====

function WerewolfAction({ onAction, locked = false, playerId, players, groundCards, actionResult }: Props) {
  const [submitted, setSubmitted] = useState(!!actionResult);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [revealedGroundIdx, setRevealedGroundIdx] = useState<number | null>(null);
  const [groundCardName, setGroundCardName] = useState<string>("");
  const hasProcessedResult = useRef(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState<string | undefined>();

  // Pack modal state
  const [packModalOpen, setPackModalOpen] = useState(false);
  const [packWolves, setPackWolves] = useState<Array<{ name: string; image: string }>>([]);

  const hasAutoModalFired = useRef(false);

  const selfIndex = players.findIndex((p) => p.id === playerId);
  const positions = getCirclePositions(players.length, selfIndex);

  useEffect(() => {
    if (actionResult && !submitted) {
      setSubmitted(true);
    }
  }, [actionResult]);

  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    hasProcessedResult.current = true;

    if (!actionResult.isAlone && actionResult.werewolves) {
      const wwIds = actionResult.werewolves.map((w) => w.id);
      const totalFlipTime = 500 + (wwIds.length - 1) * 400;

      wwIds.forEach((id, i) => {
        setTimeout(
          () => {
            setRevealedIds((prev) => new Set([...prev, id]));
          },
          500 + i * 400,
        );
      });

      setTimeout(() => {
        if (hasAutoModalFired.current) return;
        hasAutoModalFired.current = true;

        if (actionResult.werewolves!.length === 1) {
          const wolf = actionResult.werewolves![0];
          setModalImage(getFullCardImage("werewolf"));
          setModalName("Werewolf");
          setModalSubtitle(wolf.name);
          setModalOpen(true);
        } else {
          const wolves = actionResult.werewolves!.map((w) => ({
            name: w.name,
            image: getFullCardImage("werewolf"),
          }));
          setPackWolves(wolves);
          setPackModalOpen(true);
        }
      }, totalFlipTime + 600);
    } else if (actionResult.isAlone && actionResult.groundCard) {
      setGroundCardName(actionResult.groundCard);
      const randomIdx = Math.floor(Math.random() * Math.max(groundCards.length, 1));

      setTimeout(() => {
        setRevealedGroundIdx(randomIdx);
      }, 500);

      setTimeout(() => {
        if (hasAutoModalFired.current) return;
        hasAutoModalFired.current = true;

        setModalImage(getFullCardImage(actionResult.groundCard!));
        setModalName(actionResult.groundCard!);
        setModalSubtitle("You peeked at this ground card");
        setModalOpen(true);
      }, 1400);
    }
  }, [actionResult, groundCards.length]);

  const handleOpenEyes = () => {
    setSubmitted(true);
    onAction({ type: "werewolf" });
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

  const handleGroundCardTap = () => {
    if (revealedGroundIdx !== null && groundCardName) {
      openModal(getFullCardImage(groundCardName), groundCardName);
    }
  };

  return (
    <div className="role-action">
      <div className="role-circle-area">
        {players.map((player, i) => {
          const pos = positions[i];
          const isSelf = player.id === playerId;
          const isRevealed = revealedIds.has(player.id);
          const isFaceUp = isSelf || isRevealed;

          return (
            <div key={player.id} className={`role-slot ${isSelf ? "role-slot--self" : ""} ${isRevealed ? "role-slot--revealed" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
              <span className={`role-name ${isSelf ? "role-name--self ww-name--self" : ""} ${isRevealed ? "ww-name--wolf" : ""}`}>{isSelf ? "YOU" : player.name}</span>

              <div className={`role-flip ${isFaceUp ? "role-flip--up" : ""} ${isSelf || (isFaceUp && !locked) ? "role-flip--tappable" : ""}`} onClick={isSelf ? () => openModal(getFullCardImage("werewolf"), "Werewolf", "You") : isFaceUp && !locked ? () => openModal(getFullCardImage("werewolf"), "Werewolf", player.name) : undefined}>
                <div className="role-flip-inner">
                  <div className="role-flip-face role-flip-face--back">
                    <img src={backCardImage} alt="Card back" draggable={false} />
                  </div>
                  <div className="role-flip-face role-flip-face--front">
                    <img src={isFaceUp ? getSquareImage("werewolf") : backCardImage} alt={isFaceUp ? "Werewolf" : "Card"} draggable={false} />
                  </div>
                </div>
              </div>

              {isRevealed && <div className="role-glow role-glow--red" />}
              {isSelf && <div className="role-glow role-glow--subtle-gold" />}
            </div>
          );
        })}

        <div className="role-ground">
          {groundCards.slice(0, 3).map((gc, idx) => {
            const isFlipped = revealedGroundIdx === idx;

            return (
              <div key={gc.id} className={`role-ground-card ${isFlipped ? "role-ground-card--revealed" : ""}`}>
                <div className={`role-flip role-flip--ground ${isFlipped ? "role-flip--up" : ""} ${isFlipped ? "role-flip--tappable" : ""}`} onClick={isFlipped ? handleGroundCardTap : undefined}>
                  <div className="role-flip-inner">
                    <div className="role-flip-face role-flip-face--back">
                      <img src={backCardImage} alt="Ground card" draggable={false} />
                    </div>
                    <div className="role-flip-face role-flip-face--front">
                      <img src={isFlipped ? getSquareImage(groundCardName) : backCardImage} alt={isFlipped ? groundCardName : "Ground card"} draggable={false} />
                    </div>
                  </div>
                </div>
                {isFlipped && <div className="role-glow role-glow--gold" />}
              </div>
            );
          })}
        </div>

        {actionResult?.isAlone && revealedGroundIdx !== null && (
          <div className="role-status-above">
            <span className="role-status-text role-status-text--gold">LONE WOLF</span>
          </div>
        )}
        {!actionResult?.isAlone && revealedIds.size > 0 && (
          <div className="role-status-above">
            <span className="role-status-text role-status-text--red">THE PACK</span>
          </div>
        )}
      </div>

      <div className="role-bottom">
        {locked ? (
          <span className="role-bottom-status">WAITING FOR YOUR TURN...</span>
        ) : !submitted ? (
          <button className="role-btn" onClick={handleOpenEyes}>
            OPEN EYES
          </button>
        ) : !actionResult ? (
          <span className="role-bottom-status">LOOKING...</span>
        ) : (
          <span className="role-bottom-status role-bottom-status--done">{actionResult.isAlone ? "You peeked at a ground card" : "You found your pack"}</span>
        )}
      </div>

      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} subtitle={modalSubtitle} />

      {packModalOpen && (
        <div className="role-pack-overlay" onClick={() => setPackModalOpen(false)}>
          <div className="role-pack-modal" onClick={(e) => e.stopPropagation()}>
            <span className="role-pack-title role-pack-title--red">YOUR PACK</span>
            <div className="role-pack-cards">
              {packWolves.map((wolf, i) => (
                <div key={i} className="role-pack-card">
                  <span className="role-pack-name">{wolf.name}</span>
                  <img src={wolf.image} alt={wolf.name} className="role-pack-img role-pack-img--red" />
                </div>
              ))}
            </div>
            <button className="role-pack-close" onClick={() => setPackModalOpen(false)}>
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WerewolfAction;
