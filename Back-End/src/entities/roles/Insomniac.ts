import { Role } from "./Role";
import { Team } from "../../config/constants";
import { Game } from "../Game";
import { Player } from "../Player";

export interface InsomniacAction {
  type: "insomniac";
}

export const createInsomniacAction = (): InsomniacAction => ({
  type: "insomniac",
});

export class Insomniac implements Role {
  public id: string;
  public name: string = "Insomniac";
  public team: Team = Team.Villagers;
  public description: string = "Wakes up at the end of the night to check if their role has changed";

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
        message: hasChanged ? `Your role changed from ${originalRole.name} to ${currentRole.name}` : `Your role is still ${currentRole.name}`,
      };
    };
  }
}
