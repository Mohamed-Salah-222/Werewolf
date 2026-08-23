import { useEffect, useState } from "react";

/** Live countdown from an absolute end timestamp (ms). Re-renders every second. */
export function useCountdown(endsAt: number | null): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = String(totalSec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

/** Big timer ring with the remaining seconds inside. */
export function TimerRing({ seconds, total, size = 96 }: { seconds: number; total: number; size?: number }) {
  if (!total || seconds <= 0) return <p className="timer huge">انتهى الوقت</p>;
  const frac = Math.min(1, seconds / total);
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const urgent = seconds <= 30;
  return (
    <div className={`timer-ring ${urgent ? "urgent" : ""}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" fill="none" strokeWidth="5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ring-fill"
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="timer-ring-num">{formatTime(seconds)}</span>
    </div>
  );
}
