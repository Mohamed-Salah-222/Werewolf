// Each role is a class implementing the Role interface
import { Role } from "./Role";
import { Team } from "../Team";

export class Seer implements Role {
  id: number;
  name: "Seer";
  team: Team.Heroes;
  description: string;
  performAction(): () => any {
    return () => {
      console.log("Seer");
    };
  }
}
