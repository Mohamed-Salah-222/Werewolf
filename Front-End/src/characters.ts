// Import character images
import werewolfSquare from "./assets/werewolf_square.webp";
import werewolf2d from "./assets/werewolf_2d.webp";
import minionSquare from "./assets/minion_square.webp";
import minion2d from "./assets/minion_2d.webp";
import seerSquare from "./assets/seer_square.webp";
import seer2d from "./assets/seer_2d.webp";
import robberSquare from "./assets/robber_square.webp";
import robber2d from "./assets/robber_2d.webp";
import troublemakerSquare from "./assets/troublemaker_square.webp";
import troublemaker2d from "./assets/troublemaker_2d.webp";
import masonSquare from "./assets/mason_square.webp";
import mason2d from "./assets/mason_2d.webp";
import drunkSquare from "./assets/drunk_square.webp";
import drunk2d from "./assets/drunk_2d.webp";
import insomniacSquare from "./assets/insomaniac_square.webp";
import insomniac2d from "./assets/insomaniac_2d.webp";
import cloneSquare from "./assets/clone_square.webp";
import clone2d from "./assets/clone_2d.webp";
import jokerSquare from "./assets/joker_square.webp";
import joker2d from "./assets/joker_2d.webp";

export interface CharacterData {
  id: string;
  name: string;
  team: "villain" | "village" | "neutral";
  title: string;
  description: string;
  ability: string;
  square: string | null;
  fullBody: string | null;
}

export const characters: CharacterData[] = [
  {
    id: "werewolf",
    name: "Werewolf",
    team: "villain",
    title: "The Beast Among Us",
    description: "A creature of the night hiding in plain sight. When darkness falls, the beast awakens and hunts with its pack.",
    ability: "At night, Werewolves open eyes, see each other, if alone, you may peek one center card once.",
    square: werewolfSquare,
    fullBody: werewolf2d,
  },
  {
    id: "minion",
    name: "Minion",
    team: "villain",
    title: "The Shadow Servant",
    description: "A devoted servant sworn to the wolves. He knows their faces in the dark, yet remains unseen.",
    ability: "You know the Werewolves, but they don't know you, if you die, their team just wins instantly.",
    square: minionSquare,
    fullBody: minion2d,
  },
  {
    id: "seer",
    name: "Seer",
    team: "village",
    title: "The All-Seeing Eye",
    description: "Gifted with visions beyond mortal sight. The Seer peers into hidden souls, seeking truth in whispers and shadows.",
    ability: "You have two options either view one player's role or instead view two center cards.",
    square: seerSquare,
    fullBody: seer2d,
  },
  {
    id: "robber",
    name: "Robber",
    team: "village",
    title: "The Night Thief",
    description: "A sly thief who steals more than gold. In the silence of night, he trades identities and wakes unsure of the face he now wears.",
    ability: "Steal a role from another player then look at it, you become that role for the rest of play.",
    square: robberSquare,
    fullBody: robber2d,
  },
  {
    id: "troublemaker",
    name: "Troublemaker",
    team: "village",
    title: "The Chaos Weaver",
    description: "She thrives in confusion and delight. With careless hands she twists fate, swapping destinies while laughter echoes in the dark.",
    ability: "Swap two other players' roles at night without looking, their roles change, they won't know.",
    square: troublemakerSquare,
    fullBody: troublemaker2d,
  },
  {
    id: "mason",
    name: "Mason",
    team: "village",
    title: "The Sworn Brother",
    description: "Bound by oath and silent trust, Masons recognize their own. In a village filled with lies, their shared loyalty never breaks.",
    ability: "Wake with the other Mason and recognize each other the mason bond can never break",
    square: masonSquare,
    fullBody: mason2d,
  },
  {
    id: "drunk",
    name: "Drunk",
    team: "village",
    title: "The Lost Soul",
    description: "Lost in haze and heavy drink, the Drunk stumbles through fate. By morning, the role once held may be gone without notice.",
    ability: "At night, swap your role with a random ground card and do not look",
    square: drunkSquare,
    fullBody: drunk2d,
  },
  {
    id: "insomniac",
    name: "Insomniac",
    team: "village",
    title: "The Sleepless Watcher",
    description: "Sleep never comes to this soul. While others scheme in darkness, the Insomniac waits to see what remains by dawn.",
    ability: "Wake last and check your current role card to see whether it changed during the night.",
    square: insomniacSquare,
    fullBody: insomniac2d,
  },
  {
    id: "clone",
    name: "Clone",
    team: "village",
    title: "The Mimic",
    description: "A blank reflection seeking identity. The Clone mirrors another's fate, becoming what it sees and living that borrowed truth.",
    ability: "At night, choose a player and copy their role, you become that role and do its night action.",
    square: cloneSquare,
    fullBody: clone2d,
  },
  {
    id: "joker",
    name: "Joker",
    team: "neutral",
    title: "The Wild Card",
    description: "Madness wrapped in a grin. The Joker thrives on chaos, claiming victory only through chosen defeat.",
    ability: "You win if the village votes to eliminate you, act suspicious, but never admit your goal",
    square: jokerSquare,
    fullBody: joker2d,
  },
];

// ===== CARD STYLE DATA FOR GAMECARD COMPONENT =====

export interface CardStyleData {
  frameColor: string;
  panelColor: string;
  borderColor: string;
}

export const cardStyleMap: Record<string, CardStyleData> = {
  werewolf: { frameColor: "#4a0e0e", panelColor: "#470d0d", borderColor: "#252525" },
  minion: { frameColor: "#4a0e0e", panelColor: "#470d0d", borderColor: "#252525" },
  seer: { frameColor: "#2a2a2a", panelColor: "#1e1e1e", borderColor: "#3a3a3a" },
  robber: { frameColor: "#2a2a2a", panelColor: "#1e1e1e", borderColor: "#3a3a3a" },
  troublemaker: { frameColor: "#2a2a2a", panelColor: "#1e1e1e", borderColor: "#3a3a3a" },
  mason: { frameColor: "#2a2a2a", panelColor: "#1e1e1e", borderColor: "#3a3a3a" },
  drunk: { frameColor: "#2a2a2a", panelColor: "#1e1e1e", borderColor: "#3a3a3a" },
  insomniac: { frameColor: "#2a2a2a", panelColor: "#1e1e1e", borderColor: "#3a3a3a" },
  clone: { frameColor: "#2a2a2a", panelColor: "#1e1e1e", borderColor: "#3a3a3a" },
  joker: { frameColor: "#0e2a1a", panelColor: "#0a2015", borderColor: "#1a3a2a" },
};

/** Get full GameCard props for a role by name */
export function getGameCardData(roleName: string) {
  const key = roleName.toLowerCase();
  const char = characters.find((c) => c.id === key);
  const style = cardStyleMap[key] || cardStyleMap["werewolf"];

  return {
    name: char?.name || roleName,
    ability: char?.ability || "",
    frameColor: style.frameColor,
    panelColor: style.panelColor,
    borderColor: style.borderColor,
  };
}

// ===== CARD IMAGES =====

import backCard from "./assets/back_card.webp";
import werewolfCard from "./assets/werewolf_card.webp";
import minionCard from "./assets/minion_card.webp";
import seerCard from "./assets/Seer_card.webp";
import robberCard from "./assets/robber_card.webp";
import troublemakerCard from "./assets/troublemaker_card.webp";
import masonCard from "./assets/mason_card.webp";
import drunkCard from "./assets/drunk_card.webp";
import insomniacCard from "./assets/insomaniac_card.webp";
import cloneCard from "./assets/clone_card.webp";
import jokerCard from "./assets/joker_card.webp";

import werewolfCardSmall from "./assets/werewolf_card_small.webp";
import minionCardSmall from "./assets/minion_card_small.webp";
import seerCardSmall from "./assets/seer_card_small.webp";
import robberCardSmall from "./assets/robber_card_small.webp";
import troublemakerCardSmall from "./assets/troublemaker_card_small.webp";
import masonCardSmall from "./assets/mason_card_small.webp";
import drunkCardSmall from "./assets/drunk_card_small.webp";
import insomniacCardSmall from "./assets/insomaniac_card_small.webp";
import cloneCardSmall from "./assets/clone_card_small.webp";
import jokerCardSmall from "./assets/joker_card_small.webp";

export interface CardData {
  id: string;
  name: string;
  image: string;
  small: string;
}

export const backCardImage = backCard;

export const allCards: CardData[] = [
  { id: "werewolf", name: "Werewolf", image: werewolfCard, small: werewolfCardSmall },
  { id: "minion", name: "Minion", image: minionCard, small: minionCardSmall },
  { id: "seer", name: "Seer", image: seerCard, small: seerCardSmall },
  { id: "robber", name: "Robber", image: robberCard, small: robberCardSmall },
  { id: "troublemaker", name: "Troublemaker", image: troublemakerCard, small: troublemakerCardSmall },
  { id: "mason", name: "Mason", image: masonCard, small: masonCardSmall },
  { id: "drunk", name: "Drunk", image: drunkCard, small: drunkCardSmall },
  { id: "insomniac", name: "Insomniac", image: insomniacCard, small: insomniacCardSmall },
  { id: "clone", name: "Clone", image: cloneCard, small: cloneCardSmall },
  { id: "joker", name: "Joker", image: jokerCard, small: jokerCardSmall },
];

// ===== PRELOADING =====

characters.forEach((char) => {
  if (char.fullBody) {
    const img = new Image();
    img.src = char.fullBody;
  }
  if (char.square) {
    const img = new Image();
    img.src = char.square;
  }
});
