interface GameSession {
  gameCode: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
}

const SESSION_KEY = "werewolf_session";

export function saveSession(session: GameSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): GameSession | null {
  const data = localStorage.getItem(SESSION_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
