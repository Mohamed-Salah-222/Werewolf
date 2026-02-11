import { Server } from "socket.io";
import { Game } from "./Game";
import { Phase } from "../config/constants";
import { Logger } from "../utils/Logger";
import { attachGameEventListeners } from "../socket/gameEventListeners";
import { ClientToServerEvents, ServerToClientEvents } from "../types/socket.types";

export class Manager {
  public games: Game[];
  public logger: Logger;
  private io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

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

  public restartGame(game: Game): void {
    game.restart();
  }

  public deleteGame(game: Game): void {
    this.games = this.games.filter((g) => g !== game);
  }

  public log(...args: any[]): void {
    args.forEach((arg) => this.logger.log(arg.toString()));
  }

  private deleteGameByCode(code: string): void {
    this.games = this.games.filter((g) => g.code !== code);
  }

  private deleteFinishedGames(): void {
    let finished = this.games.filter((g) => g.phase === Phase.EndGame);
    finished.forEach((game) => this.deleteGame(game));
  }
}
