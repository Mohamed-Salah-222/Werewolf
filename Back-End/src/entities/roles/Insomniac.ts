import { Role } from "./Role";
import { Team } from "@werewolf/shared";
import { Game } from "../game";
import { Player } from "../Player";

export interface InsomniacAction {
  type: "insomniac";
}

export const createInsomniacAction = (): InsomniacAction => ({
  type: "insomniac",
});

export class Insomniac implements Role {
  public id: string;
  public name: string = "الساهر";
  public team: Team = Team.Village;
  public description: string = "يصحى آخر الليل يتأكد دوره اتغير ولا لأ";

  constructor() {
    this.id = Math.random().toString(36).substring(2, 10);
  }

  public performAction(): Function {
    return function (game: Game, player: Player, action: InsomniacAction) {
      if (action.type !== "insomniac") {
        throw new Error(`Invalid action for Insomniac. Expected 'insomniac', received '${action.type}'.`);
      }

      const originalRole = player.getOriginalRole();
      const currentRole = player.getRole();
      const hasChanged = originalRole.name !== currentRole.name;

      return {
        originalRole: originalRole.name,
        currentRole: currentRole.name,
        hasChanged: hasChanged,
        message: hasChanged ? `دورك اتغير من ${originalRole.name} لـ${currentRole.name}` : `دورك لسه ${currentRole.name}`,
      };
    };
  }
}
