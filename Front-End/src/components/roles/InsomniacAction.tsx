import { useState, useEffect, useRef } from "react";
import { findCard, backCardImage } from "../../characters";
import "./InsomaniacAction.css";

interface InsomniacResult {
  originalRole: string;
  currentRole: string;
  hasChanged: boolean;
  message?: string;
}

interface Props {
  onAction: (action: Record<string, unknown>) => void;
  locked?: boolean;
  actionResult?: InsomniacResult | null;
  autoSubmitted?: boolean;
}

function getFullCardImage(roleName: string | undefined): string {
  if (!roleName) return backCardImage;
  const card = findCard(roleName);
  return card?.image || backCardImage;
}

type Phase = "asleep" | "submitted" | "reveal" | "done";

function isValidResult(r: unknown): r is InsomniacResult {
  if (!r || typeof r !== "object") return false;
  const obj = r as Record<string, unknown>;
  return typeof obj.currentRole === "string" && typeof obj.hasChanged === "boolean";
}

function InsomniacAction({ locked = false, actionResult, autoSubmitted }: Props) {
  const validResult = isValidResult(actionResult) ? actionResult : null;
  const isRejoin = !!validResult;

  const [phase, setPhase] = useState<Phase>(isRejoin ? "done" : autoSubmitted ? "submitted" : "asleep");
  const result = validResult;
  const hasProcessedResult = useRef(isRejoin);

  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    if (!isValidResult(actionResult)) return;

    hasProcessedResult.current = true;

    setTimeout(() => {
      setPhase("reveal");
    }, 0);

    const timer = setTimeout(() => setPhase("done"), 1200);
    return () => clearTimeout(timer);
  }, [actionResult]);

  const currentRole = result?.currentRole || "Insomniac";
  const hasChanged = result?.hasChanged || false;
  const cardImage = result ? getFullCardImage(result.currentRole) : getFullCardImage("insomniac");
  const showFace = phase === "reveal" || phase === "done";

  return (
    <div className="in-action">
      <div className="in-card-area">
        <div className={`in-card ${showFace ? "in-card--revealed" : ""} ${phase === "reveal" ? "in-card--flipping" : ""}`}>
          <div className="in-card-inner">
            <div className="in-card-face in-card-face--back">
              <img src={backCardImage} alt="ضهر الكارت" draggable={false} />
            </div>
            <div className="in-card-face in-card-face--front">
              <img src={cardImage} alt={currentRole} draggable={false} />
            </div>
          </div>
        </div>
      </div>

      <div className="in-status">
        {phase === "asleep" && <span className="in-status-text in-status-text--pulse">{locked ? "WAITING FOR YOUR TURN..." : "CHECKING..."}</span>}
        {phase === "submitted" && <span className="in-status-text in-status-text--pulse">{autoSubmitted ? "WAITING TO WAKE..." : "CHECKING..."}</span>}
        {phase === "reveal" && !hasChanged && <span className="in-status-text in-status-text--green">لسه الساهر</span>}
        {phase === "reveal" && hasChanged && <span className="in-status-text in-status-text--red">الدور اتغير!</span>}
        {phase === "done" && !hasChanged && (
          <div className="in-done">
            <span className="in-done-title in-done-title--green">لسه الساهر</span>
            <span className="in-done-sub">دورك ماتبادلش</span>
          </div>
        )}
        {phase === "done" && hasChanged && (
          <div className="in-done">
            <span className="in-done-title in-done-title--red">YOU ARE NOW {currentRole.toUpperCase()}</span>
            <span className="in-done-sub">حد بدل دورك بالليل</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default InsomniacAction;
