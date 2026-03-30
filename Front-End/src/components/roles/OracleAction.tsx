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
}

// ===== COMPONENT =====

function OracleAction({ onAction, locked = false, actionResult }: Props) {
  const isRejoin = !!actionResult;

  const [submitted, setSubmitted] = useState(isRejoin);
  const [showVision, setShowVision] = useState(isRejoin);
  const hasProcessedResult = useRef(isRejoin);

  useEffect(() => {
    if (!actionResult || hasProcessedResult.current) return;
    hasProcessedResult.current = true;
    const timer = setTimeout(() => {
      setShowVision(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [actionResult]);

  const handleReceiveVision = () => {
    if (locked || submitted) return;
    setSubmitted(true);
    onAction({ type: "oracle" });
  };

  const visionText = actionResult?.vision || actionResult?.message || "";
  const sourceRole = actionResult?.sourceRole || "";
  const hasVision = actionResult?.hasVision !== false;

  return (
    <div className="role-action">
      <div className="oracle-area">
        {/* Vision display */}
        {showVision && actionResult && (
          <div className="oracle-vision-container">
            {hasVision && sourceRole && <span className="oracle-source">{sourceRole.toUpperCase()}</span>}
            <div className="oracle-vision-box">
              <span className="oracle-quote">"</span>
              <p className="oracle-vision-text">{visionText}</p>
              <span className="oracle-quote oracle-quote--end">"</span>
            </div>
          </div>
        )}

        {/* Waiting state after submit but before result */}
        {submitted && !showVision && (
          <div className="oracle-waiting">
            <span className="oracle-waiting-text">RECEIVING VISION...</span>
          </div>
        )}

        {/* Idle — the eye icon */}
        {!submitted && !locked && (
          <div className="oracle-idle">
            <span className="oracle-eye">◉</span>
            <span className="oracle-idle-text">THE SPIRITS AWAIT</span>
          </div>
        )}

        {/* Locked state */}
        {locked && !submitted && (
          <div className="oracle-idle">
            <span className="oracle-eye oracle-eye--dim">◉</span>
            <span className="oracle-idle-text oracle-idle-text--dim">NOT YOUR TURN YET</span>
          </div>
        )}
      </div>

      <div className="role-bottom">
        {locked ? (
          <span className="role-bottom-status">WAITING FOR YOUR TURN...</span>
        ) : !submitted ? (
          <button className="role-btn" onClick={handleReceiveVision}>
            RECEIVE VISION
          </button>
        ) : !showVision ? (
          <span className="role-bottom-status">THE SPIRITS WHISPER...</span>
        ) : (
          <span className="role-bottom-status role-bottom-status--done">{hasVision ? "A vision has been revealed" : "The spirits were silent"}</span>
        )}
      </div>
    </div>
  );
}

export default OracleAction;
