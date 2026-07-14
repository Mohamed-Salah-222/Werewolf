import { Role } from "./Role";
import { Team } from "@werewolf/shared";
import { Game } from "../game";
import { Player } from "../Player";

export interface MasonAction {
  type: "mason";
}

export const createMasonAction = (): MasonAction => ({
  type: "mason",
});

export class Mason implements Role {
  public id: string;
  public name: string = "Mason";
  public team: Team = Team.Village;
  public description: string = "Wakes up with other Masons to see each other";

  constructor() {
    this.id = Math.random().toString(36).substring(2, 10);
  }

  public performAction(): Function {
    return function (game: Game, player: Player, action: MasonAction) {
      if (action.type !== "mason") {
        throw new Error(`Invalid action for Mason. Expected 'mason', received '${action.type}'.`);
      }

      const otherMasons = game.players.filter((p) => {
        if (p.id === player.id) return false;
        const isOriginalMason = p.getOriginalRole().name.toLowerCase() === "mason";
        const isCloneMason = (p as any)._wasClone === true && (p as any)._clonedRoleName === "mason";
        return isOriginalMason || isCloneMason;
      });

      return {
        masons: otherMasons.map((m) => ({ id: m.id, name: m.name })),
        message: otherMasons.length > 0 ? `You see ${otherMasons.map((m) => m.name).join(", ")} as fellow Mason(s)` : "You are the only Mason",
      };
    };
  }
}
