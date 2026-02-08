// Each role is a class implementing the Role interface
import { Role } from "./Role";
import { Team } from "../../config/constants";

export class Minion implements Role {
  id: number;
  name: "Minion";
  team: Team.Villains;
  description: string;
  performAction(): () => any {
    return () => {
      console.log("Insomniac");
    };
  }
}
