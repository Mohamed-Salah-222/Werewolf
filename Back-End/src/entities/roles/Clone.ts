import { Role } from "./Role";
import { Team } from "../../config/constants";
import { Game } from "../Game";
import { Player } from "../Player";

export interface CloneAction {
  type: "clone";
  targetPlayer: Player;
}

export const createCloneAction = (targetPlayer: Player): CloneAction => ({
  type: "clone",
  targetPlayer,
});

export class Clone implements Role {
  public id: string;
  public name: string = "Clone";
  public team: Team = Team.Heroes;
  public description: string = "Copies another player's role and performs their action immediately";

  constructor() {
    this.id = Math.random().toString(36).substring(2, 10);
  }

  public performAction(): Function {
    return function (game: Game, player: Player, action: CloneAction) {
      if (action.type !== "clone") {
        throw new Error(`Invalid action for Clone. Expected 'clone', received '${action.type}'.`);
      }

      if (!action.targetPlayer) {
        throw new Error("Clone action requires a target player");
      }

      const targetPlayer = game.players.find((p) => p.id === action.targetPlayer.id);

      if (!targetPlayer) {
        throw new Error(`Target player not found`);
      }

      if (targetPlayer.id === player.id) {
        throw new Error("Clone cannot target themselves");
      }

      const clonedRole = targetPlayer.getOriginalRole();

      player.setRole(clonedRole);
      (player as any).originalRole = clonedRole;

      const isInsomniac = clonedRole.name.toLowerCase() === "insomniac";

      return {
        clonedRole: clonedRole.name,
        clonedRoleTeam: clonedRole.team,
        isInsomniac: isInsomniac,
      };
    };
  }
}
