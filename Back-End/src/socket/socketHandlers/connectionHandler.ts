import { Phase } from "../../config/constants";
import { voiceRooms } from "../../types/voice.types";
import { SocketContext, transferHostIfNeeded } from "./shared";

export function registerConnectionHandler(ctx: SocketContext): void {
  const { socket, io, manager } = ctx;

  socket.on("disconnect", () => {
    const currentGameCode = ctx.getCurrentGameCode();
    const currentPlayerId = ctx.getCurrentPlayerId();

    const game = currentGameCode ? manager.getGameByCode(currentGameCode) : null;
    const player = game?.getPlayerById(currentPlayerId);

    console.log(`Client disconnected: ${socket.id}: ${currentPlayerId} : ${player?.name}`);

    if (game && currentPlayerId) {
      if (player) {
        if (game.gamePings) {
          delete game.gamePings[currentPlayerId];
          if (game.gamePingTimestamps) {
            delete game.gamePingTimestamps[currentPlayerId];
          }
        }

        if (game.phase === Phase.Waiting) {
          game.players = game.players.filter((p) => p.id !== currentPlayerId);
          game.readyPlayers.delete(currentPlayerId);

          transferHostIfNeeded(game, currentPlayerId);

          game.emit();
        } else {
          console.log(`⚠️ Player ${player.name} disconnected from active game ${currentGameCode} (phase: ${game.phase})`);
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
