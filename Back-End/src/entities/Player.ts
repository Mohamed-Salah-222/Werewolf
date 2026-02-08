import { Role } from "./roles";

// Represents a single player
export class Player {
  role: Role;
  constructor(public name: string) {
  }
  AddRole(role: Role): void {
    this.role = role;
  }
}

