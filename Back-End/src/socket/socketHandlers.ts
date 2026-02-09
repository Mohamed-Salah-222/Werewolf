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
            error: ERROR_MESSAGES.GAME_ALREADY_STARTED,
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

        // Notify all players
        io.to(gameCode).emit("gameStarted", {
          phase: game.phase,
        });

        // Send role reveals to each player individually
        game.players.forEach((player) => {
          const role = player.getRole();
          io.to(gameCode).emit("roleReveal", {
            playerId: player.id,
            roleName: role.name,
            roleTeam: role.team,
            roleDescription: role.description,
          });
        });

        console.log(`Game ${gameCode} started`);
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

        game.playerPerformAction(playerId);

        // Notify player their action was confirmed
        socket.emit("actionResult", {
          success: true,
          message: "Action performed",
        });
      } catch (error) {
        console.error("Error in performAction:", error);
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
