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
    description: "A creature of the night hiding in plain sight. When darkness falls, the werewolf reveals its true nature and hunts with its pack.",
    ability: "During the night, all Werewolves open their eyes and identify each other. If you are the only Werewolf, you may peek at one ground card.",
    square: werewolfSquare,
    fullBody: werewolf2d,
  },
  {
    id: "minion",
    name: "Minion",
    team: "villain",
    title: "The Shadow Servant",
    description: "A loyal servant who would die for the wolves. Knows who they are, yet remains invisible to them.",
    ability: "You see who the Werewolves are, but they don't know you exist. If you die, the Werewolves win.",
    square: minionSquare,
    fullBody: minion2d,
  },
  {
    id: "seer",
    name: "Seer",
    team: "village",
    title: "The All-Seeing Eye",
    description: "Gifted with visions beyond mortal sight. The Seer peers into the souls of others to uncover the truth.",
    ability: "Look at one player's role, or two of the ground cards.",
    square: seerSquare,
    fullBody: seer2d,
  },
  {
    id: "robber",
    name: "Robber",
    team: "village",
    title: "The Night Thief",
    description: "Takes what isn't his including identities. By morning, even he doesn't know who he truly is.",
    ability: "Steal another player's role and see what you become.",
    square: robberSquare,
    fullBody: robber2d,
  },
  {
    id: "troublemaker",
    name: "Troublemaker",
    team: "village",
    title: "The Chaos Weaver",
    description: "Sows confusion by swapping others' fates. Nobody is safe from her meddling hands.",
    ability: "Swap the roles of two other players without looking.",
    square: troublemakerSquare,
    fullBody: troublemaker2d,
  },
  {
    id: "mason",
    name: "Mason",
    team: "village",
    title: "The Sworn Brother",
    description: "Bound by oath, Masons know their own. Their trust is unbreakable a rare gift in a village of lies.",
    ability: "Wake up and see who the other Mason is.",
    square: masonSquare,
    fullBody: mason2d,
  },
  {
    id: "drunk",
    name: "Drunk",
    team: "village",
    title: "The Lost Soul",
    description: "Too deep in the bottle to remember who they are. Stumbles through the night, swapping fates unknowingly.",
    ability: "Swap your role with a ground card — but you don't get to see it.",
    square: drunkSquare,
    fullBody: drunk2d,
  },
  {
    id: "insomniac",
    name: "Insomniac",
    team: "village",
    title: "The Sleepless Watcher",
    description: "Can never quite fall asleep. While others scheme in darkness, the Insomniac watches and waits.",
    ability: "Wake up last and check if your role has changed.",
    square: insomniacSquare,
    fullBody: insomniac2d,
  },
  {
    id: "clone",
    name: "Clone",
    team: "village",
    title: "The Mimic",
    description: "Becomes whoever it chooses to copy. A blank slate that takes on the identity of another.",
    ability: "Copy another player's role and become that role.",
    square: cloneSquare,
    fullBody: clone2d,
  },
  {
    id: "joker",
    name: "Joker",
    team: "neutral",
    title: "The Wild Card",
    description: "Chaos incarnate. Wants nothing more than to be eliminated. A madman who wins by losing.",
    ability: "You win if the village votes to eliminate you. You are on your own team.",
    square: jokerSquare,
    fullBody: joker2d,
  },
];

// Preload all characters
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
