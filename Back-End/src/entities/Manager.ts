import { Server } from "socket.io";
import { Game } from "./Game";
import { Phase } from "../config/constants";
import { Logger } from "../utils/Logger";
import { attachGameEventListeners } from "../socket/gameEventListeners";
import { ClientToServerEvents, ServerToClientEvents } from "../types/socket.types";
import { PlayerId } from "../types/game.types";

export class Manager {
  public games: Game[];
  public logger: Logger;
  private io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;
  private cleanupRunning = false;

  public constructor() {
    this.games = [];
    this.logger = Logger.getInstance();
  }

  public setSocketIO(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
    this.io = io;
  }

  public createGame(): Game {
    let game = new Game(this.logger);
    this.games.push(game);

    // Attach socket listeners if io is available
    if (this.io) {
      attachGameEventListeners(game, this.io);
    }

    return game;
  }

  public canJoinGame(code: string): boolean {
    const lowerCode = code.toLowerCase();
    let game = this.games.find((game) => game.code.toLowerCase() === lowerCode);
    if (game === undefined) {
      return false;
    }
    return game.phase === Phase.Waiting;
  }

  public joinGame(code: string, name: string): Game | null {
    if (!name || name.length === 0 || typeof name !== "string") {
      console.error("Invalid name: ", name);
      return null;
    }
    const lowerCode = code.toLowerCase();
    let game = this.games.find((game) => game.code.toLowerCase() === lowerCode);
    if (game) {
      if (game.phase !== Phase.Waiting) {
        console.error("this game has already started");
        return null;
      }
      game.playerJoin(name);
      return game;
    } else {
      return null;
    }
  }

  public getGameByCode(code: string): Game | null {
    const lowerCode = code.toLowerCase();
    let game = this.games.find((game) => game.code.toLowerCase() === lowerCode);
    if (game) {
      return game;
    } else {
      return null;
    }
  }

  startCleanupJob(): void {
    setInterval(async () => {
      if (this.cleanupRunning) return;
      this.cleanupRunning = true;

      try {
        this.deleteFinishedGames();
      } finally {
        this.cleanupRunning = false;
      }
    }, 120_000);
  }


  public deleteGame(game: Game): void {

    this.games = this.games.filter((g) => g !== game);
    // delete the game obj
    game.destroy();

  }

  public log(...args: any[]): void {
    args.forEach((arg) => this.logger.log(arg.toString()));
  }

  private deleteGameByCode(code: string): void {
    this.games = this.games.filter((g) => g.code !== code);
  }

  private deleteFinishedGames(): void {
    const now = Date.now();
    const ttl = 5 * 60 * 1000; // 5 minutes

    const expired = this.games.filter(
      (game) =>
        game.phase === Phase.EndGame &&
        game.endedAt &&
        now - game.endedAt > ttl
    );

    expired.forEach((game) => this.deleteGame(game));
  }
}
