import { ERROR_MESSAGES, VALIDATION } from "../../config/constants";
import { SocketContext } from "./shared";
import { JoinGameData } from "../../types/socket.types";
import { PlayerId } from "../../types/game.types";

export function registerGameHandlers(ctx: SocketContext): void {
  const { socket, io, manager } = ctx;

  socket.on("joinGame", (data: JoinGameData) => {
    try {
      const { gameCode, playerName } = data;
      console.log("Joining game", gameCode, playerName);

      if (!playerName || playerName.length < VALIDATION.PLAYER_NAME_MIN_LENGTH) {
        throw new Error(ERROR_MESSAGES.INVALID_PLAYER_NAME);
      }

      if (!gameCode || gameCode.length !== VALIDATION.GAME_CODE_LENGTH) {
        throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
      }

      if (!manager.canJoinGame(gameCode)) {
        throw new Error(ERROR_MESSAGES.GAME_ALREADY_STARTED);
      }

      console.log("called here before error ", gameCode, playerName);
      const game = manager.joinGame(gameCode, playerName, socket);

      if (!game) {
        throw new Error(ERROR_MESSAGES.GAME_NOT_FOUND);
      }

      const player = game.players.find((p) => p.name === playerName);
      if (!player) {
        throw new Error(ERROR_MESSAGES.PLAYER_NOT_FOUND);
      }

      ctx.setCurrentGameCode(gameCode);
      console.log("set current game code", gameCode);
      ctx.setCurrentPlayerId(player.id);
      (socket as any).playerId = player.id;

      console.log(`✅ Player ${playerName} joined game ${gameCode}`);
    } catch (error: any) {
      console.error("Error in joinGame:", error);
      socket.emit("error", { message: error.message || ERROR_MESSAGES.UNKNOWN_ERROR });
    }
  });

  socket.on("startGame", ({ gameCode, playerId }) => {
    try {
      const game = manager.getGameByCode(gameCode);
      if (!game) {
        socket.emit("error", { message: ERROR_MESSAGES.GAME_NOT_FOUND });
        return;
      }
      if (playerId !== game.host) {
        socket.emit("error", { message: ERROR_MESSAGES.HOST_ONLY });
        return;
      }

      game.start();

      console.log(`Game ${gameCode} started`);
    } catch (error: any) {
      console.error("Error in startGame:", error);
      socket.emit("error", { message: error.message || ERROR_MESSAGES.UNKNOWN_ERROR });
    }
  });

  socket.on("confirmRoleReveal", ({ gameCode, playerId }) => {
    try {
      const game = manager.getGameByCode(gameCode);
      if (!game) {
        socket.emit("error", { message: ERROR_MESSAGES.GAME_NOT_FOUND });
        return;
      }

      game.confirmPlayerRoleReveal(playerId);
    } catch (error) {
      console.error("Error in confirmRoleReveal:", error);
      socket.emit("error", { message: ERROR_MESSAGES.UNKNOWN_ERROR });
    }
  });

  socket.on("performAction", ({ gameCode, playerId, action }) => {
    try {
      const game = manager.getGameByCode(gameCode);
      if (!game) {
        socket.emit("error", { message: ERROR_MESSAGES.GAME_NOT_FOUND });
        return;
      }

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
    } catch (error) {
      console.error("Error in performAction:", error);
      socket.emit("error", { message: ERROR_MESSAGES.UNKNOWN_ERROR });
    }
  });

  socket.on("vote", ({ gameCode, playerId, votedPlayerId }) => {
    try {
      const game = manager.getGameByCode(gameCode);
      if (!game) {
        socket.emit("error", { message: ERROR_MESSAGES.GAME_NOT_FOUND });
        return;
      }

      game.playerVote(playerId, votedPlayerId);

      console.log(`Player ${playerId} voted in game ${gameCode}`);
    } catch (error) {
      console.error("Error in vote:", error);
      socket.emit("error", { message: ERROR_MESSAGES.UNKNOWN_ERROR });
    }
  });

  socket.on("forceVotes", (data: { gameCode: string; playerId: string }) => {
    try {
      const game = manager.getGameByCode(data.gameCode);
      if (!game) {
        socket.emit("error", { message: ERROR_MESSAGES.GAME_NOT_FOUND });
        return;
      }
      game.forceVotes(data.playerId);
    } catch (error: any) {
      console.error("Error in forceVotes:", error);
      socket.emit("error", { message: error.message || ERROR_MESSAGES.UNKNOWN_ERROR });
    }
  });

  socket.on("restartGame", ({ gameCode }) => {
    try {
      const game = manager.getGameByCode(gameCode);
      if (!game) {
        socket.emit("error", { message: ERROR_MESSAGES.GAME_NOT_FOUND });
        return;
      }

      game.restart();

      console.log(`Game ${gameCode} restarted`);
    } catch (error) {
      console.error("Error in restartGame:", error);
      socket.emit("error", { message: ERROR_MESSAGES.UNKNOWN_ERROR });
    }
  });

  socket.on("skipToVote", (data: { gameCode: string; playerId: PlayerId }) => {
    try {
      const game = manager.getGameByCode(data.gameCode);
      if (!game) {
        socket.emit("error", { message: ERROR_MESSAGES.GAME_NOT_FOUND });
        return;
      }
      game.skipToVote(data.playerId);
    } catch (error) {
      console.error("Error in skipToVote:", error);
      socket.emit("error", { message: ERROR_MESSAGES.UNKNOWN_ERROR });
    }
  });
}
