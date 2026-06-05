import { Server, Socket } from "socket.io";
import { Game } from "./game";
import { Phase, VALIDATION } from "../config/constants";
import { Logger } from "../utils/Logger";
import { ClientToServerEvents, ServerToClientEvents } from "../types/socket.types";

export class Manager {
  public games: Game[];
  public logger: Logger;
  private io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;
  private cleanupRunning = false;
  private sockets: Socket<ClientToServerEvents, ServerToClientEvents>[] = [];

  public constructor() {
    this.games = [];
    this.logger = Logger.getInstance();
  }

  public setSocketIO(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
    this.io = io;
  }


  public createGame(): Game {
    const game = new Game(this.logger, this.io);
    this.games.push(game);
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

  public joinGame(code: string, name: string, socket: unknown): Game | null {
    if (!name || name.length === 0 || typeof name !== "string") {
      console.error("Invalid name: ", name);
      return null;
    }
    // if (!code || typeof code !== "string" || code.length !== VALIDATION.GAME_CODE_LENGTH) {
    //   console.error("Invalid game code: ", code);
    //   return null;
    // }

    const lowerCode = code.toLowerCase();
    let game = this.games.find((game) => game.code.toLowerCase() === lowerCode);
    if (game) {
      if (game.phase !== Phase.Waiting) {
        console.error("this game has already started");
        return null;
      }
      console.log("tried to joing game here");
      game.playerJoin(name, socket);
      return game;
    } else {
      return null;
    }
  }

  public getGameByCode(code: string | null): Game | null {
    if (!code) return null;
    const lowerCode = code.toLowerCase();
    let game = this.games.find((game) => game.code.toLowerCase() === lowerCode);
    if (game) {
      return game;
    } else {
      return null;
    }
  }

  startCleanupJob(): void {
    console.log("Starting cleanup job first time");
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
    const finishedTtl = 5 * 60 * 1000; // 5 minutes after game ended
    const orphanTtl = 30 * 60 * 1000; // 30 minutes of no activity

    const expired = this.games.filter((game) => {
      // Finished games past TTL
      if (game.phase === Phase.EndGame && game.endedAt && now - game.endedAt > finishedTtl) {
        return true;
      }
      // Orphaned games — no activity for 30 minutes and not in waiting/endgame
      if (game.phase !== Phase.Waiting && game.phase !== Phase.EndGame && now - game.lastActivityAt > orphanTtl) {
        return true;
      }
      return false;
    });

    if (expired.length > 0) {
      console.log(`🗑️ Deleting ${expired.length} expired/orphaned games: ${expired.map((g) => g.code).join(", ")}`);
    }

    expired.forEach((game) => this.deleteGame(game));
  }
}
