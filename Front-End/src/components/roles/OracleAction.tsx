import { useState, useRef, useEffect } from "react";
import "../roles/shared/RoleShared.css";
import "./OracleAction.css";

// ===== TYPES =====

interface OracleResult {
  hasVision?: boolean;
  sourceRole?: string;
  vision?: string;
  message?: string;
}

interface Props {
  onAction: (action: { type: string }) => void;
  locked?: boolean;
  actionResult?: OracleResult | null;
  autoSubmitted?: boolean;
}

// ===== VALIDATION =====

function isValidOracleResult(r: unknown): r is OracleResult {
  if (!r || typeof r !== "object") return false;
  const obj = r as Record<string, unknown>;
  return "hasVision" in obj;
}

// ===== COMPONENT =====

function OracleAction({ onAction, locked = false, actionResult, autoSubmitted }: Props) {
  const validResult = isValidOracleResult(actionResult) ? actionResult : null;
  const isRejoin = !!validResult;

  void onAction;

  const submitted = isRejoin || !!autoSubmitted || !locked;
  const [showVision, setShowVision] = useState(isRejoin);
  const hasProcessedResult = useRef(isRejoin);

  // Show vision when a VALID oracle result arrives
  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    if (!isValidOracleResult(actionResult)) return;

    hasProcessedResult.current = true;
    const timer = setTimeout(() => {
      setShowVision(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [actionResult]);

  const visionText = validResult?.vision || validResult?.message || "";
  const sourceRole = validResult?.sourceRole || "";
  const hasVision = validResult?.hasVision !== false;

  return (
    <div className="role-action">
      <div className="oracle-area">
        {/* Vision display */}
        {showVision && validResult && (
          <div className="oracle-vision-container">
            {hasVision && sourceRole && <span className="oracle-source">{sourceRole.toUpperCase()}</span>}
            <div className="oracle-vision-box">
              <span className="oracle-quote">"</span>
              <p className="oracle-vision-text">{visionText}</p>
              <span className="oracle-quote oracle-quote--end">"</span>
            </div>
          </div>
        )}

        {/* Waiting state — submitted but result hasn't arrived yet */}
        {submitted && !showVision && (
          <div className="oracle-waiting">
            <span className="oracle-waiting-text">{autoSubmitted ? "AWAITING VISION..." : "RECEIVING VISION..."}</span>
          </div>
        )}

        {/* Locked state — not our turn yet */}
        {locked && !submitted && (
          <div className="oracle-idle">
            <span className="oracle-eye oracle-eye--dim">◉</span>
            <span className="oracle-idle-text oracle-idle-text--dim">لسه مش دورك</span>
          </div>
        )}
      </div>

      <div className="role-bottom">{locked && !submitted ? <span className="role-bottom-status">مستني دورك…</span> : !showVision ? <span className="role-bottom-status">الأرواح بتهمس…</span> : <span className="role-bottom-status role-bottom-status--done">{hasVision ? "A vision has been revealed" : "الأرواح سكتت"}</span>}</div>
    </div>
  );
}

export default OracleAction;
