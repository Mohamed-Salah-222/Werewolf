import { Role } from "./Role";
import { Team } from "../../config/constants";
import { Game } from "../Game";
import { Player } from "../Player";

export interface RobberAction {
  type: "robber";
  targetPlayer: Player;
}

export const createRobberAction = (targetPlayer: Player): RobberAction => ({
  type: "robber",
  targetPlayer,
});

export class Robber implements Role {
  public id: string;
  public name: string = "Robber";
  public team: Team = Team.Villagers;
  public description: string = "Steals another player's role and looks at their new role";

  constructor() {
    this.id = Math.random().toString(36).substring(2, 10);
  }

  public performAction(): Function {
    return function (game: Game, player: Player, action: RobberAction) {
      if (action.type !== "robber") {
        throw new Error(`Invalid action for Robber. Expected 'robber', received '${action.type}'.`);
      }

      if (!action.targetPlayer) {
        throw new Error("Robber action requires a target player");
      }

      const targetPlayer = game.players.find((p) => p.id === action.targetPlayer.id);

      if (!targetPlayer) {
        throw new Error("Target player not found");
      }

      if (targetPlayer.id === player.id) {
        throw new Error("Robber cannot target themselves");
      }

      const temp = player.getRole();
      const stolenRole = targetPlayer.getRole();

      player.setRole(stolenRole);
      targetPlayer.setRole(temp);

      return {
        newRole: stolenRole.name,
        newTeam: stolenRole.team,
        message: `You stole the ${stolenRole.name} role`,
      };
    };
  }
}
