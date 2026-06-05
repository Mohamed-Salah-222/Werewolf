import socket from "../socket";
import { useGameStore } from "./gameStore";

type PlayerId = string;

let initialized = false;

export function socketListners(): void {
  if (!socket.connected) socket.connect();
  if (initialized) return;

  initialized = true;

  socket.on("connect", () => {
    console.log("connected");
  });

  socket.on("disconnect", () => {
    console.log("disconnected");
  });

  socket.on("updateGameSnapShot", (snapshot: any) => {
    const store = useGameStore.getState();
    store.hydrate(snapshot);

    if (!store.playerId && snapshot.yourPlayerId) {
      const me = snapshot.players?.find((p: any) => p.id === snapshot.yourPlayerId);
      store.setSession({
        gameCode: snapshot.code,
        playerId: snapshot.yourPlayerId,
        playerName: sessionStorage.getItem("werewolf_playerName") || "",
        isHost: me?.isHost ?? false,
      });
    }
  });
}

export const gameActions = {
  joinGame: (data: unknown) => socket.emit('joinGame', data),

  rejoinGame: (data: unknown) => socket.emit('rejoinGame', data),

  leaveGame: (data: { gameCode: string; playerId: PlayerId }) =>
    socket.emit('leaveGame', data),

  playerReady: (data: { gameCode: string; playerId: PlayerId; ready: boolean }) =>
    socket.emit('playerReady', data),

  kickPlayer: (data: { gameCode: string; hostId: PlayerId; kickedPlayerId: PlayerId }) =>
    socket.emit('kickPlayer', data),

  changeName: (data: { gameCode: string; playerId: string; newName: string }) =>
    socket.emit('changeName', data),

  settingsUpdate: (data: { gameCode: string; playerId: PlayerId; settings: unknown }) =>
    socket.emit('settingsUpdate', data),

  startGame: (data: { gameCode: string; playerId: PlayerId }) =>
    socket.emit('startGame', data),

  confirmRoleReveal: (data: { gameCode: string; playerId: PlayerId }) =>
    socket.emit('confirmRoleReveal', data),

  performAction: (data: { gameCode: string; playerId: PlayerId; action: unknown }) =>
    socket.emit('performAction', data),

  vote: (data: { gameCode: string; playerId: PlayerId; votedPlayerId: PlayerId }) =>
    socket.emit('vote', data),

  skipToVote: (data: { gameCode: string; playerId: PlayerId }) =>
    socket.emit('skipToVote', data),

  forceVotes: (data: { gameCode: string; playerId: string }) =>
    socket.emit('forceVotes', data),

  restartGame: (data: { gameCode: string; playerId: PlayerId }) =>
    socket.emit('restartGame', data),

  pingMeasure: (data: { gameCode: string; playerId: string }) =>
    socket.emit('pingMeasure', data),

  reportPing: (data: { gameCode: string; playerId: string; ping: number }) =>
    socket.emit('reportPing', data),

  voiceJoin: (data: { gameCode: string; playerId: PlayerId }) =>
    socket.emit('voiceJoin', data),

  voiceOffer: (data: { to: PlayerId; offer: unknown }) =>
    socket.emit('voiceOffer', data),

  voiceAnswer: (data: { to: PlayerId; answer: unknown }) =>
    socket.emit('voiceAnswer', data),

  voiceIce: (data: { to: PlayerId; candidate: unknown }) =>
    socket.emit('voiceIce', data),

  voiceLeave: (data: { playerId: PlayerId }) =>
    socket.emit('voiceLeave', data),
}

