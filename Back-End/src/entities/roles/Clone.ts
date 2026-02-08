// Each role is a class implementing the Role interface
import { Role } from "./Role";
import { Team } from "../Team";
export class Clone implements Role {
  id: number;
  name: "Clone";
  team: Team;
  description: string;
  performAction(): () => any {
    return () => {
      console.log("Clone");
    };
  }
}

