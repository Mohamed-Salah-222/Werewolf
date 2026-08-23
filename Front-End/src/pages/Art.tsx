// Inline SVG art — crisp at any size, no image files needed.
// A role with an artPath in ROLE_REGISTRY renders that image instead.
import { ROLE_REGISTRY } from "@werewolf/shared";

export function WolfMoon({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden>
      <defs>
        <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
          <stop offset="70%" stopColor="#fbbf24" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="moonFace" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="52" r="46" fill="url(#moonGlow)" />
      <circle cx="60" cy="52" r="26" fill="url(#moonFace)" />
      <circle cx="51" cy="45" r="5" fill="#d97706" opacity="0.35" />
      <circle cx="67" cy="58" r="7" fill="#d97706" opacity="0.28" />
      <circle cx="63" cy="40" r="3.4" fill="#d97706" opacity="0.3" />
      {/* wolf silhouette howling */}
      <path
        d="M30 108 C34 96 36 88 44 82 L48 72 C49 69 51 68 53 66 L54 60 L58 64 L62 62 L64 56 L67 61 L74 64 C80 66 84 71 86 78 L90 92 C91 98 89 104 86 108 Z"
        fill="#160a0e"
        stroke="#dc2626"
        strokeWidth="1.2"
        strokeOpacity="0.6"
      />
      <circle cx="59.5" cy="59.5" r="1.3" fill="#dc2626">
        <animate attributeName="opacity" values="1;0.35;1" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export function ClawMarks({ width = 180 }: { width?: number }) {
  const marks = [
    { x: 10, rot: -18, d: "0s", w: 3 },
    { x: 55, rot: -12, d: "0.25s", w: 2.5 },
    { x: 100, rot: -16, d: "0.5s", w: 3.4 },
  ];
  return (
    <svg width={width} height={width * 0.28} viewBox="0 0 140 40" fill="none" aria-hidden className="claws">
      {marks.map((m, i) => (
        <g key={i}>
          <path
            d={`M${m.x} 4 Q ${m.x + 8} 20 ${m.x + 4} 38`}
            stroke="#dc2626"
            strokeWidth={m.w}
            strokeLinecap="round"
            transform={`rotate(${m.rot} ${m.x + 6} 20)`}
            opacity="0.75"
          >
            <animate attributeName="opacity" values="0.2;0.85;0.2" dur="2.4s" begin={m.d} repeatCount="indefinite" />
          </path>
          {/* faint parallel scratch beside each mark */}
          <path
            d={`M${m.x + 7} 7 Q ${m.x + 13} 20 ${m.x + 10} 34`}
            stroke="#991b1b"
            strokeWidth="1.4"
            strokeLinecap="round"
            transform={`rotate(${m.rot} ${m.x + 6} 20)`}
            opacity="0.4"
          >
            <animate attributeName="opacity" values="0.1;0.45;0.1" dur="2.4s" begin={m.d} repeatCount="indefinite" />
          </path>
        </g>
      ))}
    </svg>
  );
}

/* ─────────────── role icons ───────────────
   Shared visual language: 24×24 viewBox, rounded strokes,
   blood-red / moon-gold accents on dark fill. */

const STROKE = 1.6;

function Svg({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      {children}
    </svg>
  );
}

export function RoleIcon({ roleId, size = 44 }: { roleId: string; size?: number }) {
  const def = ROLE_REGISTRY[roleId];
  if (def?.artPath) {
    return (
      <img
        src={def.artPath}
        alt=""
        aria-hidden
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  }
  switch (roleId) {
    case "werewolf":
      // snarling wolf head, ears up, red eyes
      return (
        <Svg size={size}>
          <path
            d="M5 3l3 5-1.5 4L9 19l3 3 3-3 2.5-7L16 8l3-5-4 2.5L12 4 9 5.5 5 3z"
            fill="rgba(239,68,68,0.18)"
            stroke="#ef4444"
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
          <path d="M10.5 15l1.5 1.5L13.5 15" stroke="#ef4444" strokeWidth={STROKE} strokeLinecap="round" />
          <circle cx="9.5" cy="11" r="1.1" fill="#ef4444" />
          <circle cx="14.5" cy="11" r="1.1" fill="#ef4444" />
        </Svg>
      );
    case "minion":
      // hooded servant bowing
      return (
        <Svg size={size}>
          <path
            d="M12 3C7 3 4 8 4 13v7h16v-7c0-5-3-10-8-10z"
            fill="rgba(248,113,113,0.14)"
            stroke="#f87171"
            strokeWidth={STROKE}
          />
          <circle cx="9.5" cy="12" r="1" fill="#f87171" />
          <circle cx="14.5" cy="12" r="1" fill="#f87171" />
          <path d="M10 16h4" stroke="#f87171" strokeWidth={STROKE} strokeLinecap="round" />
        </Svg>
      );
    case "clone":
      // two overlapping masks
      return (
        <Svg size={size}>
          <rect x="3" y="3" width="12" height="12" rx="3" fill="rgba(56,189,248,0.12)" stroke="#38bdf8" strokeWidth={STROKE} />
          <rect x="9" y="9" width="12" height="12" rx="3" fill="rgba(56,189,248,0.08)" stroke="#38bdf8" strokeWidth={STROKE} strokeDasharray="2.5 2" />
          <circle cx="7.5" cy="7.5" r="1" fill="#38bdf8" />
          <circle cx="15" cy="15" r="1" fill="#38bdf8" />
        </Svg>
      );
    case "seer":
      // all-seeing eye with rays
      return (
        <Svg size={size}>
          <path d="M2 12s4-6.5 10-6.5S22 12 22 12s-4 6.5-10 6.5S2 12 2 12z" fill="rgba(251,191,36,0.12)" stroke="#fbbf24" strokeWidth={STROKE} />
          <circle cx="12" cy="12" r="3.2" fill="rgba(251,191,36,0.35)" stroke="#fbbf24" strokeWidth={STROKE} />
          <circle cx="12" cy="12" r="1" fill="#fbbf24" />
          <path d="M12 2v2M4.5 4.5L6 6M19.5 4.5L18 6" stroke="#fbbf24" strokeWidth={STROKE - 0.2} strokeLinecap="round" />
        </Svg>
      );
    case "mason":
      // brick wall
      return (
        <Svg size={size}>
          {[0, 1, 2].map((row) =>
            [0, 1].map((col) => {
              const y = 5 + row * 5.5;
              const x = row % 2 === 0 ? 3 + col * 9.5 : 7.75 + col * 9.5;
              return (
                <rect
                  key={`${row}${col}`}
                  x={x}
                  y={y}
                  width="8"
                  height="4.5"
                  rx="1"
                  fill="rgba(132,204,22,0.1)"
                  stroke="#84cc16"
                  strokeWidth={STROKE - 0.2}
                />
              );
            }),
          )}
        </Svg>
      );
    case "robber":
      // burglar domino mask
      return (
        <Svg size={size}>
          <path
            d="M2.5 10c0-1.5 2-2.5 4.5-2.5 2 0 3.5.8 5 .8s3-.8 5-.8c2.5 0 4.5 1 4.5 2.5 0 3-2.5 6-5 6-1.8 0-3-1.5-4.5-1.5S9.3 16 7.5 16c-2.5 0-5-3-5-6z"
            fill="rgba(167,139,250,0.16)"
            stroke="#a78bfa"
            strokeWidth={STROKE}
          />
          <ellipse cx="7.5" cy="11" rx="2.2" ry="1.6" fill="#a78bfa" opacity="0.85" />
          <ellipse cx="16.5" cy="11" rx="2.2" ry="1.6" fill="#a78bfa" opacity="0.85" />
        </Svg>
      );
    case "troublemaker":
      // swap arrows between two dots
      return (
        <Svg size={size}>
          <circle cx="6.5" cy="6.5" r="2.2" fill="rgba(251,113,133,0.3)" stroke="#fb7185" strokeWidth={STROKE - 0.2} />
          <circle cx="17.5" cy="17.5" r="2.2" fill="rgba(251,113,133,0.3)" stroke="#fb7185" strokeWidth={STROKE - 0.2} />
          <path d="M9 17c-2.5 0-4-1.5-4-4M15 7c2.5 0 4 1.5 4 4" stroke="#fb7185" strokeWidth={STROKE} strokeLinecap="round" />
          <path d="M5.5 10.5L5 13l2.5-.5M18.5 13.5l.5-2.5-2.5.5" stroke="#fb7185" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case "drunk":
      // tilted tankard with foam
      return (
        <Svg size={size}>
          <path d="M8 8l8-2 1.5 9a4 4 0 01-8 1L8 8z" fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth={STROKE} strokeLinejoin="round" />
          <path d="M17 8.5l2.5 1a2.5 2.5 0 01-1.5 4.5" stroke="#f59e0b" strokeWidth={STROKE} strokeLinecap="round" />
          <circle cx="9.5" cy="5.5" r="1.6" fill="#f59e0b" opacity="0.7" />
          <circle cx="13.5" cy="4" r="1.2" fill="#f59e0b" opacity="0.5" />
          <circle cx="16" cy="5.8" r="1" fill="#f59e0b" opacity="0.6" />
        </Svg>
      );
    case "insomniac":
      // eye under crescent + star
      return (
        <Svg size={size}>
          <path d="M15.5 3.5A9 9 0 1120 15.5 7.5 7.5 0 0115.5 3.5z" fill="rgba(148,163,184,0.12)" stroke="#94a3b8" strokeWidth={STROKE} />
          <path d="M17 5l.8 1.7L19.5 7.5l-1.7.8L17 10l-.8-1.7-1.7-.8 1.7-.8L17 5z" fill="#fbbf24" />
          <path d="M4 17s2-3.5 5.5-3.5S15 17 15 17" stroke="#94a3b8" strokeWidth={STROKE} strokeLinecap="round" />
          <circle cx="9.5" cy="17" r="1.2" fill="#94a3b8" />
        </Svg>
      );
    case "joker":
      // jester card with bells
      return (
        <Svg size={size}>
          <rect x="5" y="3" width="14" height="18" rx="2.5" fill="rgba(232,121,249,0.1)" stroke="#e879f9" strokeWidth={STROKE} />
          <path d="M8.5 10c1-2.5 2.5-3.5 3.5-3.5s2.5 1 3.5 3.5c-1 1-2 1.5-3.5 1.5s-2.5-.5-3.5-1.5z" fill="rgba(232,121,249,0.3)" stroke="#e879f9" strokeWidth={STROKE - 0.2} />
          <circle cx="8" cy="9" r="1" fill="#e879f9" />
          <circle cx="16" cy="9" r="1" fill="#e879f9" />
          <circle cx="12" cy="16.5" r="1.1" fill="#e879f9" opacity="0.85" />
        </Svg>
      );
    case "warlock":
      // bubbling flask with swap arrow
      return (
        <Svg size={size}>
          <path d="M10 3h4M11 3v5l-4.5 8A3 3 0 009 21h6a3 3 0 002.5-5L13 8V3" fill="rgba(163,230,53,0.1)" stroke="#a3e635" strokeWidth={STROKE} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx="10" cy="17" r="1.1" fill="#a3e635" opacity="0.8" />
          <circle cx="13.5" cy="15.5" r="0.8" fill="#a3e635" opacity="0.6" />
        </Svg>
      );
    case "oracle":
      // crystal ball on stand, sparkle inside
      return (
        <Svg size={size}>
          <circle cx="12" cy="10.5" r="6" fill="rgba(103,232,249,0.12)" stroke="#67e8f9" strokeWidth={STROKE} />
          <path d="M12 6.5c1.8 1.5 2.6 3.2 2.4 5" stroke="#67e8f9" strokeWidth={STROKE - 0.3} strokeLinecap="round" opacity="0.7" />
          <path d="M8 20h8M12 16.5V20" stroke="#67e8f9" strokeWidth={STROKE} strokeLinecap="round" />
          <path d="M12 8.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6.6-1.4z" fill="#67e8f9" />
        </Svg>
      );
    default:
      // generic hourglass placeholder
      return (
        <Svg size={size}>
          <circle cx="12" cy="12" r="8.5" fill="rgba(176,138,144,0.08)" stroke="#b08a90" strokeWidth={STROKE} />
          <path d="M12 8v4.5l3 2.5M12 8l-3 2.5 3 2" stroke="#b08a90" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
  }
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="spinner-wrap" role="status" aria-live="polite">
      <svg className="spinner" width="42" height="42" viewBox="0 0 42 42" aria-hidden>
        <circle className="spinner-track" cx="21" cy="21" r="16" fill="none" strokeWidth="4" />
        <circle className="spinner-head" cx="21" cy="21" r="16" fill="none" strokeWidth="4" strokeLinecap="round" />
      </svg>
      {label && <span className="hint">{label}</span>}
    </div>
  );
}
