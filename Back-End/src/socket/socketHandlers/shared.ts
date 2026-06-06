import { Server, Socket } from "socket.io";
import { Manager } from "../../entities/Manager";
import { ClientToServerEvents, ServerToClientEvents } from "../../types/socket.types";
import { Game } from "../../entities/game";
import { ERROR_MESSAGES, Phase } from "../../config/constants";

export type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
export type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;

export interface SocketContext {
  socket: AppSocket;
  io: AppServer;
  manager: Manager;
  getCurrentGameCode: () => string | null;
  setCurrentGameCode: (code: string | null) => void;
  getCurrentPlayerId: () => string | null;
  setCurrentPlayerId: (id: string | null) => void;
}

// Wraps a socket event handler with try/catch and emits errors to the client
export function safeHandler<T>(
  name: string,
  socket: AppSocket,
  fn: (data: T) => void,
): (data: T) => void {
  return (data: T) => {
    try {
      fn(data);
    } catch (error: any) {
      console.error(`Error in ${name}:`, error);
      socket.emit("error", { message: error.message || ERROR_MESSAGES.UNKNOWN_ERROR });
    }
  };
}

export function getGameOrThrow(manager: Manager, gameCode: string): Game {
  const game = manager.getGameByCode(gameCode);
  if (!game) throw new Error(ERROR_MESSAGES.GAME_NOT_FOUND);
  return game;
}

export function assertHost(playerId: string, game: Game): void {
  if (playerId !== game.host) throw new Error(ERROR_MESSAGES.HOST_ONLY);
}

export function transferHostIfNeeded(game: Game, removedPlayerId: string): void {
  if (game.host === removedPlayerId && game.players.length > 0) {
    game.host = game.players[0].id;
    console.log(`👑 Host transferred to ${game.players[0].name} (${game.host})`);
  }
}
