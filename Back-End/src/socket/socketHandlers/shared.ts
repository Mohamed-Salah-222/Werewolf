import { Server, Socket } from "socket.io";
import { Manager } from "../../entities/Manager";
import { ClientToServerEvents, ServerToClientEvents } from "../../types/socket.types";
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

export function transferHostIfNeeded(game: Game, removedPlayerId: string, gameCode: string, io: AppServer): void {
  if (game.host === removedPlayerId && game.players.length > 0) {
    game.host = game.players[0].id;
    io.to(gameCode).emit("hostChanged", { newHostId: game.host });
    console.log(`👑 Host transferred to ${game.players[0].name} (${game.host})`);
  }
}
