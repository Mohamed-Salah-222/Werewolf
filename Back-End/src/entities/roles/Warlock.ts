import { Role } from "./Role";
import { Team } from "@werewolf/shared";
import { Game } from "../game";
import { Player } from "../Player";

export interface WarlockAction {
  type: "warlock";
  targetPlayer: { id: string };
}

export const createWarlockAction = (targetPlayer: { id: string }): WarlockAction => ({
  type: "warlock",
  targetPlayer,
});

export class Warlock implements Role {
  public id: string;
  public name: string = "Warlock";
  public team: Team = Team.Village;
  public description: string = "Swaps a player's role with a random ground card without looking";

  constructor() {
    this.id = Math.random().toString(36).substring(2, 10);
  }

  public performAction(): Function {
    return function (game: Game, player: Player, action: WarlockAction) {
      if (action.type !== "warlock") {
        throw new Error(`Invalid action for Warlock. Expected 'warlock', received '${action.type}'.`);
      }

      if (!action.targetPlayer || !action.targetPlayer.id) {
        throw new Error("Warlock action requires a target player");
      }

      const targetPlayer = game.players.find((p) => p.id === action.targetPlayer.id);

      if (!targetPlayer) {
        throw new Error("Target player not found");
      }

      if (targetPlayer.id === player.id) {
        throw new Error("Warlock cannot target themselves");
      }

      if (game.groundRoles.length === 0) {
        throw new Error("No ground cards available");
      }

      // Pick a random ground card
      const groundIndex = Math.floor(Math.random() * game.groundRoles.length);
      const groundRole = game.groundRoles[groundIndex];

      // Swap: target's role goes to ground, ground role goes to target
      const targetCurrentRole = targetPlayer.getRole();
      targetPlayer.setRole(groundRole);
      game.groundRoles[groundIndex] = targetCurrentRole;

      return {
        targetPlayerId: targetPlayer.id,
        targetName: targetPlayer.name,
        targetRoleId: groundRole.id,
        targetGroundIndex: groundIndex,
        message: `You swapped ${targetPlayer.name}'s role with a random ground card`,
      };
    };
  }
}
