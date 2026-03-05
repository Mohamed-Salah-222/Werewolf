import "./GameCard.css";

export interface GameCardProps {
  name: string;
  ability: string;
  image: string;
  /** Frame background color */
  frameColor?: string;
  /** Border color for outer card and all inner sections */
  borderColor?: string;
  /** Optional className for sizing from parent */
  className?: string;
  /** Darker shade for name plate and ability plate backgrounds */
  panelColor?: string;
}

export default function GameCard({ name, ability, image, frameColor = "#4a0e0e", panelColor = "#470d0d", borderColor = "#252525", className = "" }: GameCardProps) {
  return (
    <div className={`gc-card ${className}`}>
      {/* Outer border */}
      <div className="gc-border-outer" style={{ borderColor }} />

      {/* Frame background */}
      <div className="gc-frame" style={{ background: frameColor }}>
        {/* Name plate */}
        <div
          className="gc-name-plate"
          style={{
            borderColor,
            background: panelColor,
          }}
        >
          <span className="gc-name">{name}</span>
        </div>

        {/* Image section */}
        <div className="gc-image-inset" style={{ borderColor }}>
          <div className="gc-image-wrapper">
            <img src={image} alt={name} className="gc-image" />
          </div>
        </div>

        {/* Ability plate */}
        <div
          className="gc-ability-plate"
          style={{
            borderColor,
            background: panelColor,
          }}
        >
          <p className="gc-ability-text">{ability}</p>
        </div>
      </div>
    </div>
  );
}
