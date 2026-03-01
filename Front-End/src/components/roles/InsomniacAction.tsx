import { useState, useEffect, useRef } from "react";
import { allCards, backCardImage } from "../../characters";
import "./InsomaniacAction.css";

// ===== TYPES =====

interface InsomniacResult {
  originalRole: string;
  currentRole: string;
  hasChanged: boolean;
  message?: string;
}

interface Props {
  onAction: (action: Record<string, unknown>) => void;
  actionResult?: InsomniacResult | null;
  /** If true, skip the "WAKE UP" button and start in waiting state (used by clone-insomniac) */
  autoSubmitted?: boolean;
}

// ===== HELPERS =====

function getCardImage(roleName: string | undefined): string {
  if (!roleName) return backCardImage;
  const card = allCards.find((c) => c.name && c.name.toLowerCase() === roleName.toLowerCase());
  return card?.image || backCardImage;
}

// ===== PHASES =====
type Phase = "asleep" | "submitted" | "reveal" | "done";

// ===== COMPONENT =====

function isValidResult(r: unknown): r is InsomniacResult {
  if (!r || typeof r !== "object") return false;
  const obj = r as Record<string, unknown>;
  return typeof obj.currentRole === "string" && typeof obj.hasChanged === "boolean";
}

function InsomniacAction({ onAction, actionResult, autoSubmitted }: Props) {
  // Only treat as rejoin if actionResult actually has the right shape
  const validResult = isValidResult(actionResult) ? actionResult : null;
  const isRejoin = !!validResult;

  const [phase, setPhase] = useState<Phase>(isRejoin ? "done" : autoSubmitted ? "submitted" : "asleep");
  const [result, setResult] = useState<InsomniacResult | null>(isRejoin ? validResult : null);
  const hasProcessedResult = useRef(isRejoin);

  // Process result when it arrives
  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;

    // Validate the result has the right shape before processing
    if (!isValidResult(actionResult)) return;

    hasProcessedResult.current = true;
    setResult(actionResult);
    setPhase("reveal");

    const timer = setTimeout(() => setPhase("done"), 1200);
    return () => clearTimeout(timer);
  }, [actionResult]);

  const handleWakeUp = () => {
    if (phase !== "asleep") return;
    setPhase("submitted");
    onAction({ type: "insomniac" });
  };

  const currentRole = result?.currentRole || "Insomniac";
  const hasChanged = result?.hasChanged || false;
  const cardImage = result ? getCardImage(result.currentRole) : getCardImage("insomniac");
  const showFace = phase === "reveal" || phase === "done";

  return (
    <div className="in-action">
      {/* Card */}
      <div className="in-card-area">
        <div className={`in-card ${showFace ? "in-card--revealed" : ""} ${phase === "reveal" ? "in-card--flipping" : ""}`}>
          <div className="in-card-inner">
            <div className="in-card-face in-card-face--back">
              <img src={backCardImage} alt="Card back" draggable={false} />
            </div>
            <div className="in-card-face in-card-face--front">
              <img src={cardImage} alt={currentRole} draggable={false} />
            </div>
          </div>
        </div>

        {showFace && !hasChanged && <div className="in-glow in-glow--green" />}
        {showFace && hasChanged && <div className="in-glow in-glow--red" />}
      </div>

      {/* Status */}
      <div className="in-status">
        {phase === "asleep" && (
          <>
            <p className="in-flavor">You stir awake one last time...</p>
            <button className="in-btn" onClick={handleWakeUp}>
              <span className="in-btn-icon">👁</span>
              <span className="in-btn-text">WAKE UP</span>
            </button>
          </>
        )}
        {phase === "submitted" && <span className="in-status-text in-status-text--pulse">{autoSubmitted ? "WAITING TO WAKE..." : "CHECKING..."}</span>}
        {phase === "reveal" && !hasChanged && <span className="in-status-text in-status-text--green">STILL INSOMNIAC</span>}
        {phase === "reveal" && hasChanged && <span className="in-status-text in-status-text--red">ROLE CHANGED!</span>}
        {phase === "done" && !hasChanged && (
          <div className="in-done">
            <span className="in-done-title in-done-title--green">STILL INSOMNIAC</span>
            <span className="in-done-sub">Your role was not swapped</span>
          </div>
        )}
        {phase === "done" && hasChanged && (
          <div className="in-done">
            <span className="in-done-title in-done-title--red">YOU ARE NOW {currentRole.toUpperCase()}</span>
            <span className="in-done-sub">Someone swapped your role during the night</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default InsomniacAction;
