// Tiny synthesized SFX engine — WebAudio oscillators only, zero asset files.
// Every sound is a small envelope-shaped tone stack; swap any entry of
// `PLAYERS` for real audio files later without touching call sites.

export type SfxName =
  | "click"
  | "select"
  | "deselect"
  | "confirm"
  | "error"
  | "turn"
  | "phase"
  | "vote"
  | "win"
  | "lose"
  | "tick";

const MUTE_KEY = "werewolf_sfx_muted";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = typeof localStorage !== "undefined" && localStorage.getItem(MUTE_KEY) === "1";
let initialized = false;

function ensureCtx(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.09;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Attach one-time gesture listeners so playback is allowed by autoplay policies. */
export function initSfx(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  const unlock = () => {
    try {
      ensureCtx();
    } catch {
      /* audio unavailable */
    }
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock, { passive: true });
}

interface ToneOpts {
  at?: number;
  dur: number;
  type?: OscillatorType;
  from: number;
  to?: number;
  vol?: number;
}

function tone({ at = 0, dur, type = "sine", from, to, vol = 1 }: ToneOpts): void {
  const c = ensureCtx();
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to && to !== from) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur * 0.3));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(master!);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

const PLAYERS: Record<SfxName, () => void> = {
  click: () => tone({ dur: 0.04, type: "triangle", from: 1700, to: 1300, vol: 0.25 }),
  select: () => {
    tone({ dur: 0.06, type: "sine", from: 620, to: 830, vol: 0.3 });
    tone({ at: 0.05, dur: 0.07, type: "sine", from: 860, vol: 0.2 });
  },
  deselect: () => tone({ dur: 0.08, type: "sine", from: 640, to: 450, vol: 0.26 }),
  confirm: () => {
    tone({ dur: 0.1, type: "sine", from: 523, vol: 0.3 });
    tone({ at: 0.08, dur: 0.16, type: "sine", from: 784, vol: 0.26 });
  },
  error: () => {
    tone({ dur: 0.1, type: "square", from: 130, vol: 0.12 });
    tone({ at: 0.12, dur: 0.12, type: "square", from: 98, vol: 0.1 });
  },
  turn: () => {
    tone({ dur: 0.3, type: "sine", from: 880, vol: 0.28 });
    tone({ at: 0.02, dur: 0.34, type: "sine", from: 1760, vol: 0.1 });
    tone({ at: 0.14, dur: 0.26, type: "sine", from: 1108, vol: 0.16 });
  },
  phase: () => {
    tone({ dur: 0.26, type: "sine", from: 392, to: 330, vol: 0.22 });
    tone({ at: 0.16, dur: 0.36, type: "triangle", from: 262, to: 220, vol: 0.18 });
  },
  vote: () => tone({ dur: 0.07, type: "triangle", from: 190, to: 125, vol: 0.35 }),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone({ at: i * 0.12, dur: 0.22, type: "sine", from: f, vol: 0.3 })),
  lose: () => [440, 349, 294, 220].forEach((f, i) => tone({ at: i * 0.14, dur: 0.26, type: "triangle", from: f, vol: 0.24 })),
  tick: () => tone({ dur: 0.03, type: "sine", from: 1000, vol: 0.15 }),
};

export const sfx = {
  play(name: SfxName): void {
    if (muted) return;
    try {
      PLAYERS[name]();
    } catch {
      /* never let sounds break the game */
    }
  },
  get muted(): boolean {
    return muted;
  },
  toggle(): boolean {
    muted = !muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* private mode */
    }
    if (!muted) this.play("click");
    window.dispatchEvent(new CustomEvent("werewolf:sfx-muted"));
    return muted;
  },
};
