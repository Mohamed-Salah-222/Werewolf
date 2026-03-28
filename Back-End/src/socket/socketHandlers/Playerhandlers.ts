import { ERROR_MESSAGES, Phase } from "../../config/constants";
import { SocketContext, transferHostIfNeeded } from "./Shared";

export function registerPlayerHandlers(ctx: SocketContext): void {
  const { socket, io, manager } = ctx;

  // REJOIN GAME
  socket.on("rejoinGame", (data: { gameCode: string; playerId: string; playerName: string }, callback: (response: any) => void) => {
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
      ctx.setCurrentGameCode(gameCode);
      ctx.setCurrentPlayerId(player.id);
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
          console.warn(`⚠️ Could not get role for player ${player.name} during rejoin:`, e);
          roleInfo = null;
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

      console.log("REJOIN DEBUG:", {
        hasPerformedAction,
        lastActionResult,
        playerLastAction: (player as any).lastActionResult,
      });

      if (game.phase === "night" && hasPerformedAction) {
        setTimeout(() => {
          // Check if game moved past night while component was mounting
          if (game.phase === "discussion") {
            socket.emit("discussionStarted", {
              timerSeconds: game.timer * 60,
              currentTimerSec: game.currentTimerSec,
              startedAt: game.startedAt,
            });
          } else if (game.phase === "vote") {
            socket.emit("votingStarted");
          }
        }, 2000);
      }

      // Re-emit roleReveal to the reconnected socket if in role or night phase
      if (roleInfo && (game.phase === "role" || game.phase === "night")) {
        setTimeout(() => {
          socket.emit("roleReveal", {
            playerId: player.id,
            roleName: roleInfo.roleName,
            roleTeam: roleInfo.roleTeam,
            roleDescription: roleInfo.roleDescription,
          });
        }, 500);
      }

      console.log(`🔄 Player ${player.name} (${player.id}) rejoined game ${gameCode} in phase ${game.phase}`);
    } catch (error: any) {
      console.error("Error in rejoinGame:", error);
      callback({ success: false, error: error.message || "Failed to rejoin" });
    }
  });

  // SETTINGS UPDATE
  socket.on("settingsUpdate", ({ gameCode, playerId, settings }) => {
    try {
      const game = manager.getGameByCode(gameCode);
      if (!game) return;

      const player = game.getPlayerById(playerId);
      if (!player) return;
      if (game.host !== player.id) {
        socket.emit("error", { message: ERROR_MESSAGES.HOST_ONLY });
        console.log("host only");
        return;
      }
      console.log("settings updated by player", player.name, settings);

      game.updateSettings(settings);
      console.log(`🔄 Player ${player.name} (${player.id}) updated settings in game ${gameCode}`);
    } catch (error: any) {
      console.error("Error in settingsUpdate:", error);
    }
  });

  // CHANGE NAME (waiting room only)
  socket.on("changeName", (data: { gameCode: string; playerId: string; newName: string }, callback: (response: { success: boolean; error?: string }) => void) => {
    try {
      const game = manager.getGameByCode(data.gameCode);
      if (!game) {
        callback({ success: false, error: "Game not found" });
        return;
      }

      if (game.phase !== Phase.Waiting) {
        callback({ success: false, error: "Cannot change name after game started" });
        return;
      }

      const trimmed = data.newName.trim();
      if (trimmed.length < 2 || trimmed.length > 20) {
        callback({ success: false, error: "Name must be 2-20 characters" });
        return;
      }

      // Check for duplicate names
      const duplicate = game.players.find((p) => p.id !== data.playerId && p.name.toLowerCase() === trimmed.toLowerCase());
      if (duplicate) {
        callback({ success: false, error: "Name already taken" });
        return;
      }

      const player = game.getPlayerById(data.playerId);
      if (!player) {
        callback({ success: false, error: "Player not found" });
        return;
      }

      player.name = trimmed;
      callback({ success: true });

      // Broadcast updated player list
      io.to(data.gameCode).emit("playerListUpdate", {
        players: game.players.map((p) => ({
          id: p.id,
          name: p.name,
        })),
      });

      console.log(`✏️ Player ${data.playerId} changed name to "${trimmed}" in game ${data.gameCode}`);
    } catch (error: any) {
      callback({ success: false, error: error.message || "Failed to change name" });
    }
  });

  // KICK PLAYER
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
      transferHostIfNeeded(game, kickedPlayerId, gameCode, io);

      // Notify others
      io.to(gameCode).emit("playerKicked", {
        kickedPlayerId,
      });

      io.to(gameCode).emit("playerListUpdate", {
        players: game.players.map((p) => ({
          id: p.id,
          name: p.name,
        })),
      });

      // Clear current game info
      ctx.setCurrentGameCode(null);
      ctx.setCurrentPlayerId(null);

      console.log(`Player ${player.name} left game ${gameCode}`);
    } catch (error) {
      console.error("Error in leaveGame:", error);
    }
  });

  // LEAVE GAME
  socket.on("leaveGame", ({ gameCode, playerId }) => {
    try {
      const game = manager.getGameByCode(gameCode);
      if (!game) return;

      const player = game.players.find((p) => p.id === playerId);
      if (!player) return;

      game.players = game.players.filter((p) => p.id !== playerId);
      game.readyPlayers.delete(playerId);
      transferHostIfNeeded(game, playerId, gameCode, io);
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
      ctx.setCurrentGameCode(null);
      ctx.setCurrentPlayerId(null);

      console.log(`Player ${player.name} left game ${gameCode}`);
    } catch (error) {
      console.error("Error in leaveGame:", error);
    }
  });

  // PLAYER READY
  socket.on("playerReady", ({ gameCode, playerId, ready }) => {
    try {
      const game = manager.getGameByCode(gameCode);
      if (!game) return;

      game.readyPlayers.set(playerId, ready);
      if (game.readyPlayers.size === game.players.length) {
        let allReady = true;
        for (const p of game.players) {
          if (!game.readyPlayers.get(p.id)) {
            allReady = false;
            break;
          }
        }
        game.allPlayersReady = allReady;
      }
      io.to(gameCode).emit("playerReady", { playerId, ready });
      console.log(`Player ${playerId} is ready`);
    } catch (error: any) {
      console.error("Error in playerReady:", error);
      socket.emit("error", { message: error.message || ERROR_MESSAGES.UNKNOWN_ERROR });
    }
  });

  // PING
  socket.on("pingMeasure", (_data: any, callback: () => void) => {
    if (typeof callback === "function") callback();
  });

  socket.on("reportPing", (data: { gameCode: string; playerId: string; ping: number }) => {
    try {
      const game = manager.getGameByCode(data.gameCode);
      if (!game) return;

      if (!game.gamePings) game.gamePings = {};
      game.gamePings[data.playerId] = data.ping;

      io.to(data.gameCode).emit("playerPings", game.gamePings);
    } catch {
      // Game doesn't exist, ignore
    }
  });
}
