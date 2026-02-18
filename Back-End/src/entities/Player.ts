import { Role } from "./roles";

import { Game } from "./Game";
import { Phase } from "../config/constants";

export class Player {
  name: string;
  id: string;
  private role: Role;
  private originalRole: Role;

  constructor(name: string) {
    this.name = name;
    this.id = Math.random().toString(36).substring(2, 8);
  }
  // public setName(name: string): void {
  //     this.name = name;
  // }
  getOriginalRole(): Role {
    return this.originalRole;
  }
  AddRole(role: Role): void {
    this.originalRole = role;
    this.role = role;
  }
  getRole(): Role {
    return this.role;
  }
  setRole(role: Role): void {
    this.role = role;
  }
  toString(): string {
    return this.name;
  }
  reset() {
    this.role = null;
    this.originalRole = null;
  }

  performOriginalAction(game: Game, action?: any) {
    if (game.phase !== Phase.Role && game.phase !== Phase.Night) {
      throw new Error("Cannot perform action in this phase");
    }
    return this.originalRole.performAction()(game, this, action);
  }
}
