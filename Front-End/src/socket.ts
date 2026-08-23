import { io, type Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "@werewolf/shared";
import type {
  ClientToServerEvents,
  JoinGameData,
  RejoinGameData,
  ServerToClientEvents,
} from "@werewolf/shared";
import type { UpdateGamePayload } from "@werewolf/shared";
import { BACKEND_URL } from "./config";

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
  s.on("disconnect", () => snapshotListeners.forEach((fn) => fn(null as never)));
  bound = true;
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
