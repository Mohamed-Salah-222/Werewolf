import { Team } from "../../config/constants";

export interface Role {
  id: string; // Keep string - used for matching ground cards in Drunk/Joker actions
  name: string;
  team: Team;
  description: string;
<<<<<<< Updated upstream
  performAction(): performActionReturn;
}


=======
  performAction(): Function; // Returns a function that takes (game, player, action)
}
>>>>>>> Stashed changes
