import { useState, useEffect, useRef, useCallback } from "react";
import { characters, allCards, backCardImage } from "../../characters";
import CardModal from "../CardModal";
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

function getSquareImage(roleName: string): string {
  const char = characters.find((c) => c.id.toLowerCase() === roleName.toLowerCase());
  return char?.square || backCardImage;
}

function getFullCardImage(roleName: string): string {
  const card = allCards.find((c) => c.id.toLowerCase() === roleName.toLowerCase());
  return card?.image || backCardImage;
}

// ===== COMPONENT =====

function NightRoleProgress({ roleQueue, activeRole, timer, myRole }: Props) {
  const [exitingRole, setExitingRole] = useState<string | null>(null);
  const prevActiveRef = useRef<string>(activeRole);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");

  useEffect(() => {
    const prev = prevActiveRef.current;
    if (prev && prev !== activeRole) {
      setExitingRole(prev);
      const timeout = setTimeout(() => setExitingRole(null), 500);
      return () => clearTimeout(timeout);
    }
    prevActiveRef.current = activeRole;
  }, [activeRole]);

  const openModal = useCallback((roleName: string) => {
    setModalImage(getFullCardImage(roleName));
    setModalName(roleName);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const activeIndex = roleQueue.findIndex((r) => r.roleName.toLowerCase() === activeRole.toLowerCase());

  const activeItem = activeIndex >= 0 ? roleQueue[activeIndex] : null;
  const isMine = activeItem ? myRole.toLowerCase() === activeItem.roleName.toLowerCase() : false;
  const timerMax = activeItem?.seconds || 0;
  const timerFraction = timerMax > 0 ? timer / timerMax : 0;
  const isUrgent = timer <= 5 && timer > 0;

  const remaining = activeIndex >= 0 ? roleQueue.length - activeIndex : 0;

  // SVG perimeter for the border timer
  const svgW = 70;
  const svgH = 98;
  const inset = 2;
  const rx = 5;
  const rectW = svgW - inset * 2;
  const rectH = svgH - inset * 2;
  const perimeter = 2 * (rectW + rectH - 4 * rx) + 2 * Math.PI * rx;
  const dashOffset = perimeter * (1 - timerFraction);

  return (
    <div className="nrp-stack">
      {/* Exiting card */}
      {exitingRole && (
        <div className="nrp-card nrp-card--exit" key={`exit-${exitingRole}`}>
          <img src={getSquareImage(exitingRole)} alt={exitingRole} className="nrp-card-img" draggable={false} />
        </div>
      )}

      {/* Active card */}
      {activeItem && (
        <div className={`nrp-card nrp-card--active ${isMine ? "nrp-card--mine" : ""} nrp-card--tappable`} key={`active-${activeItem.roleName}`} onClick={() => openModal(activeItem.roleName)}>
          <img src={getSquareImage(activeItem.roleName)} alt={activeItem.roleName} className="nrp-card-img" draggable={false} />

          {/* SVG border timer circling the card */}
          <svg className="nrp-border-timer" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none">
            <rect className="nrp-border-bg" x={inset} y={inset} width={rectW} height={rectH} rx={rx} ry={rx} />
            <rect className={`nrp-border-progress ${isUrgent ? "nrp-border-progress--urgent" : ""}`} x={inset} y={inset} width={rectW} height={rectH} rx={rx} ry={rx} strokeDasharray={perimeter} strokeDashoffset={dashOffset} />
          </svg>

          {/* Role name label */}
          <span className={`nrp-role-name ${isMine ? "nrp-role-name--mine" : ""}`}>{activeItem.roleName}</span>
        </div>
      )}

      {/* Stack depth shadows */}
      {remaining > 1 && (
        <>
          <div className="nrp-shadow nrp-shadow--1" />
          {remaining > 2 && <div className="nrp-shadow nrp-shadow--2" />}
        </>
      )}

      {/* Card Modal */}
      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} />
    </div>
  );
}

export default NightRoleProgress;
