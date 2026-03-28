import { ERROR_MESSAGES, VALIDATION, Phase } from "../../config/constants";
import { SocketContext } from "./shared";
import { JoinGameData } from "../../types/socket.types";
import { PlayerId } from "../../types/game.types";

export function registerGameHandlers(ctx: SocketContext): void {
  const { socket, io, manager } = ctx;

  // JOIN GAME
  socket.on("joinGame", (data: JoinGameData, callback) => {
    try {
      const { gameCode, playerName } = data;

      // Validate input
      if (!playerName || playerName.length < VALIDATION.PLAYER_NAME_MIN_LENGTH) {
        callback({
          success: false,
          error: ERROR_MESSAGES.INVALID_PLAYER_NAME,
        });
        return;
      }

      if (!gameCode || gameCode.length !== VALIDATION.GAME_CODE_LENGTH) {
        callback({
          success: false,
          error: "Invalid game code",
        });
        return;
      }

      // Check if game exists and can be joined
      if (!manager.canJoinGame(gameCode)) {
        callback({
          success: false,
          error: ERROR_MESSAGES.GAME_NOT_FOUND,
        });
        return;
      }

      // Join the game
      const game = manager.joinGame(gameCode, playerName);

      if (!game) {
        callback({
          success: false,
          error: ERROR_MESSAGES.INVALID_PLAYER_NAME,
        });
        return;
      }

      // Get the player that was just added
      const player = game.players.find((p) => p.name === playerName);

      if (!player) {
        callback({
          success: false,
          error: "Failed to join game",
        });
        return;
      }

      // Store game and player info
      ctx.setCurrentGameCode(gameCode);
      ctx.setCurrentPlayerId(player.id);
      (socket as any).playerId = player.id;

      // Join socket room for this game
      socket.join(gameCode);

      // Send success response to the joining player
      callback({
        success: true,
        playerId: player.id,
        playerName: player.name,
        message: "Joined game successfully",
      });

      // Notify all players in the room
      io.to(gameCode).emit("playerJoined", {
        playerId: player.id,
        playerName: player.name,
        playerCount: game.players.length,
      });

      // Send updated player list to all
      io.to(gameCode).emit("playerListUpdate", {
        players: game.players.map((p) => ({
          id: p.id,
          name: p.name,
        })),
      });

      console.log(`✅ Player ${playerName} joined game ${gameCode}`);
      console.log(`📊 Total players in game:`, game.players.length);
      console.log(
        `👥 Player list:`,
        game.players.map((p) => ({ id: p.id, name: p.name })),
      );
    } catch (error: any) {
      console.error("Error in joinGame:", error);
      callback({
        success: false,
        error: error.message || ERROR_MESSAGES.UNKNOWN_ERROR,
      });
    }
  });

  // START GAME
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

      // Start the game
      game.start();

      // Notify all players game started
      io.to(gameCode).emit("gameStarted", {
        phase: game.phase,
      });

      console.log(`Game ${gameCode} started - sending role reveals`);

      // Send each player ONLY their own role via their individual socket
      setTimeout(() => {
        const sockets = io.sockets.sockets;

        game.players.forEach((player) => {
          const role = player.getRole();

          // Find the socket that belongs to this player
          let playerSocket: any = null;

          for (const [, s] of sockets) {
            if (s.rooms.has(gameCode)) {
              const sData = s as any;
              if (sData.playerId === player.id) {
                playerSocket = s;
                break;
              }
            }
          }

          if (playerSocket) {
            console.log(`Sending role reveal to player ${player.name} (${player.id}): ${role.name}`);
            playerSocket.emit("roleReveal", {
              playerId: player.id,
              roleName: role.name,
              roleTeam: role.team,
              roleDescription: role.description,
            });
          } else {
            console.warn(`Could not find socket for player ${player.name} (${player.id})`);
          }
        });
      }, 500);
    } catch (error: any) {
      console.error("Error in startGame:", error);
      socket.emit("error", { message: error.message || ERROR_MESSAGES.UNKNOWN_ERROR });
    }
  });

  // CONFIRM ROLE REVEAL
  socket.on("confirmRoleReveal", ({ gameCode, playerId }) => {
    try {
      const game = manager.getGameByCode(gameCode);
      if (!game) return;

      game.confirmPlayerRoleReveal(playerId);
      io.to(gameCode).emit("playerRoleConfirmed", { playerId });

      // Check if all players confirmed
      if (game.confirmedPlayerRoleReveal.length === game.players.length) {
        // Move to night phase
        game.startNight();
        io.to(gameCode).emit("nightStarted", game.roleQueueWithTimer);
      }
    } catch (error) {
      console.error("Error in confirmRoleReveal:", error);
    }
  });

  // PERFORM ACTION
  socket.on("performAction", ({ gameCode, playerId, action }) => {
    try {
      const game = manager.getGameByCode(gameCode);
      if (!game) return;

      const player = game.getPlayerById(playerId);
      const isCloneFirstAction = action.type === "clone";
      const isCloneFollowUp = (player as any)._cloneAwaitingSecondAction === true;

      console.log(`Player ${player.name} (${player.getRole().name}) performing action [type: ${action.type}, cloneFollowUp: ${isCloneFollowUp}]`);

      // Execute the actual role logic
      let actionResult: any;
      try {
        if (isCloneFollowUp) {
          // Clone's second action — use the cloned role's performAction
          const clonedRole = player.getRole();
          actionResult = clonedRole.performAction()(game, player, action);
          console.log("Clone follow-up action result:", actionResult);

          // Clear the clone flag
          (player as any)._cloneAwaitingSecondAction = false;

          // Store the combined result
          const cloneFirstResult = (player as any)._cloneFirstResult;
          (player as any).lastActionResult = {
            ...cloneFirstResult,
            secondActionResult: actionResult,
            message: actionResult.message || cloneFirstResult.message,
          };
        } else {
          actionResult = player.performOriginalAction(game, action);
          console.log("Action result:", actionResult);
          (player as any).lastActionResult = actionResult;
        }
      } catch (error: any) {
        console.error("Error executing role action:", error);
        actionResult = { error: error.message };
      }

      // Send result back to THIS player only
      socket.emit("actionResult", {
        success: true,
        message: "Action performed",
        data: actionResult,
      });

      // Handle clone two-phase logic
      if (isCloneFirstAction && actionResult.needsSecondAction) {
        // Clone needs a second action — DON'T mark as done yet
        (player as any)._cloneAwaitingSecondAction = true;
        (player as any)._cloneFirstResult = actionResult;
        console.log(`🧬 Clone ${player.name} needs second action as ${actionResult.clonedRole}`);
        return; // Don't call playerPerformAction yet
      }

      // Mark player as done
      game.playerPerformAction(playerId);
    } catch (error) {
      console.error("Error in performAction:", error);
      socket.emit("actionResult", {
        success: false,
        message: "Action failed",
      });
    }
  });

  // VOTE
  socket.on("vote", ({ gameCode, playerId, votedPlayerId }) => {
    try {
      const game = manager.getGameByCode(gameCode);
      if (!game) return;

      game.playerVote(playerId, votedPlayerId);

      // Notify all that this player voted
      io.to(gameCode).emit("voteConfirmed", { playerId });

      console.log(`Player ${playerId} voted for ${votedPlayerId} in game ${gameCode}`);
    } catch (error) {
      console.error("Error in vote:", error);
    }
  });

  // FORCE VOTES
  socket.on("forceVotes", (data: { gameCode: string; playerId: string }, callback?: (response: { success: boolean; error?: string }) => void) => {
    try {
      const game = manager.getGameByCode(data.gameCode);
      game.forceVotes(data.playerId);
      callback?.({ success: true });
    } catch (error: any) {
      callback?.({ success: false, error: error.message });
    }
  });

  // RESTART GAME
  socket.on("restartGame", ({ gameCode }) => {
    try {
      const game = manager.getGameByCode(gameCode);
      if (!game) return;

      game.restart();

      // Make sure this socket is in the room
      socket.join(gameCode);

      // Notify all players
      io.to(gameCode).emit("gameRestarted");

      console.log(`Game ${gameCode} restarted`);
    } catch (error) {
      console.error("Error in restartGame:", error);
    }
  });

  // SKIP TO VOTE
  socket.on("skipToVote", (data: { gameCode: string; playerId: PlayerId }) => {
    try {
      const game = manager.getGameByCode(data.gameCode);
      if (!game) {
        return;
      }
      game.skipToVote(data.playerId);
      io.to(data.gameCode).emit("votingStarted");
    } catch (error) {
      console.error("Error in skipToVote:", error);
    }
  });
}
