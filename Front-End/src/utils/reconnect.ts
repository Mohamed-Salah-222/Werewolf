import socket from "../socket";
import { getSession, clearSession, saveSession } from "./gameSession";
import type { RejoinResponse } from "../contexts/GameContextType";

export function reconnect(): RejoinResponse | undefined {
  if (!socket.connected) {
    socket.connect();
  }
  const session = getSession();
  if (!session) return;

  socket.emit("rejoinGame", { gameCode: session.gameCode, playerId: session.playerId, playerName: session.playerName }, (response: RejoinResponse) => {
    if (!response.success) {
      clearSession();
      return;
    }
    saveSession({
      gameCode: session.gameCode,
      playerId: response.playerId || session.playerId,
      playerName: response.playerName || session.playerName,
      isHost: session.isHost,
    });
    return response;
  });
}

export default reconnect;
