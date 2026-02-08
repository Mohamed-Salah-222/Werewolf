// Each role is a class implementing the Role interface
import { Role } from "./Role";
import { Team } from "../../config/constants";

export class Mason implements Role {
  id: number;
  name: "Mason";
  team: Team;
  description: string;
  performAction(): () => any {
    return () => {
      console.log("Insomniac");
    };
  }
}
