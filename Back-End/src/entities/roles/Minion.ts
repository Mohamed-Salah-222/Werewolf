import { Role } from "./Role";
import { ROLE_REGISTRY, Team } from "@werewolf/shared";
import { Game } from "../game";
import { Player } from "../Player";
import { roleIdOf } from "./roleId";

export interface MinionAction {
  type: "minion";
}

export const createMinionAction = (): MinionAction => ({
  type: "minion",
});

export class Minion implements Role {
  public id: string;
  public name: string = ROLE_REGISTRY.minion.name;
  public team: Team = Team.Villain;
  public description: string = ROLE_REGISTRY.minion.description;

  constructor() {
    this.id = Math.random().toString(36).substring(2, 10);
  }

  public performAction(): Function {
    return function (game: Game, player: Player, action: MinionAction) {
      if (action.type !== "minion") {
        throw new Error(`Invalid action for Minion. Expected 'minion', received '${action.type}'.`);
      }

      const werewolves = game.players.filter((p) => roleIdOf(p.getRole().name) === "werewolf");

      return {
        werewolves: werewolves.map((w) => ({ id: w.id, name: w.name })),
        message: werewolves.length > 0 ? `العفاريت هم: ${werewolves.map((w) => w.name).join("، ")}` : "مفيش عفاريت بين اللاعبين… كلهم على الأرض.",
      };
    };
  }
}
