import { useMemo } from "react";
import { allCards, backCardImage } from "../../characters";

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

type CardState = "completed" | "active" | "upcoming";

/** Map role names to their small card images */
const cardImageMap: Record<string, string> = Object.fromEntries(allCards.map((c) => [c.id.toLowerCase(), c.small]));

function getSmallCard(roleName: string): string {
  return cardImageMap[roleName.toLowerCase()] || backCardImage;
}

/**
 * Card-based journey tracker for the night phase.
 * Active role card is face-up revealing the role art.
 * Completed roles flip back face-down.
 * Upcoming roles stay face-down until their turn.
 */
function NightRoleProgress({ roleQueue, activeRole, timer, myRole }: Props) {
  const activeIndex = useMemo(() => {
    return roleQueue.findIndex((r) => r.roleName.toLowerCase() === activeRole.toLowerCase());
  }, [roleQueue, activeRole]);

  const getCardState = (index: number): CardState => {
    if (activeIndex < 0) return "upcoming";
    if (index < activeIndex) return "completed";
    if (index === activeIndex) return "active";
    return "upcoming";
  };

  // Perimeter of the card rect for stroke-dasharray (approx 2*(w+h) for rounded rect)
  const rectPerimeter = 356;

  return (
    <div className="nrp-container">
      <div className="nrp-track">
        {roleQueue.map((item, i) => {
          const state = getCardState(i);
          const isMine = myRole.toLowerCase() === item.roleName.toLowerCase();
          const isActive = state === "active";
          const isCompleted = state === "completed";
          const timerMax = item.seconds;
          const timerFraction = isActive && timerMax > 0 ? timer / timerMax : 0;
          const isUrgent = isActive && timer <= 5;

          // Only active card is face-up
          const isFaceUp = isActive;

          return (
            <div key={item.roleName} className="nrp-step">
              <div className={["nrp-card-slot", isActive && "nrp-card-slot--active", isCompleted && "nrp-card-slot--completed", isMine && !isActive && "nrp-card-slot--mine"].filter(Boolean).join(" ")}>
                {/* Timer ring border — active card only */}
                {isActive && (
                  <div className="nrp-card-ring">
                    <svg viewBox="0 0 78 108" preserveAspectRatio="none">
                      <rect className="nrp-card-ring-bg" x="2" y="2" width="74" height="104" rx="5" ry="5" />
                      <rect className={`nrp-card-ring-progress ${isUrgent ? "nrp-card-ring-progress--urgent" : ""}`} x="2" y="2" width="74" height="104" rx="5" ry="5" strokeDasharray={rectPerimeter} strokeDashoffset={rectPerimeter - timerFraction * rectPerimeter} />
                    </svg>
                  </div>
                )}

                {/* Flip card */}
                <div className={`nrp-flip ${isFaceUp ? "nrp-flip--up" : ""}`}>
                  <div className="nrp-flip-side nrp-flip-side--back">
                    <img src={backCardImage} alt="Card back" className="nrp-flip-img" />
                  </div>
                  <div className="nrp-flip-side nrp-flip-side--front">
                    <img src={getSmallCard(item.roleName)} alt={item.roleName} className="nrp-flip-img" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Timer readout below */}
      {activeIndex >= 0 && timer > 0 && <div className={`nrp-timer-display ${timer <= 5 ? "nrp-timer-display--urgent" : ""}`}>{roleQueue[activeIndex]?.roleName}</div>}
    </div>
  );
}

export default NightRoleProgress;
