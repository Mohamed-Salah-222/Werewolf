"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
const constants_1 = require("../config/constants");
class Player {
    constructor(name) {
        this.name = name;
        this.id = Math.random().toString(36).substring(2, 5);
    }
    // public setName(name: string): void {
    //     this.name = name;
    // }
    getOriginalRole() {
        return this.originalRole;
    }
    AddRole(role) {
        this.originalRole = role;
        this.role = role;
    }
    getRole() {
        return this.role;
    }
    setRole(role) {
        this.role = role;
    }
    // wtv
    performAction(game) {
        if (game.phase !== constants_1.Phase.Role) {
            throw new Error('Game is not in perfom actions phase');
        }
        return this.role.performAction()(game, this);
    }
    toString() {
        return this.name;
    }
    vote(game, vote) {
        return game.votes.push({ voter: this.id, vote: vote });
    }
}
exports.Player = Player;
