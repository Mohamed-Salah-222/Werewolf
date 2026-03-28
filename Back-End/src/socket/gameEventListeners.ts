import { Server } from "socket.io";
import { Game } from "../entities/game";
import { ClientToServerEvents, ServerToClientEvents } from "../types/socket.types";

export function attachGameEventListeners(game: Game, io: Server<ClientToServerEvents, ServerToClientEvents>): void {
  const gameCode = game.code;

  game.on("nightStarted", () => {
    // Send ground role IDs (not names) to all players
    const groundCardIds = game.groundRoles.map((r, index) => ({
      id: r.id,
      label: `Ground Card ${index + 1}`,
    }));
    io.to(gameCode).emit("groundCards", { cards: groundCardIds });
  });

  // Listen for role action queue
  game.on("roleActionQueue", (roleName: string) => {
    console.log(`📢 Emitting roleActionQueue to ${gameCode}:`, roleName);
    io.to(gameCode).emit("roleActionQueue", roleName);
  });

  // Night role progress — fires for EVERY role in the queue (UI only)
  game.on("nightRoleProgress", (data: { roleName: string; seconds: number }) => {
    console.log(`🌙 Emitting nightRoleProgress to ${gameCode}:`, data.roleName, `${data.seconds}s`);
    io.to(gameCode).emit("nightRoleProgress", data);
  });

  // Listen for next action
  game.on("nextAction", (roleName: string) => {
    console.log(`📢 Emitting nextAction to ${gameCode}:`, roleName);
    io.to(gameCode).emit("nextAction", roleName);
  });

  // When discussion starts
  game.on("dayStarted", (data) => {
    io.to(gameCode).emit("discussionStarted", {
      timerSeconds: data.currentTimerSec,
      currentTimerSec: data.currentTimerSec,
      startedAt: data.startedAt,
    });
  });

  // When voting starts
  game.on("votingStarted", () => {
    io.to(gameCode).emit("votingStarted");
  });

  // When game ends
  game.on("gameEnded", (result: { winners: string; isDraw: boolean; eliminatedPlayerId: string | null }) => {
    io.to(gameCode).emit("gameEnded", {
      winners: result.winners,
      isDraw: result.isDraw,
      eliminatedPlayerId: result.eliminatedPlayerId,
      votes: game.votes,
      playerRoles: game.players.map((p) => ({
        playerId: p.id,
        name: p.name,
        role: p.getRole().name,
      })),
      actionHistory: game.actionHistory,
    });
  });

  // Role timer info
  game.on("roleTimer", (data: { roleName: string; seconds: number }) => {
    io.to(gameCode).emit("roleTimer", data);
  });

  // Auto action result — send to specific player
  game.on("autoActionResult", (data: { playerId: string; result: any }) => {
    const sockets = io.sockets.sockets;
    for (const [, s] of sockets) {
      if (s.rooms.has(gameCode) && (s as any).playerId === data.playerId) {
        s.emit("actionResult", {
          success: true,
          message: "Action auto-performed",
          data: data.result,
        });
        break;
      }
    }
  });

  game.on("cloneInsomniacResult", (data: { playerId: string; result: any }) => {
    const sockets = io.sockets.sockets;
    for (const [, s] of sockets) {
      if (s.rooms.has(gameCode) && (s as any).playerId === data.playerId) {
        s.emit("cloneInsomniacResult", data.result);

        break;
      }
    }
  });

  console.log(`Game event listeners attached for game ${gameCode}`);

  console.log(`Game event listeners attached for game ${gameCode}`);
}
