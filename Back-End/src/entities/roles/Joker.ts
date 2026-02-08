import { Role } from "./Role";
import { Team } from "../../config/constants";
import { Game } from "../Game";
import { Player } from "../Player";

export interface JokerAction {
  type: "joker";
  targetRoleId: string;
}

export const createJokerAction = (targetRoleId: string): JokerAction => ({
  type: "joker",
  targetRoleId,
});

export class Joker implements Role {
  public id: string;
  public name: string = "Joker";
  public team: Team = Team.Joker;
  public description: string = "Looks at one ground card. Wins alone if voted out";

  constructor() {
    this.id = Math.random().toString(36).substring(2, 10);
  }

  public performAction(): Function {
    return function (game: Game, player: Player, action: JokerAction) {
      if (action.type !== "joker") {
        throw new Error(`Invalid action for Joker. Expected 'joker', received '${action.type}'.`);
      }

      const groundRole = game.groundRoles.find((r) => r.id === action.targetRoleId);

      if (!groundRole) {
        throw new Error("Ground role not found");
      }

      return {
        groundRole: groundRole.name,
        message: `You saw a ${groundRole.name} on the ground`,
      };
    };
  }
}
