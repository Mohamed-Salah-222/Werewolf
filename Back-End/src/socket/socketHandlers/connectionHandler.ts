import { Phase } from "../../config/constants";
import { voiceRooms } from "../../types/voice.types";
import { SocketContext, transferHostIfNeeded } from "./shared";

export function registerConnectionHandler(ctx: SocketContext): void {
  const { socket, io, manager } = ctx;

  socket.on("disconnect", () => {
    const currentGameCode = ctx.getCurrentGameCode();
    const currentPlayerId = ctx.getCurrentPlayerId();

    console.log(`Client disconnected: ${socket.id}`);

    if (currentGameCode && currentPlayerId) {
      const game = manager.getGameByCode(currentGameCode);
      if (game) {
        const player = game.players.find((p) => p.id === currentPlayerId);
        if (player) {
          // Clean up ping data immediately on disconnect — runs regardless of phase
          if (game.gamePings) {
            delete game.gamePings[currentPlayerId];
            if (game.gamePingTimestamps) {
              delete game.gamePingTimestamps[currentPlayerId];
            }
            io.to(currentGameCode).emit("playerPings", game.gamePings);
          }

          // Only remove player if game hasn't started yet
          if (game.phase === Phase.Waiting) {
            game.players = game.players.filter((p) => p.id !== currentPlayerId);
            game.readyPlayers.delete(currentPlayerId);

            transferHostIfNeeded(game, currentPlayerId, currentGameCode, io);

            io.to(currentGameCode).emit("playerLeft", {
              playerId: currentPlayerId,
              playerName: player.name,
              playerCount: game.players.length,
            });

            io.to(currentGameCode).emit("playerListUpdate", {
              players: game.players.map((p) => ({
                id: p.id,
                name: p.name,
              })),
            });
          } else {
            // Game already started — keep player in game, just log disconnect
            console.log(`⚠️ Player ${player.name} disconnected from active game ${currentGameCode} (phase: ${game.phase})`);
          }
        }
      }
    }

    // Voice cleanup
    for (const [gameCode, room] of voiceRooms) {
      for (const [playerId, socketId] of room.players) {
        if (socketId === socket.id) {
          room.players.delete(playerId);

          socket.to(`voice:${gameCode}`).emit("voiceLeave", { playerId });

          console.log(`🔇 ${playerId} left voice`);

          if (room.players.size === 0) {
            voiceRooms.delete(gameCode);
          }

          return;
        }
      }
    }
  });
}
