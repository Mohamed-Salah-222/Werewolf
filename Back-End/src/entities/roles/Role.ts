// Base interface/type that all roles implement
// Properties: id, name, team (Villains/Heroes/Joker), description
// Methods: performAction() → returns a function that executes the role's ability

import { Team } from "../Team";

// Used by: All role classes implement this interface
export interface Role {
  id: number; // do I need id ?
  name: string;
  team: Team;
  description: string;
  performAction(): () => any;
}

