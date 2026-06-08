import { Team } from "@werewolf/shared";

export interface Role {
  id: string; //* Used for matching with ground cards for roles ( Drunk , Joker , Warlock)
  name: string;
  team: Team;
  description: string;
  performAction(): Function; //* Returns a function that takes ( game , player , action )
}
