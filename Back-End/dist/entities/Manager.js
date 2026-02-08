"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Manager = void 0;
// Manages multiple game instances
// Holds array of Game objects
const Game_1 = require("./Game");
const constants_1 = require("../config/constants");
const Logger_1 = require("../utils/Logger");
class Manager {
    constructor() {
        this.games = [];
        this.logger = Logger_1.Logger.getInstance();
    }
    createGame() {
        let game = new Game_1.Game(this.logger);
        this.games.push(game);
        return game;
    }
    canJoinGame(code) {
        let game = this.games.find((game) => game.code === code);
        if (game === undefined) {
            return false;
        }
        return game.phase === constants_1.Phase.Waiting;
    }
    joinGame(code, name) {
        if (!name || name.length === 0 || typeof name !== 'string') {
            console.error('Invalid name: ', name);
            return null;
        }
        let game = this.games.find((game) => game.code === code);
        if (game) {
            if (game.phase !== constants_1.Phase.Waiting) {
                console.error('this game has already started');
                return null;
            }
            game.playerJoin(name);
            return game;
        }
        else {
            return null;
        }
    }
    getGameByCode(code) {
        let game = this.games.find((game) => game.code === code);
        if (game) {
            return game;
        }
        else {
            return null;
        }
    }
    deleteGame(game) {
        this.games = this.games.filter((g) => g !== game);
    }
    log(...args) {
        args.forEach((arg) => this.logger.log(arg.toString()));
    }
    deleteGameByCode(code) {
        this.games = this.games.filter((g) => g.code !== code);
    }
    deleteFinishedGames() {
        let finished = this.games.filter((g) => g.phase === constants_1.Phase.EndGame);
        finished.forEach((game) => this.deleteGame(game));
    }
}
exports.Manager = Manager;
