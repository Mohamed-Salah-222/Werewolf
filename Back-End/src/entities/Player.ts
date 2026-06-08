import { Role } from "./roles";
import { Phase } from "@werewolf/shared";
import { Game } from "./game";
import { randomUUID } from "crypto";

export class Player {
  name: string;
  id: string;
  lastActionResult: Record<string, unknown> | null = null;
  private role: Role;
  private originalRole: Role;

  constructor(name: string) {
    this.name = name;
    this.id = randomUUID();
  }
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
