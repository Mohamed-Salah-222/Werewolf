import { Role } from "./Role";
import { Team } from "../../config/constants";
import { Game } from "../Game";
import { Player } from "../Player";

export interface DrunkAction {
  type: "drunk";
  targetRoleId: string;
}

export const createDrunkAction = (targetRoleId: string): DrunkAction => ({
  type: "drunk",
  targetRoleId,
});

export class Drunk implements Role {
  public id: string;
  public name: string = "Drunk";
  public team: Team = Team.Villagers;
  public description: string = "Swaps their role with a random ground card without looking at it";

  constructor() {
    this.id = Math.random().toString(36).substring(2, 10);
  }

  public performAction(): Function {
    return function (game: Game, player: Player, action: DrunkAction) {
      if (action.type !== "drunk") {
        throw new Error(`Invalid action for Drunk. Expected 'drunk', received '${action.type}'.`);
      }

      const groundRoleIndex = game.groundRoles.findIndex((r) => r.id === action.targetRoleId);

      if (groundRoleIndex === -1) {
        throw new Error("Ground role not found");
      }

      const groundRole = game.groundRoles[groundRoleIndex];
      const temp = player.getRole();

      player.setRole(groundRole);
      game.groundRoles[groundRoleIndex] = temp; // BUG FIX: Actually update the ground roles array

      return {
        success: true,
        message: "You swapped your role with a ground card",
        // Drunk doesn't know what they became
      };
    };
  }
}
