import { Role } from "./Role";
import { ROLE_REGISTRY, Team } from "@werewolf/shared";
import { Game } from "../game";
import { Player } from "../Player";

export interface JokerAction {
  type: "joker";
  targetRoleId?: string;
}

export const createJokerAction = (targetRoleId: string): JokerAction => ({
  type: "joker",
  targetRoleId,
});

export class Joker implements Role {
  public id: string;
  public name: string = ROLE_REGISTRY.joker.name;
  public team: Team = Team.Neutral;
  public description: string = ROLE_REGISTRY.joker.description;

  constructor() {
    this.id = Math.random().toString(36).substring(2, 10);
  }

  public performAction(): Function {
    return function (game: Game, player: Player, action: JokerAction) {
      if (action.type !== "joker") {
        throw new Error(`Invalid action for Joker. Expected 'joker', received '${action.type}'.`);
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

      return {
        targetRoleId: groundRole.id,
        targetGroundIndex: groundRoleIndex,
        groundRole: groundRole.name,
        message: `شفت ${groundRole.name} على الأرض`,
      };
    };
  }
}
