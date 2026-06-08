import { SOCKET_EVENTS, Phase, ERROR_MESSAGES } from "@werewolf/shared";
import { SocketContext, transferHostIfNeeded, safeHandler, getGameOrThrow } from "./shared";
import { BuildGameSnapshot } from "../../entities/game/Game";

export function registerPlayerHandlers(ctx: SocketContext): void {
  const { socket, manager } = ctx;

  socket.on(SOCKET_EVENTS.CLIENT.REJOIN_GAME, safeHandler("rejoinGame", socket, (data: { gameCode: string; playerId: string; playerName: string }) => {
    const { gameCode, playerId, playerName } = data;
    const game = getGameOrThrow(manager, gameCode);

    let player = game.players.find((p) => p.id === playerId);
    if (!player) {
      player = game.players.find((p) => p.name === playerName);
    }

    if (!player) {
      if (game.phase === Phase.Waiting) {
        throw new Error("Player not found. Try joining normally.");
      } else {
        throw new Error("Game has already started");
      }
    }

    ctx.setCurrentGameCode(gameCode);
    ctx.setCurrentPlayerId(player.id);
    (socket as any).playerId = player.id;

    socket.join(gameCode);

    game.connectPlayer(player.id);
    socket.emit(SOCKET_EVENTS.SERVER.UPDATE_GAME_SNAPSHOT, BuildGameSnapshot(game, player.id));

    console.log(`🔄 Player ${player.name} (${player.id}) rejoined game ${gameCode} in phase ${game.phase}`);
  }));

  socket.on(SOCKET_EVENTS.CLIENT.SETTINGS_UPDATE, safeHandler("settingsUpdate", socket, ({ gameCode, playerId, settings }) => {
    const game = getGameOrThrow(manager, gameCode);
    if (game.host !== playerId) throw new Error(ERROR_MESSAGES.HOST_ONLY);

    game.updateSettings(settings);
    game.emit();

    console.log(`🔄 Settings updated in game ${gameCode}`);
  }));

  socket.on(SOCKET_EVENTS.CLIENT.CHANGE_NAME, safeHandler("changeName", socket, (data: { gameCode: string; playerId: string; newName: string }) => {
    const game = getGameOrThrow(manager, data.gameCode);

    if (game.phase !== Phase.Waiting) {
      throw new Error("Cannot change name after game started");
    }

    const trimmed = data.newName.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      throw new Error("Name must be 2-20 characters");
    }

    const duplicate = game.players.find((p) => p.id !== data.playerId && p.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      throw new Error("Name already taken");
    }

    const player = game.getPlayerById(data.playerId);
    player.name = trimmed;
    game.emit();

    console.log(`✏️ Player ${data.playerId} changed name to "${trimmed}"`);
  }));

  socket.on(SOCKET_EVENTS.CLIENT.KICK_PLAYER, safeHandler("kickPlayer", socket, ({ gameCode, hostId, kickedPlayerId }) => {
    const game = getGameOrThrow(manager, gameCode);
    if (game.phase !== Phase.Waiting) throw new Error("Can only kick players before game starts");
    if (game.host !== hostId) throw new Error(ERROR_MESSAGES.HOST_ONLY);

    const player = game.kickPlayer(kickedPlayerId);
    if (!player) throw new Error("Player not found in game");

    console.log(`Player ${player.name} kicked from game ${gameCode}`);
  }));

  socket.on(SOCKET_EVENTS.CLIENT.LEAVE_GAME, safeHandler("leaveGame", socket, ({ gameCode, playerId }) => {
    const game = getGameOrThrow(manager, gameCode);

    const player = game.players.find((p) => p.id === playerId);
    if (!player) throw new Error("Player not found in game");

    game.players = game.players.filter((p) => p.id !== playerId);
    game.readyPlayers.delete(playerId);
    transferHostIfNeeded(game, playerId);
    socket.leave(gameCode);

    ctx.setCurrentGameCode(null);
    ctx.setCurrentPlayerId(null);

    game.emit();

    console.log(`Player ${player.name} left game ${gameCode}`);
  }));

  socket.on(SOCKET_EVENTS.CLIENT.PLAYER_READY, safeHandler("playerReady", socket, ({ gameCode, playerId, ready }) => {
    const game = getGameOrThrow(manager, gameCode);
    const player = game.getPlayerById(playerId);
    game.playerReady(playerId);
    console.log(`Player ${playerId} : ${player.name} ${game.readyPlayers.get(playerId) ? "is ready" : "is not ready"}`);
  }));

  socket.on(SOCKET_EVENTS.CLIENT.PING_MEASURE, (_data: any) => {
    return;
  });

  socket.on(SOCKET_EVENTS.CLIENT.REPORT_PING, safeHandler("reportPing", socket, (data: { gameCode: string; playerId: string; ping: number }) => {
    const game = getGameOrThrow(manager, data.gameCode);

    if (!game.gamePings) game.gamePings = {};
    game.gamePings[data.playerId] = data.ping;

    game.emit();
  }));
}
