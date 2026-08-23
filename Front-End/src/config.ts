const envUrl = import.meta.env.VITE_BACKEND_URL as string | undefined;

export const BACKEND_URL =
  envUrl ??
  (import.meta.env.PROD
    ? window.location.origin
    : `${window.location.protocol}//${window.location.hostname}:3000`);

// Per-tab session storage — each browser tab is its own player (same way the old
// frontend did it with zustand persist over sessionStorage).
export const SESSION_KEY = "werewolf_game";

export function saveSession(s: StoredSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function loadSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StoredSession;
    return s.gameCode && s.playerId ? s : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export interface StoredSession {
  gameCode: string;
  playerId: string;
  playerName: string;
}
