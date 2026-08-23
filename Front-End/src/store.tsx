import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { UpdateGamePayload } from "@werewolf/shared";
import { getSocket, bindGlobalHandlers, onSnapshot } from "./socket";
import { SESSION_KEY, type StoredSession } from "./config";

interface Store {
  snapshot: UpdateGamePayload | null;
  connected: boolean;
  error: string | null;
  setError: (msg: string | null) => void;
}

const StoreContext = createContext<Store>({
  snapshot: null,
  connected: false,
  error: null,
  setError: () => {},
});

export function useStore(): Store {
  return useContext(StoreContext);
}

export function saveSession(s: StoredSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}
export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StoredSession;
    return s.gameCode && s.playerId ? s : null;
  } catch {
    return null;
  }
}
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<UpdateGamePayload | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    bindGlobalHandlers();
    const off = onSnapshot((snap) => {
      setSnapshot(snap);
      if (snap) {
        setConnected(true);
        const me = snap.players.find((p) => p.id === snap.yourPlayerId);
        if (me) saveSession({ gameCode: snap.code, playerId: snap.yourPlayerId!, playerName: me.name });
      }
      // keep last snapshot on brief disconnect; null only on fresh leave
    });
    return () => {
      off();
    };
  }, []);

  // connection status via socket events
  useEffect(() => {
    const s = getSocket();
    const on = () => setConnected(true);
    const offFn = () => setConnected(false);
    s.on("connect", on);
    s.on("disconnect", offFn);
    return () => {
      s.off("connect", on);
      s.off("disconnect", offFn);
    };
  }, []);

  return (
    <StoreContext.Provider value={{ snapshot, connected, error, setError }}>
      {children}
    </StoreContext.Provider>
  );
}
