// Each role is a class implementing the Role interface
import { Role } from "./Role";
import { Team } from "../Team";

export class Werewolf implements Role {
  id: number;
  name: "Werewolf";
  team: Team.Villains;
  description: string;
  performAction(): () => any {
    return () => {
      console.log("Insomniac");
    };
  }
}
