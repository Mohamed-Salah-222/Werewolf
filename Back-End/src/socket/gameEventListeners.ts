import { Server } from "socket.io";
import { Game } from "../entities/Game";
import { ClientToServerEvents, ServerToClientEvents } from "../types/socket.types";

export function attachGameEventListeners(game: Game, io: Server<ClientToServerEvents, ServerToClientEvents>): void {
  const gameCode = game.code;

  // When night starts
  game.on("nightStarted", () => {
    io.to(gameCode).emit("nightStarted");
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

  console.log(`Game event listeners attached for game ${gameCode}`);
}
