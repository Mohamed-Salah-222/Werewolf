import { Role } from "./Role";
import { ROLE_REGISTRY, Team } from "@werewolf/shared";
import { Game } from "../game";
import { Player } from "../Player";
import { roleIdOf } from "./roleId";

export interface WerewolfAction {
  type: "werewolf";
}

export const createWerewolfAction = (): WerewolfAction => ({
  type: "werewolf",
});

export class Werewolf implements Role {
  public id: string;
  public name: string = ROLE_REGISTRY.werewolf.name;
  public team: Team = Team.Villain;
  public description: string = ROLE_REGISTRY.werewolf.description;

  constructor() {
    this.id = Math.random().toString(36).substring(2, 10);
  }

  public performAction(): Function {
    return function (game: Game, player: Player, action: WerewolfAction) {
      if (action.type !== "werewolf") {
        throw new Error(`Invalid action for Werewolf. Expected 'werewolf', received '${action.type}'.`);
      }

      const otherWerewolves = game.players.filter((p) => roleIdOf(p.getRole().name) === "werewolf" && p.id !== player.id);

      if (otherWerewolves.length > 0) {
        return {
          isAlone: false,
          werewolves: otherWerewolves.map((w) => ({ id: w.id, name: w.name })),
          message: `باقي الشلة: ${otherWerewolves.map((w) => w.name).join("، ")}`,
        };
      } else {
        if (game.groundRoles.length === 0) {
          throw new Error("No ground cards available");
        }

        const groundCard = game.groundRoles[Math.floor(Math.random() * game.groundRoles.length)];

        return {
          isAlone: true,
          groundCard: groundCard.name,
          message: `انت لوحدك… شفت ${groundCard.name} على الأرض`,
        };
      }
    };
  }
}
