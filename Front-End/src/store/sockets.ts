import { SOCKET_EVENTS } from "@werewolf/shared";
import type { UpdateGamePayload, JoinGameData, RejoinGameData } from "@werewolf/shared";
import { useGameStore } from "./gameStore";
import { io } from "socket.io-client";
import { API_URL } from "../config";

const socket = io(API_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

const PING_INTERVAL = 4000;
let pingIntervalId: ReturnType<typeof setInterval> | null = null;

let initialized = false;

function measurePing(gameCode: string, playerId: string) {
  const start = Date.now();
  socket.volatile.emit(SOCKET_EVENTS.CLIENT.PING_MEASURE, { gameCode, playerId }, () => {
    const latency = Date.now() - start;
    socket.emit(SOCKET_EVENTS.CLIENT.REPORT_PING, { gameCode, playerId, ping: latency });
  });
}

export function startPingInterval(gameCode: string, playerId: string): void {
  stopPingInterval();
  measurePing(gameCode, playerId);
  pingIntervalId = setInterval(() => measurePing(gameCode, playerId), PING_INTERVAL);
}

export function stopPingInterval(): void {
  if (pingIntervalId !== null) {
    clearInterval(pingIntervalId);
    pingIntervalId = null;
  }
}

export function connectAndJoin(data: JoinGameData): () => void {
  const doJoin = () => socket.emit(SOCKET_EVENTS.CLIENT.JOIN_GAME, data);
  if (socket.connected) {
    doJoin();
    return () => {};
  }
  socket.once("connect", doJoin);
  if (!socket.connected) socket.connect();
  return () => { socket.off("connect", doJoin); };
}

export function connectSocket(): void {
  if (!initialized) socketListners();
  if (!socket.connected) socket.connect();
}

function socketListners(): void {
  initialized = true;

  socket.on("connect", () => {
    const { gameCode, playerId, playerName } = useGameStore.getState();
    if (gameCode && playerId && playerName) {
      socket.emit(SOCKET_EVENTS.CLIENT.REJOIN_GAME, { gameCode, playerId, playerName });
    }
  });

  socket.on(SOCKET_EVENTS.SERVER.UPDATE_GAME_SNAPSHOT, (snapshot: UpdateGamePayload) => {
    const store = useGameStore.getState();
    const prevPlayerId = store.playerId;

    store.hydrate(snapshot);

    if (!prevPlayerId && snapshot.yourPlayerId) {
      const me = snapshot.players?.find((p) => p.id === snapshot.yourPlayerId);
      store.setSession({
        gameCode: snapshot.code,
        playerId: snapshot.yourPlayerId,
        playerName: me?.name ?? "",
        isHost: me?.isHost ?? false,
      });
      if (me?.name) sessionStorage.setItem("werewolf_playerName", me.name);
      return;
    }

    if (prevPlayerId && !snapshot.yourPlayerId) {
      store.reset();
      window.location.href = "/";
    }
  });

  socket.on(SOCKET_EVENTS.SERVER.KICKED, () => {
    const store = useGameStore.getState();
    store.reset();
    window.location.href = "/";
  });

  socket.on(SOCKET_EVENTS.SERVER.ERROR, (data: { message: string }) => {
    console.error("Server error:", data.message);
  });

  socket.on(SOCKET_EVENTS.SERVER.HOST_TRANSFERRED, () => {
    useGameStore.getState().setIsHost(true);
  });
}

export const gameActions = {
  joinGame: (data: JoinGameData) => socket.emit(SOCKET_EVENTS.CLIENT.JOIN_GAME, data),

  rejoinGame: (data: RejoinGameData) => socket.emit(SOCKET_EVENTS.CLIENT.REJOIN_GAME, data),

  leaveGame: (data: { gameCode: string; playerId: string }) =>
    socket.emit(SOCKET_EVENTS.CLIENT.LEAVE_GAME, data),

  playerReady: (data: { gameCode: string; playerId: string; ready: boolean }) =>
    socket.emit(SOCKET_EVENTS.CLIENT.PLAYER_READY, data),

  kickPlayer: (data: { gameCode: string; hostId: string; kickedPlayerId: string }) =>
    socket.emit(SOCKET_EVENTS.CLIENT.KICK_PLAYER, data),

  changeName: (data: { gameCode: string; playerId: string; newName: string }) =>
    socket.emit(SOCKET_EVENTS.CLIENT.CHANGE_NAME, data),

  settingsUpdate: (data: { gameCode: string; playerId: string; settings: unknown }) =>
    socket.emit(SOCKET_EVENTS.CLIENT.SETTINGS_UPDATE, data),

  startGame: (data: { gameCode: string; playerId: string }) =>
    socket.emit(SOCKET_EVENTS.CLIENT.START_GAME, data),

  confirmRoleReveal: (data: { gameCode: string; playerId: string }) =>
    socket.emit(SOCKET_EVENTS.CLIENT.CONFIRM_ROLE_REVEAL, data),

  performAction: (data: { gameCode: string; playerId: string; action: unknown }) =>
    socket.emit(SOCKET_EVENTS.CLIENT.PERFORM_ACTION, data),

  vote: (data: { gameCode: string; playerId: string; votedPlayerId: string }) =>
    socket.emit(SOCKET_EVENTS.CLIENT.VOTE, data),

  skipToVote: (data: { gameCode: string; playerId: string }) =>
    socket.emit(SOCKET_EVENTS.CLIENT.SKIP_TO_VOTE, data),

  forceVotes: (data: { gameCode: string; playerId: string }) =>
    socket.emit(SOCKET_EVENTS.CLIENT.FORCE_VOTES, data),

  restartGame: (data: { gameCode: string; playerId: string }) =>
    socket.emit(SOCKET_EVENTS.CLIENT.RESTART_GAME, data),

  pingMeasure: (data: { gameCode: string; playerId: string }) =>
    socket.emit(SOCKET_EVENTS.CLIENT.PING_MEASURE, data),

  reportPing: (data: { gameCode: string; playerId: string; ping: number }) =>
    socket.emit(SOCKET_EVENTS.CLIENT.REPORT_PING, data),

  voiceJoin: (data: { gameCode: string; playerId: string }) =>
    socket.emit(SOCKET_EVENTS.CLIENT.VOICE_JOIN, data),

  voiceOffer: (data: { to: string; offer: unknown }) =>
    socket.emit(SOCKET_EVENTS.CLIENT.VOICE_OFFER, data),

  voiceAnswer: (data: { to: string; answer: unknown }) =>
    socket.emit(SOCKET_EVENTS.CLIENT.VOICE_ANSWER, data),

  voiceIce: (data: { to: string; candidate: unknown }) =>
    socket.emit(SOCKET_EVENTS.CLIENT.VOICE_ICE, data),

  voiceLeave: (data: { playerId: string }) =>
    socket.emit(SOCKET_EVENTS.CLIENT.VOICE_LEAVE, data),
}
