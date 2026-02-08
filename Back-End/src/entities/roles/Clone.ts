// Each role is a class implementing the Role interface
import { Role } from "./Role";
import { Team } from "../Team";
import { Game } from "../Game";
import { Player } from "../Player";

export class Clone implements Role {
  id: number;
  name: "Clone";
  team: Team.Heroes;
  description: string;
  constructor() {
    this.id = 0;
  }
  performAction() {
    return function (game: Game, player: Player) {

    };
  }
}


