import { Server } from "socket.io";
import { Game } from "../entities/Game";
import { ClientToServerEvents, ServerToClientEvents } from "../types/socket.types";

export function attachGameEventListeners(game: Game, io: Server<ClientToServerEvents, ServerToClientEvents>): void {
  const gameCode = game.code;

  game.on("nightStarted", () => {
    io.to(gameCode).emit("nightStarted");

    // Send ground role IDs (not names) to all players
    const groundCardIds = game.groundRoles.map((r, index) => ({
      id: r.id,
      label: `Ground Card ${index + 1}`,
    }));
    io.to(gameCode).emit("groundCards" as any, { cards: groundCardIds });
  });

  // Listen for role action queue
  game.on("roleActionQueue", (roleName: string) => {
    console.log(`📢 Emitting roleActionQueue to ${gameCode}:`, roleName);
    io.to(gameCode).emit("roleActionQueue", roleName); // Send STRING directly
  });

  // Listen for next action
  game.on("nextAction", (roleName: string) => {
    console.log(`📢 Emitting nextAction to ${gameCode}:`, roleName);
    io.to(gameCode).emit("nextAction", roleName); // Send STRING directly
  });

  // When discussion starts
  game.on("dayStarted", () => {
    io.to(gameCode).emit("discussionStarted", {
      timerSeconds: game.timer * 60,
    });
  });

  // When voting starts
  game.on("votingStarted", () => {
    io.to(gameCode).emit("votingStarted");
  });

  // When game ends
  game.on("gameEnded", (winners: string) => {
    io.to(gameCode).emit("gameEnded", {
      winners,
      votes: game.votes,
      playerRoles: game.players.map((p) => ({
        playerId: p.id,
        name: p.name,
        role: p.getRole().name,
      })),
    });
  });

  // Role timer info
  game.on("roleTimer", (data: { roleName: string; seconds: number }) => {
    io.to(gameCode).emit("roleTimer" as any, data);
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

  console.log(`Game event listeners attached for game ${gameCode}`);
}
