// Each role is a class implementing the Role interface
import { Role } from "./Role";
import { Team } from "../../config/constants";

export class Drunk implements Role {
  id: number;
  name: "Drunk";
  team: Team;
  description: string;
  performAction(): () => any {
    return () => {
      console.log("Clone");
    };
  }
}
