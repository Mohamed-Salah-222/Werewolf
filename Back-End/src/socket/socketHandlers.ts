import { Server, Socket } from "socket.io";
import { Manager } from "../entities/Manager";
import { SOCKET_EVENTS, ERROR_MESSAGES, VALIDATION, Phase } from "../config/constants";
import { ClientToServerEvents, ServerToClientEvents, JoinGameData, JoinGameResponse } from "../types/socket.types";
import { PlayerId } from "../types/game.types";

export function initializeSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>, manager: Manager): void {
  io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`Client connected: ${socket.id}`);

    // Store player info in socket data
    let currentGameCode: string | null = null;
    let currentPlayerId: PlayerId | null = null;

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
        currentGameCode = gameCode;
        currentPlayerId = player.id;
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

    // REJOIN GAME
    socket.on("rejoinGame" as any, (data: { gameCode: string; playerId: string; playerName: string }, callback: (response: any) => void) => {
      try {
        const { gameCode, playerId, playerName } = data;

        const game = manager.getGameByCode(gameCode);
        if (!game) {
          callback({ success: false, error: "Game not found" });
          return;
        }

        // Find the player by ID first, then by name
        let player = game.players.find((p) => p.id === playerId);
        if (!player) {
          player = game.players.find((p) => p.name === playerName);
        }

        if (!player) {
          // Player was never in this game
          if (game.phase === "waiting") {
            callback({ success: false, error: "Player not found. Try joining normally." });
          } else {
            callback({ success: false, error: "Game has already started" });
          }
          return;
        }

        // Player found — rejoin them
        currentGameCode = gameCode;
        currentPlayerId = player.id;
        (socket as any).playerId = player.id;

        // Join socket room
        socket.join(gameCode);

        // Build role info if game has started
        let roleInfo = null;
        if (game.phase !== "waiting") {
          try {
            const role = player.getRole();
            const originalRole = player.getOriginalRole();
            roleInfo = {
              roleName: originalRole.name,
              roleTeam: originalRole.team,
              roleDescription: originalRole.description,
              currentRoleName: role.name,
            };
          } catch (e) {
            // Role might not be assigned yet
          }
        }

        // Build ground cards info if in night phase or later
        let groundCardsInfo = null;
        if (game.phase !== "waiting" && game.phase !== "role") {
          groundCardsInfo = game.groundRoles.map((r, index) => ({
            id: r.id,
            label: `Ground Card ${index + 1}`,
          }));
        }

        // Check if this player already performed their action
        const hasPerformedAction = game.confirmedPlayerPerformActions.includes(player.id);

        let lastActionResult = null;
        if (hasPerformedAction) {
          lastActionResult = (player as any).lastActionResult || null;
        }

        // Check if this player already confirmed role reveal
        const hasConfirmedRole = game.confirmedPlayerRoleReveal.includes(player.id);

        // Check if this player already voted
        const hasVoted = game.votes.some((v) => v.voter === player.id);

        callback({
          success: true,
          playerId: player.id,
          playerName: player.name,
          phase: game.phase,
          roleInfo,
          groundCardsInfo,
          hasPerformedAction,
          hasConfirmedRole,
          hasVoted,
          players: game.players.map((p) => ({ id: p.id, name: p.name })),
          timerSeconds: game.timer * 60,
          currentTimerSec: game.currentTimerSec,
          startedAt: game.startedAt,
          currentActiveRole: game.currentActiveRole || "",
          lastActionResult,
        });

        console.log(`🔄 Player ${player.name} (${player.id}) rejoined game ${gameCode} in phase ${game.phase}`);
      } catch (error: any) {
        console.error("Error in rejoinGame:", error);
        callback({ success: false, error: error.message || "Failed to rejoin" });
      }
    });

    // LEAVE GAME
    socket.on("leaveGame", ({ gameCode, playerId }) => {
      try {
        const game = manager.getGameByCode(gameCode);
        if (!game) return;

        const player = game.players.find((p) => p.id === playerId);
        if (!player) return;

        // Remove player from game
        game.players = game.players.filter((p) => p.id !== playerId);

        // Leave socket room
        socket.leave(gameCode);

        // Notify others
        io.to(gameCode).emit("playerLeft", {
          playerId,
          playerName: player.name,
          playerCount: game.players.length,
        });

        io.to(gameCode).emit("playerListUpdate", {
          players: game.players.map((p) => ({
            id: p.id,
            name: p.name,
          })),
        });

        // Clear current game info
        currentGameCode = null;
        currentPlayerId = null;

        console.log(`Player ${player.name} left game ${gameCode}`);
      } catch (error) {
        console.error("Error in leaveGame:", error);
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
            let playerSocket: Socket<ClientToServerEvents, ServerToClientEvents> | null = null;

            for (const [, s] of sockets) {
              // Check all sockets in this game room
              if (s.rooms.has(gameCode)) {
                // Match by checking the stored playerId on the socket data
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

    // Player ready
    socket.on("playerReady", ({ gameCode, playerId }) => {
      try {
        const game = manager.getGameByCode(gameCode);
        if (!game) return;

        game.playerRead(playerId);
        io.to(gameCode).emit("playerReady", { playerId });
        console.log(`Player ${playerId} is ready`);

      } catch (error: any) {
        console.error("Error in playerReady:", error);
        socket.emit("error", { message: error.message || ERROR_MESSAGES.UNKNOWN_ERROR });
      }
    });
    // CONFIRM ROLE REVEAL
    socket.on("confirmRoleReveal", ({ gameCode, playerId }) => {
      try {
        const game = manager.getGameByCode(gameCode);
        if (!game) return;

        game.confirmPlayerRoleReveal(playerId);

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

        console.log(`Player ${player.name} (${player.getRole().name}) performing action`);

        // Execute the actual role logic
        let actionResult;
        try {
          actionResult = player.performOriginalAction(game, action);
          console.log("Action result:", actionResult);
        } catch (error: any) {
          console.error("Error executing role action:", error);
          actionResult = { error: error.message };
        }

        // Store result for potential rejoin
        (player as any).lastActionResult = actionResult;

        // Send result back to THIS player only
        socket.emit("actionResult", {
          success: true,
          message: "Action performed",
          data: actionResult,
        });

        // Mark player as done (advances to next role)
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
    socket.on("skipToVote", (data: { gameCode: string, playerId: PlayerId }) => {
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

    // DISCONNECT
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);

      if (currentGameCode && currentPlayerId) {
        const game = manager.getGameByCode(currentGameCode);
        if (game) {
          const player = game.players.find((p) => p.id === currentPlayerId);
          if (player) {
            // Only remove player if game hasn't started yet
            if (game.phase === Phase.Waiting) {
              game.players = game.players.filter((p) => p.id !== currentPlayerId);

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
    });
  });

  console.log("Socket handlers initialized");
}
