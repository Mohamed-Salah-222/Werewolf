const envUrl = import.meta.env.VITE_BACKEND_URL as string | undefined;

export const BACKEND_URL =
  envUrl ??
  (import.meta.env.PROD
    ? window.location.origin
    : `${window.location.protocol}//${window.location.hostname}:3000`);

export const SESSION_KEY = "werewolf-session-v2";

export interface StoredSession {
  gameCode: string;
  playerId: string;
  playerName: string;
}
