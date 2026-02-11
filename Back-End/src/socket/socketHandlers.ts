import { Server, Socket } from "socket.io";
import { Manager } from "../entities/Manager";
import { Game } from "../entities/Game";
import { SOCKET_EVENTS, ERROR_MESSAGES, VALIDATION } from "../config/constants";
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
    socket.on("startGame", ({ gameCode }) => {
      try {
        const game = manager.getGameByCode(gameCode);
        if (!game) {
          socket.emit("error", { message: ERROR_MESSAGES.GAME_NOT_FOUND });
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
          io.to(gameCode).emit("nightStarted");
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
          actionResult = player.performAction(game, action);
          console.log("Action result:", actionResult);
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

    // RESTART GAME
    socket.on("restartGame", ({ gameCode }) => {
      try {
        const game = manager.getGameByCode(gameCode);
        if (!game) return;

        game.restart();

        // Notify all that this player voted
        io.to(gameCode).emit("gameRestarted");

        console.log(`Game ${gameCode} restarted`);
      } catch (error) {
        console.error("Error in restartGame:", error);
      }
    });
    // DISCONNECT
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);

      // If player was in a game, remove them
      if (currentGameCode && currentPlayerId) {
        const game = manager.getGameByCode(currentGameCode);
        if (game) {
          const player = game.players.find((p) => p.id === currentPlayerId);
          if (player) {
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
          }
        }
      }
    });
  });

  console.log("Socket handlers initialized");
}
