import { useState, useEffect, useRef } from "react";
import { allCards, backCardImage } from "../../characters";
import "./NightRoleProgress.css";

// ===== TYPES =====

interface RoleQueueItem {
  roleName: string;
  seconds: number;
}

interface Props {
  roleQueue: RoleQueueItem[];
  activeRole: string;
  timer: number;
  myRole: string;
}

// ===== HELPERS =====

const cardImageMap: Record<string, string> = Object.fromEntries(allCards.map((c) => [c.id.toLowerCase(), c.small]));

function getSmallCard(roleName: string): string {
  return cardImageMap[roleName.toLowerCase()] || backCardImage;
}

// ===== COMPONENT =====

function NightRoleProgress({ roleQueue, activeRole, timer, myRole }: Props) {
  const [exitingRole, setExitingRole] = useState<string | null>(null);
  const prevActiveRef = useRef<string>(activeRole);

  // Detect when active role changes → trigger exit animation on the previous one
  useEffect(() => {
    const prev = prevActiveRef.current;
    if (prev && prev !== activeRole) {
      setExitingRole(prev);
      // Clear exiting state after animation completes
      const timeout = setTimeout(() => setExitingRole(null), 500);
      return () => clearTimeout(timeout);
    }
    prevActiveRef.current = activeRole;
  }, [activeRole]);

  const activeIndex = roleQueue.findIndex((r) => r.roleName.toLowerCase() === activeRole.toLowerCase());

  const activeItem = activeIndex >= 0 ? roleQueue[activeIndex] : null;
  const isMine = activeItem ? myRole.toLowerCase() === activeItem.roleName.toLowerCase() : false;
  const timerMax = activeItem?.seconds || 0;
  const timerFraction = timerMax > 0 ? timer / timerMax : 0;
  const isUrgent = timer <= 5 && timer > 0;

  // Count remaining (including active)
  const remaining = activeIndex >= 0 ? roleQueue.length - activeIndex : 0;

  return (
    <div className="nrp-stack">
      {/* Exiting card (previous role sliding away) */}
      {exitingRole && (
        <div className="nrp-card nrp-card--exit" key={`exit-${exitingRole}`}>
          <img src={getSmallCard(exitingRole)} alt={exitingRole} className="nrp-card-img" draggable={false} />
        </div>
      )}

      {/* Active card */}
      {activeItem && (
        <div className={`nrp-card nrp-card--active ${isMine ? "nrp-card--mine" : ""}`} key={`active-${activeItem.roleName}`}>
          <img src={getSmallCard(activeItem.roleName)} alt={activeItem.roleName} className="nrp-card-img" draggable={false} />

          {/* Timer bar overlay at the bottom of the card */}
          <div className="nrp-timer-bar">
            <div className={`nrp-timer-fill ${isUrgent ? "nrp-timer-fill--urgent" : ""}`} style={{ transform: `scaleX(${timerFraction})` }} />
          </div>

          {/* Role name label */}
          <span className={`nrp-role-name ${isMine ? "nrp-role-name--mine" : ""}`}>
            {activeItem.roleName}
            {isMine && <span className="nrp-you-tag"> (YOU)</span>}
          </span>
        </div>
      )}

      {/* Stack depth indicator — subtle shadow cards behind */}
      {remaining > 1 && (
        <>
          <div className="nrp-shadow nrp-shadow--1" />
          {remaining > 2 && <div className="nrp-shadow nrp-shadow--2" />}
        </>
      )}
    </div>
  );
}

export default NightRoleProgress;
