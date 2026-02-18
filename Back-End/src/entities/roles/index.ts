// Exports all roles in one place
// Example: export { Werewolf, Seer, Robber, ... }
// Also exports RoleClasses object for dynamic role creation
// Used by: Game.ts (when assigning roles), actionFactory.ts

import { Drunk } from "./Drunk";
import { Insomniac } from "./Insomniac";
import { Mason } from "./Mason";
import { Minion } from "./Minion";
import { Robber } from "./Robber";
import { Seer } from "./Seer";
import { Clone } from "./Clone";
import { Troublemaker } from "./Troublemaker";
import { Werewolf } from "./Werewolf";
import { Joker } from "./Joker";


export { Role } from "./Role";
export { Clone, createCloneAction } from "./Clone";
export { Drunk, createDrunkAction } from "./Drunk";
export { Insomniac, createInsomniacAction } from "./Insomniac";
export { Joker, createJokerAction } from "./Joker";
export { Mason } from "./Mason";
export { Minion, createMinionAction } from "./Minion";
export { Robber, createRobberAction } from "./Robber";
export { Seer, SeerActionType, createSeerAction } from "./Seer";
export { Troublemaker, createTroublemakerAction } from "./Troublemaker";
export { Werewolf, createWerewolfAction } from "./Werewolf";


export const RoleClasses = {
  werewolf: Werewolf,
  mason: Mason,
  seer: Seer,
  robber: Robber,
  troublemaker: Troublemaker,
  drunk: Drunk,
  minion: Minion,
  clone: Clone,
  insomniac: Insomniac,
  joker: Joker,
};
