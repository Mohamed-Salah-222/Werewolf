import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { UpdateGamePayload } from "@werewolf/shared";
import {
  getSocket,
  bindGlobalHandlers,
  onSnapshot,
  onKicked,
  markInGame,
} from "./socket";
import { saveSession, clearSession, loadSession } from "./config";

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
export { saveSession, loadSession, clearSession };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<UpdateGamePayload | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    bindGlobalHandlers();
    const off = onSnapshot((snap) => {
      setSnapshot(snap);
      if (snap) {
        setConnected(true);
        markInGame(true);
        const me = snap.players.find((p) => p.id === snap.yourPlayerId);
        if (me && snap.yourPlayerId) {
          saveSession({ gameCode: snap.code, playerId: snap.yourPlayerId, playerName: me.name });
        }
      }
      // keep last snapshot on brief disconnect so the UI doesn't flash;
      // reconnect handler restores live snapshots automatically
    });

    const offKicked = onKicked(() => {
      markInGame(false);
      setSnapshot(null);
      navigate("/");
    });

    return () => {
      off();
      offKicked();
    };
  }, [navigate]);

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
