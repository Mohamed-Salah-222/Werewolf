import { Server, Socket } from "socket.io";
import { ERROR_MESSAGES } from "@werewolf/shared";
import type { ClientToServerEvents, ServerToClientEvents } from "@werewolf/shared";
import { Manager } from "../../entities/Manager";
import { Game } from "../../entities/game";

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
  if (game.host !== removedPlayerId) return;
  if (game.players.length === 0) return;

  if (game.hostTransferTimeout) {
    clearTimeout(game.hostTransferTimeout);
    game.hostTransferTimeout = null;
  }

  const firstConnected = game.players.find((p) =>
    game.connectedPlayers.has(p.id),
  );
  const newHost = firstConnected ?? game.players[0];
  game.host = newHost.id;
  console.log(`👑 Host transferred to ${newHost.name} (${game.host})`);
}
