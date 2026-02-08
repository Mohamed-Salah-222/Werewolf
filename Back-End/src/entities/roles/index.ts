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
export { Clone } from "./Clone";
export { Drunk } from "./Drunk";
export { Insomniac } from "./Insomniac";
export { Joker } from "./Joker";
export { Mason } from "./Mason";
export { Minion } from "./Minion";
export { Robber } from "./Robber";
export { Seer } from "./Seer";
export { Troublemaker } from "./Troublemaker";
export { Werewolf } from "./Werewolf";


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
