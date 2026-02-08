// Each role is a class implementing the Role interface
import { Role } from "./Role";
import { Team } from "../../config/constants";

export class Robber implements Role {
  id: number;
  name: "Robber";
  team: Team.Heroes;
  description: string;
  performAction(): () => any {
    return () => {
      console.log("Robber");
    };
  }
}
