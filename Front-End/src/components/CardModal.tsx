import { useEffect, useRef } from "react";
import "./CardModal.css";

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardImage: string;
  cardName: string;
  subtitle?: string;
}

function CardModal({ isOpen, onClose, cardImage, cardName, subtitle }: CardModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div className="card-modal-backdrop" ref={backdropRef} onClick={handleBackdropClick}>
      <div className="card-modal-content">
        <img src={cardImage} alt={cardName} className="card-modal-img" draggable={false} />
        {subtitle && <p className="card-modal-subtitle">{subtitle}</p>}
        <button className="card-modal-close" onClick={onClose}>
          ✕
        </button>
      </div>
    </div>
  );
}

export default CardModal;
