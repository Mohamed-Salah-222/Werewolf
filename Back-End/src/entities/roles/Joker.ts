// Each role is a class implementing the Role interface
import { Role } from "./Role";
import { Team } from "../../config/constants";

export class Joker implements Role {
  id: number;
  name: "Joker";
  team: Team;
  description: string;
  performAction(): () => any {
    return () => {
      console.log("Insomniac");
    };
  }
}
