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
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");
  const [modalName, setModalName] = useState("");

  const activeIndex = roleQueue.findIndex((r) => r.roleName.toLowerCase() === activeRole.toLowerCase());
  const timerMax = activeIndex >= 0 ? roleQueue[activeIndex]?.seconds || 0 : 0;
  const isUrgent = timer <= 5 && timer > 0;

  // Auto-scroll to center active role
  useEffect(() => {
    if (!scrollRef.current || activeIndex < 0) return;

    const container = scrollRef.current;
    const activeEl = itemRefs.current[activeIndex];
    if (!activeEl) return;

    const containerWidth = container.offsetWidth;
    const elLeft = activeEl.offsetLeft;
    const elWidth = activeEl.offsetWidth;
    const scrollTarget = elLeft - containerWidth / 2 + elWidth / 2;

    container.scrollTo({ left: scrollTarget, behavior: "smooth" });
  }, [activeIndex]);

  const openModal = useCallback((roleName: string) => {
    setModalImage(getFullCardImage(roleName));
    setModalName(roleName);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  return (
    <div className="nrp-carousel">
      <div className="nrp-track" ref={scrollRef}>
        {/* Left spacer — half container width so first item can center */}
        <div className="nrp-spacer" />

        {roleQueue.map((item, i) => {
          const isActive = i === activeIndex;
          const isCompleted = activeIndex >= 0 && i < activeIndex;
          const isUpcoming = activeIndex >= 0 && i > activeIndex;
          const isMyRole = myRole.toLowerCase() === item.roleName.toLowerCase();

          return (
            <div
              key={item.roleName}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className={`nrp-item ${isActive ? "nrp-item--active" : ""} ${isCompleted ? "nrp-item--completed" : ""} ${isUpcoming ? "nrp-item--upcoming" : ""} ${isMyRole && isActive ? "nrp-item--mine" : ""}`}
              onClick={() => openModal(item.roleName)}
            >
              <div className="nrp-thumb-wrapper">
                <img src={getSquareImage(item.roleName)} alt={item.roleName} className="nrp-thumb" draggable={false} />
              </div>

              <span className={`nrp-label ${isActive ? "nrp-label--active" : ""} ${isMyRole && isActive ? "nrp-label--mine" : ""} ${isCompleted ? "nrp-label--completed" : ""}`}>{item.roleName}</span>

              {isActive && timer > 0 && <span className={`nrp-timer-text ${isUrgent ? "nrp-timer-text--urgent" : ""}`}>{timer}s</span>}
            </div>
          );
        })}

        {/* Right spacer — half container width so last item can center */}
        <div className="nrp-spacer" />
      </div>

      <CardModal isOpen={modalOpen} onClose={closeModal} cardImage={modalImage} cardName={modalName} />
    </div>
  );
}

export default NightRoleProgress;
