import { Role } from "./Role";
import { Team } from "../../config/constants";
import { Game } from "../Game";
import { Player } from "../Player";

export interface TroublemakerAction {
  type: "troublemaker";
  player1: Player;
  player2: Player;
}

export const createTroublemakerAction = (player1: Player, player2: Player): TroublemakerAction => ({
  type: "troublemaker",
  player1,
  player2,
});

export class Troublemaker implements Role {
  public id: string;
  public name: string = "Troublemaker";
  public team: Team = Team.Villagers;
  public description: string = "Swaps two other players' roles without looking at them";

  constructor() {
    this.id = Math.random().toString(36).substring(2, 10);
  }

  public performAction(): Function {
    return function (game: Game, player: Player, action: TroublemakerAction) {
      if (action.type !== "troublemaker") {
        throw new Error(`Invalid action for Troublemaker. Expected 'troublemaker', received '${action.type}'.`);
      }

      if (!action.player1 || !action.player2) {
        throw new Error("Troublemaker action requires two target players");
      }

      const targetPlayer1 = game.players.find((p) => p.id === action.player1.id);
      const targetPlayer2 = game.players.find((p) => p.id === action.player2.id);

      if (!targetPlayer1 || !targetPlayer2) {
        throw new Error("Target players not found");
      }

      if (targetPlayer1.id === player.id || targetPlayer2.id === player.id) {
        throw new Error("Troublemaker cannot include themselves in the swap");
      }

      if (targetPlayer1.id === targetPlayer2.id) {
        throw new Error("Cannot swap the same player with themselves");
      }

      const temp = targetPlayer1.getRole();
      targetPlayer1.setRole(targetPlayer2.getRole());
      targetPlayer2.setRole(temp);

      return {
        player1Name: targetPlayer1.name,
        player2Name: targetPlayer2.name,
        message: `You swapped ${targetPlayer1.name} and ${targetPlayer2.name}'s roles`,
      };
    };
  }
}
