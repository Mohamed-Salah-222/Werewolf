import { SOCKET_EVENTS, ERROR_MESSAGES, VALIDATION } from "@werewolf/shared";
import type { JoinGameData } from "@werewolf/shared";
import { SocketContext, safeHandler, getGameOrThrow, assertHost } from "./shared";
import { Game } from "../../entities/game/Game";

// TODO : move to game.ts
const RANDOM_NAMES = ["Nora Ganzer", "Mde7a 4waya", "Master Baiter", "BenDover69", "Cereal Killer", "Lionel Pepsi", "Kom Zbala", "8ba2 Astna3y", "Gaymer", "Chicken Bobs", "Hairy Potter", "Honor Hitler"];

function pickRandomName(game: Game): string {
  const taken = new Set(game.players.map((p) => p.name.toLowerCase()));
  const available = RANDOM_NAMES.filter((n) => !taken.has(n.toLowerCase()));
  if (available.length > 0) return available[Math.floor(Math.random() * available.length)];
  return `Wolf${Math.floor(Math.random() * 9000) + 1000}`;
}

// NOTE : this looks ok just need a bit of cleaning
export function registerGameHandlers(ctx: SocketContext): void {
  const { socket, io, manager } = ctx;

  socket.on(SOCKET_EVENTS.CLIENT.JOIN_GAME, safeHandler("joinGame", socket, (data: JoinGameData) => {
    const { gameCode } = data;
    let { playerName } = data;
    console.log("Joining game", gameCode, playerName);

    if (!gameCode || gameCode.length !== VALIDATION.GAME_CODE_LENGTH) {
      throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
    }

    if (!manager.canJoinGame(gameCode)) {
      throw new Error(ERROR_MESSAGES.GAME_ALREADY_STARTED);
    }

    const game = getGameOrThrow(manager, gameCode);

    if (!playerName || playerName.trim().length < VALIDATION.PLAYER_NAME_MIN_LENGTH) {
      playerName = pickRandomName(game);
    }

    const taken = game.players.some((p) => p.name.toLowerCase() === playerName.trim().toLowerCase());
    if (taken) {
      playerName = pickRandomName(game);
    }

    const resolvedName = playerName.trim();
    const joined = manager.joinGame(gameCode, resolvedName, socket);
    if (!joined) {
      throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
    }

    const player = game.players.find((p) => p.name === resolvedName);
    if (!player) {
      throw new Error(ERROR_MESSAGES.PLAYER_NOT_FOUND);
    }

    ctx.setCurrentGameCode(gameCode);
    ctx.setCurrentPlayerId(player.id);
    (socket as any).playerId = player.id;

    console.log(`✅ Player ${resolvedName} joined game ${gameCode}`);
  }));

  socket.on(SOCKET_EVENTS.CLIENT.START_GAME, safeHandler("startGame", socket, ({ gameCode, playerId }) => {
    const game = getGameOrThrow(manager, gameCode);
    assertHost(playerId, game);
    game.start();
    console.log(`Game ${gameCode} started`);
  }));

  socket.on(SOCKET_EVENTS.CLIENT.CONFIRM_ROLE_REVEAL, safeHandler("confirmRoleReveal", socket, ({ gameCode, playerId }) => {
    const game = getGameOrThrow(manager, gameCode);
    game.confirmPlayerRoleReveal(playerId);
  }));

  socket.on(SOCKET_EVENTS.CLIENT.PERFORM_ACTION, safeHandler("performAction", socket, ({ gameCode, playerId, action }) => {
    const game = getGameOrThrow(manager, gameCode);

    const player = game.getPlayerById(playerId);
    const isCloneFirstAction = action.type === "clone";
    const isCloneFollowUp = (player as any)._cloneAwaitingSecondAction === true;

    console.log(`Player ${player.name} (${player.getRole().name}) performing action [type: ${action.type}, cloneFollowUp: ${isCloneFollowUp}]`);

    let actionResult: any;
    try {
      if (isCloneFollowUp) {
        const clonedRole = player.getRole();
        actionResult = clonedRole.performAction()(game, player, action);

        (player as any)._cloneAwaitingSecondAction = false;

        const cloneFirstResult = (player as any)._cloneFirstResult;
        (player as any).lastActionResult = {
          ...cloneFirstResult,
          secondActionResult: actionResult,
          message: actionResult.message || cloneFirstResult.message,
        };
      } else {
        actionResult = player.performOriginalAction(game, action);
        (player as any).lastActionResult = actionResult;
      }
    } catch (error: any) {
      console.error("Error executing role action:", error);
      actionResult = { error: error.message };
    }

    if (isCloneFirstAction && actionResult.needsSecondAction) {
      (player as any)._cloneAwaitingSecondAction = true;
      (player as any)._cloneFirstResult = actionResult;
      return;
    }

    game.playerPerformAction(playerId);
  }));

  socket.on(SOCKET_EVENTS.CLIENT.VOTE, safeHandler("vote", socket, ({ gameCode, playerId, votedPlayerId }) => {
    const game = getGameOrThrow(manager, gameCode);
    game.playerVote(playerId, votedPlayerId);
    console.log(`Player ${playerId} voted in game ${gameCode}`);
  }));

  socket.on(SOCKET_EVENTS.CLIENT.FORCE_VOTES, safeHandler("forceVotes", socket, (data: { gameCode: string; playerId: string }) => {
    const game = getGameOrThrow(manager, data.gameCode);
    game.forceVotes(data.playerId);
  }));

  socket.on(SOCKET_EVENTS.CLIENT.RESTART_GAME, safeHandler("restartGame", socket, ({ gameCode }: { gameCode: string }) => {
    const game = getGameOrThrow(manager, gameCode);
    assertHost((socket as any).playerId, game);
    game.restart();
    console.log(`Game ${gameCode} restarted`);
  }));

  socket.on(SOCKET_EVENTS.CLIENT.SKIP_TO_VOTE, safeHandler("skipToVote", socket, (data: { gameCode: string; playerId: string }) => {
    const game = getGameOrThrow(manager, data.gameCode);
    game.skipToVote(data.playerId);
  }));
}
