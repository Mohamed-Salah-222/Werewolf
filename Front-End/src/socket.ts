import { io, type Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "@werewolf/shared";
import type {
  ClientToServerEvents,
  JoinGameData,
  RejoinGameData,
  ServerToClientEvents,
} from "@werewolf/shared";
import type { UpdateGamePayload } from "@werewolf/shared";
import { BACKEND_URL, loadSession, clearSession } from "./config";

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GameSocket | null = null;

export function getSocket(): GameSocket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      autoConnect: false,
      // hardened reconnection settings (same as old frontend)
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

type Listener = (snap: UpdateGamePayload) => void;
type ErrListener = (message: string) => void;

const snapshotListeners = new Set<Listener>();
const errorListeners = new Set<ErrListener>();
const kickedListeners = new Set<() => void>();
let bound = false;

export function bindGlobalHandlers(): void {
  if (bound) return;
  const s = getSocket();

  s.on(SOCKET_EVENTS.SERVER.UPDATE_GAME_SNAPSHOT, (snap) => {
    snapshotListeners.forEach((fn) => fn(snap));
  });

  s.on(SOCKET_EVENTS.SERVER.ERROR, (data) => {
    console.warn("server error:", data?.message);
    if (data?.message) errorListeners.forEach((fn) => fn(data.message));
  });

  s.on(SOCKET_EVENTS.SERVER.KICKED, () => {
    clearSession();
    kickedListeners.forEach((fn) => fn());
  });

  s.on(SOCKET_EVENTS.SERVER.HOST_TRANSFERRED, () => {
    // snapshot will follow with the new hostId — nothing else to do
  });

  // ── Hardened reconnect logic (ported from old store/sockets.ts):
  // after ANY successful reconnect, replay our saved identity so the backend
  // knows this brand-new socket and snapshots resume.
  s.on("connect", () => {
    const session = loadSession();
    if (session && inGame) {
      console.log("socket connected → auto-rejoin", session.gameCode);
      s.emit(SOCKET_EVENTS.CLIENT.REJOIN_GAME, session);
    }
  });

  s.on("disconnect", (reason) => {
    console.warn("socket disconnected:", reason);
    snapshotListeners.forEach((fn) => fn(null as never));
  });

  bound = true;
}

// tracks whether this tab is actively inside a game (set on snapshot, cleared on leave)
let inGame = false;

export function markInGame(v: boolean): void {
  inGame = v;
}

export function onSnapshot(fn: Listener): () => void {
  snapshotListeners.add(fn);
  return () => {
    snapshotListeners.delete(fn);
  };
}

export function onError(fn: ErrListener): () => void {
  errorListeners.add(fn);
  return () => {
    errorListeners.delete(fn);
  };
}

export function onKicked(fn: () => void): () => void {
  kickedListeners.add(fn);
  return () => {
    kickedListeners.delete(fn);
  };
}

export function connectAndJoin(data: JoinGameData | RejoinGameData): Promise<void> {
  const s = getSocket();
  bindGlobalHandlers();
  return new Promise((resolve, reject) => {
    const onOk = () => {
      cleanup();
      resolve();
    };
    const onErr = (d: { message: string }) => {
      cleanup();
      reject(new Error(d?.message ?? "join failed"));
    };
    const isRejoin = "playerId" in data && !!data.playerId;
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("انتهت المهلة أثناء الاتصال"));
    }, 8000);

    function cleanup() {
      clearTimeout(timeout);
      s.off(SOCKET_EVENTS.SERVER.UPDATE_GAME_SNAPSHOT, onOk);
      s.off(SOCKET_EVENTS.SERVER.ERROR, onErr);
    }
    s.once(SOCKET_EVENTS.SERVER.UPDATE_GAME_SNAPSHOT, onOk);
    s.once(SOCKET_EVENTS.SERVER.ERROR, onErr);

    const doJoin = () => {
      if (isRejoin) s.emit(SOCKET_EVENTS.CLIENT.REJOIN_GAME, data);
      else s.emit(SOCKET_EVENTS.CLIENT.JOIN_GAME, data);
    };

    if (s.connected) doJoin();
    else {
      s.once("connect", doJoin);
      s.connect();
    }
  });
}
