import { Role } from "./Role";
import { Team } from "../../config/constants";
import { Game } from "../Game";
import { Player } from "../Player";

export interface WerewolfAction {
  type: "werewolf";
}

export const createWerewolfAction = (): WerewolfAction => ({
  type: "werewolf",
});

export class Werewolf implements Role {
  public id: string;
  public name: string = "Werewolf";
  public team: Team = Team.WereWolf;
  public description: string = "Sees other Werewolves. If alone, sees one ground card";

  constructor() {
    this.id = Math.random().toString(36).substring(2, 10);
  }

  public performAction(): Function {
    return function (game: Game, player: Player, action: WerewolfAction) {
      if (action.type !== "werewolf") {
        throw new Error(`Invalid action for Werewolf. Expected 'werewolf', received '${action.type}'.`);
      }

      const otherWerewolves = game.players.filter((p) => p.getRole().name.toLowerCase() === "werewolf" && p.id !== player.id);

      if (otherWerewolves.length > 0) {
        return {
          isAlone: false,
          werewolves: otherWerewolves.map((w) => ({ id: w.id, name: w.name })),
          message: `The other Werewolves are: ${otherWerewolves.map((w) => w.name).join(", ")}`,
        };
      } else {
        const groundCard = game.groundRoles[0];

        return {
          isAlone: true,
          groundCard: groundCard.name,
          message: `You are alone. You saw a ${groundCard.name} on the ground`,
        };
      }
    };
  }
}
