import { io, type Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "@werewolf/shared";
import type {
  ClientToServerEvents,
  JoinGameData,
  RejoinGameData,
  ServerToClientEvents,
} from "@werewolf/shared";
import type { UpdateGamePayload } from "@werewolf/shared";
import { BACKEND_URL, SESSION_KEY, type StoredSession } from "./config";

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GameSocket | null = null;

export function getSocket(): GameSocket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

type Listener = (snap: UpdateGamePayload) => void;
type ErrListener = (message: string) => void;

const snapshotListeners = new Set<Listener>();
const errorListeners = new Set<ErrListener>();
let bound = false;

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StoredSession;
    return s.gameCode && s.playerId ? s : null;
  } catch {
    return null;
  }
}

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
  // Auto-rejoin: after an unexpected drop, socket.io hands us a brand-new
  // connection the backend doesn't know. Replay our saved identity so
  // snapshots resume (same contract as the old frontend's reconnection).
  s.on("reconnect" as never, () => {
    const session = loadSession();
    if (session && lastGameCode) {
      console.log("auto-rejoining", session.gameCode);
      s.emit(SOCKET_EVENTS.CLIENT.REJOIN_GAME, session);
    }
  });
  s.on("disconnect", () => snapshotListeners.forEach((fn) => fn(null as never)));
  bound = true;
}

// set by store when a snapshot arrives; cleared on explicit leave
export let lastGameCode: string | null = null;
export function setLastGameCode(code: string | null): void {
  lastGameCode = code;
}

// null snapshot means disconnected
export function onSnapshot(fn: Listener): () => void {
  snapshotListeners.add(fn);
  return () => snapshotListeners.delete(fn);
}

export function onError(fn: ErrListener): () => void {
  errorListeners.add(fn);
  return () => errorListeners.delete(fn);
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

    if (!s.connected) s.connect();
    if (isRejoin) s.emit(SOCKET_EVENTS.CLIENT.REJOIN_GAME, data);
    else s.emit(SOCKET_EVENTS.CLIENT.JOIN_GAME, data);
  });
}
