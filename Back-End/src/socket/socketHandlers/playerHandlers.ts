import { ERROR_MESSAGES, Phase } from "../../config/constants";
import { SocketContext, transferHostIfNeeded } from "./shared";
import { BuildGameSnapshot } from "../../entities/game/Game";

export function registerPlayerHandlers(ctx: SocketContext): void {
  const { socket, manager } = ctx;

  socket.on("rejoinGame", (data: { gameCode: string; playerId: string; playerName: string }) => {
    try {
      const { gameCode, playerId, playerName } = data;

      const game = manager.getGameByCode(gameCode);
      if (!game) {
        socket.emit("error", { message: "Game not found" });
        return;
      }

      let player = game.players.find((p) => p.id === playerId);
      if (!player) {
        player = game.players.find((p) => p.name === playerName);
      }

      if (!player) {
        if (game.phase === Phase.Waiting) {
          socket.emit("error", { message: "Player not found. Try joining normally." });
        } else {
          socket.emit("error", { message: "Game has already started" });
        }
        return;
      }

      ctx.setCurrentGameCode(gameCode);
      ctx.setCurrentPlayerId(player.id);
      (socket as any).playerId = player.id;

      socket.join(gameCode);

      socket.emit("updateGameSnapShot", BuildGameSnapshot(game, player.id));

      console.log(`🔄 Player ${player.name} (${player.id}) rejoined game ${gameCode} in phase ${game.phase}`);
    } catch (error: any) {
      console.error("Error in rejoinGame:", error);
      socket.emit("error", { message: error.message || "Failed to rejoin" });
    }
  });

  socket.on("settingsUpdate", ({ gameCode, playerId, settings }) => {
    try {
      const game = manager.getGameByCode(gameCode);
      if (!game) {
        socket.emit("error", { message: ERROR_MESSAGES.GAME_NOT_FOUND });
        return;
      }

      const player = game.getPlayerById(playerId);
      if (!player) {
        socket.emit("error", { message: ERROR_MESSAGES.PLAYER_NOT_FOUND });
        return;
      }
      if (game.host !== player.id) {
        socket.emit("error", { message: ERROR_MESSAGES.HOST_ONLY });
        return;
      }

      game.updateSettings(settings);
      game.emit();

      console.log(`🔄 Player ${player.name} updated settings in game ${gameCode}`);
    } catch (error: any) {
      console.error("Error in settingsUpdate:", error);
      socket.emit("error", { message: error.message || ERROR_MESSAGES.UNKNOWN_ERROR });
    }
  });

  socket.on("changeName", (data: { gameCode: string; playerId: string; newName: string }) => {
    try {
      const game = manager.getGameByCode(data.gameCode);
      if (!game) {
        socket.emit("error", { message: "Game not found" });
        return;
      }

      if (game.phase !== Phase.Waiting) {
        socket.emit("error", { message: "Cannot change name after game started" });
        return;
      }

      const trimmed = data.newName.trim();
      if (trimmed.length < 2 || trimmed.length > 20) {
        socket.emit("error", { message: "Name must be 2-20 characters" });
        return;
      }

      const duplicate = game.players.find((p) => p.id !== data.playerId && p.name.toLowerCase() === trimmed.toLowerCase());
      if (duplicate) {
        socket.emit("error", { message: "Name already taken" });
        return;
      }

      const player = game.getPlayerById(data.playerId);
      if (!player) {
        socket.emit("error", { message: "Player not found" });
        return;
      }

      player.name = trimmed;
      game.emit();

      console.log(`✏️ Player ${data.playerId} changed name to "${trimmed}"`);
    } catch (error: any) {
      console.error("Error in changeName:", error);
      socket.emit("error", { message: error.message || "Failed to change name" });
    }
  });

  socket.on("kickPlayer", ({ gameCode, hostId, kickedPlayerId }) => {
    try {
      const game = manager.getGameByCode(gameCode);
      if (!game) return;
      if (game.phase !== Phase.Waiting) return;
      if (game.host !== hostId) return;

      const player = game.getPlayerById(kickedPlayerId);
      if (!player) return;

      game.players = game.players.filter((p) => p.id !== player.id);
      game.readyPlayers.delete(kickedPlayerId);
      transferHostIfNeeded(game, kickedPlayerId);

      ctx.setCurrentGameCode(null);
      ctx.setCurrentPlayerId(null);

      game.emit();

      console.log(`Player ${player.name} kicked from game ${gameCode}`);
    } catch (error) {
      console.error("Error in kickPlayer:", error);
    }
  });

  socket.on("leaveGame", ({ gameCode, playerId }) => {
    try {
      const game = manager.getGameByCode(gameCode);
      if (!game) return;

      const player = game.players.find((p) => p.id === playerId);
      if (!player) return;

      game.players = game.players.filter((p) => p.id !== playerId);
      game.readyPlayers.delete(playerId);
      transferHostIfNeeded(game, playerId);
      socket.leave(gameCode);

      ctx.setCurrentGameCode(null);
      ctx.setCurrentPlayerId(null);

      game.emit();

      console.log(`Player ${player.name} left game ${gameCode}`);
    } catch (error) {
      console.error("Error in leaveGame:", error);
    }
  });

  socket.on("playerReady", ({ gameCode, playerId, ready }) => {
    try {
      const game = manager.getGameByCode(gameCode);
      if (!game) {
        socket.emit("error", { message: ERROR_MESSAGES.GAME_NOT_FOUND });
        return;
      }

      const player = game.getPlayerById(playerId);
      if (!player) {
        socket.emit("error", { message: ERROR_MESSAGES.PLAYER_NOT_FOUND });
        return;
      }

      game.playerReady(playerId);
      console.log(`Player ${playerId} : ${player.name} ${game.readyPlayers.get(playerId) ? "is ready" : "is not ready"}`);
    } catch (error: any) {
      console.error("Error in playerReady:", error);
      socket.emit("error", { message: error.message || ERROR_MESSAGES.UNKNOWN_ERROR });
    }
  });

  socket.on("pingMeasure", (_data: any) => {
    return;
  });

  socket.on("reportPing", (data: { gameCode: string; playerId: string; ping: number }) => {
    try {
      const game = manager.getGameByCode(data.gameCode);
      if (!game) return;

      if (!game.gamePings) game.gamePings = {};
      game.gamePings[data.playerId] = data.ping;

      game.emit();
    } catch {
      // Game doesn't exist, ignore
    }
  });
}
