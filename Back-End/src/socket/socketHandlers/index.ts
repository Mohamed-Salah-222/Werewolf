import { Server, Socket } from "socket.io";
import type { PlayerId, ClientToServerEvents, ServerToClientEvents } from "@werewolf/shared";
import { Manager } from "../../entities/Manager";
import { SocketContext } from "./shared";
import { registerGameHandlers } from "./gameHandlers";
import { registerPlayerHandlers } from "./playerHandlers";
import { registerVoiceHandlers } from "./voiceHandlers";
import { registerConnectionHandler } from "./connectionHandler";

export function initializeSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>, manager: Manager): void {
  io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`Client connected: ${socket.id}`);

    // Closure-scoped player state (same as original)
    let currentGameCode: string | null = null;
    let currentPlayerId: PlayerId | null = null;

    // Build the shared context all handlers receive
    const ctx: SocketContext = {
      socket,
      io,
      manager,
      getCurrentGameCode: () => currentGameCode,
      setCurrentGameCode: (code) => {
        currentGameCode = code;
      },
      getCurrentPlayerId: () => currentPlayerId,
      setCurrentPlayerId: (id) => {
        currentPlayerId = id;
      },
    };

    // Register all handler groups
    registerGameHandlers(ctx);
    registerPlayerHandlers(ctx);
    registerVoiceHandlers(ctx);
    registerConnectionHandler(ctx);
  });

  console.log("Socket handlers initialized");
}
