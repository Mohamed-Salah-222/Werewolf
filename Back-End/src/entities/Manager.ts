// Manages multiple game instances
// Holds array of Game objects
import { Game } from './Game';
import { Phase } from '../config/constants';
import { Logger } from '../utils/Logger';
export class Manager {
  public games: Game[];
  public logger: Logger;
  public constructor() {
    this.games = [];
    this.logger = Logger.getInstance();
  }
  public createGame(): Game {
    let game = new Game(this.logger);
    this.games.push(game);
    return game;
  }
  public canJoinGame(code: string): boolean {
    let game = this.games.find((game) => game.code === code);
    if (game === undefined) {
      return false;
    }
    return game.phase === Phase.Waiting;
  }
  public joinGame(code: string, name: string): Game | null {
    if (!name || name.length === 0 || typeof name !== 'string') {
      console.error('Invalid name: ', name);
      return null;
    }
    let game = this.games.find((game) => game.code === code);
    if (game) {
      if (game.phase !== Phase.Waiting) {
        console.error('this game has already started');
        return null;
      }
      game.playerJoin(name);
      return game;
    } else {
      return null;
    }
  }
  public getGameByCode(code: string): Game | null {
    let game = this.games.find((game) => game.code === code);
    if (game) {
      return game;
    } else {
      return null;
    }
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

