import { Role } from "./roles";

import { Game } from './Game';
import { Phase } from "../config/constants";

export class Player {
  private role: Role;
  private originalRole: Role;
  public name: string;
  public id: string;
  public constructor(name: string) {
    this.name = name;
    this.id = Math.random().toString(36).substring(2, 5);
  }
  // public setName(name: string): void {
  //     this.name = name;
  // }
  public getOriginalRole(): Role {
    return this.originalRole;
  }
  public AddRole(role: Role): void {
    this.originalRole = role;
    this.role = role;
  }
  public getRole(): Role {
    return this.role;
  }
  public setRole(role: Role): void {
    this.role = role;
  }
  // wtv
  public performAction(game: Game) {
    if (game.phase !== Phase.Role) {
      throw new Error('Game is not in perfom actions phase');
    }
    return this.role.performAction()(game, this);
  }
  public toString(): string {
    return this.name;
  }
  public vote(game: Game, vote: string) {
    return game.votes.push({ voter: this.id, vote: vote });
  }
}
