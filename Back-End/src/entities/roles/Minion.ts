import { Role } from "./Role";
import { Team } from "../../config/constants";
import { Game } from "../Game";
import { Player } from "../Player";

<<<<<<< Updated upstream
export class Minion implements Role {
  id: number;
  name: "Minion";
  team: Team.Villains;
  description: string;
  performAction(): () => any {
    return () => {
      console.log("Insomniac");
=======
export interface MinionAction {
  type: "minion";
}

export const createMinionAction = (): MinionAction => ({
  type: "minion",
});

export class Minion implements Role {
  public id: string;
  public name: string = "Minion";
  public team: Team = Team.WereWolf;
  public description: string = "Sees who the Werewolves are. Wins if voted out and Werewolves win";

  constructor() {
    this.id = Math.random().toString(36).substring(2, 10);
  }

  public performAction(): Function {
    return function (game: Game, player: Player, action: MinionAction) {
      if (action.type !== "minion") {
        throw new Error(`Invalid action for Minion. Expected 'minion', received '${action.type}'.`);
      }

      const werewolves = game.players.filter((p) => p.getRole().name.toLowerCase() === "werewolf");

      return {
        werewolves: werewolves.map((w) => ({ id: w.id, name: w.name })),
        message: werewolves.length > 0 ? `The Werewolves are: ${werewolves.map((w) => w.name).join(", ")}` : "There are no Werewolves in play",
      };
>>>>>>> Stashed changes
    };
  }
}
