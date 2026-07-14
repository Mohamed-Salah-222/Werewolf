import { Role } from "./Role";
import { Team } from "@werewolf/shared";
import { Game } from "../game";
import { Player } from "../Player";

export interface DrunkAction {
  type: "drunk";
  targetRoleId?: string;
}

export const createDrunkAction = (targetRoleId: string): DrunkAction => ({
  type: "drunk",
  targetRoleId,
});

export class Drunk implements Role {
  public id: string;
  public name: string = "Drunk";
  public team: Team = Team.Village;
  public description: string = "Swaps their role with a random ground card without looking at it";

  constructor() {
    this.id = Math.random().toString(36).substring(2, 10);
  }

  public performAction(): Function {
    return function (game: Game, player: Player, action: DrunkAction) {
      if (action.type !== "drunk") {
        throw new Error(`Invalid action for Drunk. Expected 'drunk', received '${action.type}'.`);
      }

      if (game.groundRoles.length === 0) {
        throw new Error("No ground roles available");
      }

      const groundRoleIndex = action.targetRoleId
        ? game.groundRoles.findIndex((r) => r.id === action.targetRoleId)
        : Math.floor(Math.random() * game.groundRoles.length);

      if (groundRoleIndex === -1) {
        throw new Error("Ground role not found");
      }

      const groundRole = game.groundRoles[groundRoleIndex];
      const temp = player.getRole();

      player.setRole(groundRole);
      game.groundRoles[groundRoleIndex] = temp; // BUG FIX: Actually update the ground roles array

      return {
        success: true,
        targetRoleId: groundRole.id,
        targetGroundIndex: groundRoleIndex,
        message: "You swapped your role with a ground card",
        // Drunk doesn't know what they became
      };
    };
  }
}
