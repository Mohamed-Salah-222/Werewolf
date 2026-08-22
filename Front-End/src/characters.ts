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
import warlockSquare from "./assets/warlock_square.webp";
import warlock2d from "./assets/warlock_2d.webp";
import oracleSquare from "./assets/oracle_square.webp";
import oracle2d from "./assets/oracle_2d.webp";

export interface CharacterData {
  id: string;
  en: string;
  name: string;
  team: Team;
  title: string;
  description: string;
  ability: string;
  square: string | null;
  fullBody: string | null;
}

/** Find a character by any of its identifiers: stable id, English name, or Arabic display name */
export function findCharacter(roleName: string): CharacterData | undefined {
  const needle = roleName.trim().toLowerCase();
  return characters.find(
    (c) =>
      c.id.toLowerCase() === needle ||
      c.en.toLowerCase() === needle ||
      c.name === roleName.trim(),
  );
}

export const characters: CharacterData[] = [
  {
    id: "werewolf",
    en: "Werewolf",
    name: "العفريت",
    team: "villain",
    title: "الوحش اللي بينا",
    description:
      "مخلوق الليل مستخبي وسط أهل البلد، شكله زي أي واحد منكم. أول ما تحلك الدنيا ويهجر النوم، بيصحى العفريت ويمشي مع شلته يصطاد.",
    ability:
      "بالليل العفاريت يفتحوا عنيهم ويشوفوا بعض. لو لقيت نفسك لوحدك، ممكن تبص على كارت من كروت الأرض مرة واحدة.",
    square: werewolfSquare,
    fullBody: werewolf2d,
  },
  {
    id: "minion",
    en: "Minion",
    name: "التابع",
    team: "villain",
    title: "خادم الظلام",
    description:
      "عبد مخلص للعفاريت، حلف له يموت وهو صامت. عارف وشوشهم في الضلمة كويس، بس هو نفسه مش متباني عليهم.",
    ability:
      "انت عارف مين العفاريت بس هم مش يعرفوك. لو مت انت، الفريق بتاعهم بيكسب على طول.",
    square: minionSquare,
    fullBody: minion2d,
  },
  {
    id: "seer",
    en: "Seer",
    name: "الرمال",
    team: "village",
    title: "صاحب البصيرة",
    description:
      "واخد عطا يشوف اللي مخبي ورا الستار. بيفرك الرمل بين إيديه وبيلمح في النفوس، بيتبع الحقيقة في الهمس والضلمة.",
    ability:
      "قدامك اختيارين: يا إما تبص على دور لاعب من اللعبين، يا تشوف كارتين من كروت الأرض.",
    square: seerSquare,
    fullBody: seer2d,
  },
  {
    id: "robber",
    en: "Robber",
    name: "الحرامي",
    team: "village",
    title: "حرامي الليل",
    description:
      "حرامي شاطر بيسرق أكتر من الفلوس. في سكون الليل بيبادل هوياته مع غيره، ويصحى الصبح مش عارف هو اصلا مين.",
    ability:
      "اسرق دور من لاعب تاني وابص عليه، وبتفضل بدوره لباقي اللعبة.",
    square: robberSquare,
    fullBody: robber2d,
  },
  {
    id: "troublemaker",
    en: "Troublemaker",
    name: "الشقية",
    team: "village",
    title: "صانعة الفوضى",
    description:
      "بتعيش على اللخبطة والهبل. بايدها الخفيفة بتلعب في القدر، بتبادل أقدار الناس وهي ضحكة في الضلمة.",
    ability:
      "بدل دور لاعبين اتنين بالليل من غير ما تبص. أدوارهم بتتغير وهما مش هيحسوا بحاجة.",
    square: troublemakerSquare,
    fullBody: troublemaker2d,
  },
  {
    id: "mason",
    en: "Mason",
    name: "البناي",
    team: "village",
    title: "اخوة العهد",
    description:
      "متلزقين بعهد وصمت وثقة. البنايين بيعرفوا بعض وسط قرية مليانة كدب، والوفاء اللي بينهم عمره ما بيتكسر.",
    ability:
      "تصحى مع البناي التاني وتتعرفوا على بعض. عهد البنايين عمره ما بيتكسر.",
    square: masonSquare,
    fullBody: mason2d,
  },
  {
    id: "drunk",
    en: "Drunk",
    name: "الليم",
    team: "village",
    title: "الروح التايهة",
    description:
      "تايه في سكرته ومداري، الليم بيهبط في قدره وهو مش واخد باله. بالصبح ممكن يكون ساب دوره من غير ما يحس.",
    ability: "بالليل بدل دورك بكارت أرض عشوائي ومتبصش عليه.",
    square: drunkSquare,
    fullBody: drunk2d,
  },
  {
    id: "insomniac",
    en: "Insomniac",
    name: "الساهر",
    team: "village",
    title: "سهران لحد الفجر",
    description:
      "النوم عمره ما بيجيله. والناس بتدبر في الضلمة، الساهر قاعد يستنى الفجر يشوف اللي فاضل وإيه اللي راح.",
    ability:
      "بتصحى آخر واحد وبتبص على كارتك الحالي عشان تشوف هل اتغير ولا لأ.",
    square: insomniacSquare,
    fullBody: insomniac2d,
  },
  {
    id: "clone",
    en: "Clone",
    name: "الشبيه",
    team: "village",
    title: "مراية من غير وجه",
    description:
      "مراية فاضية بتدور على هويتها. الشبيه بينسخ قدر غيره، بيبقى اللي يشوفه ويعيش حياة مستعارة مش بتاعتو.",
    ability:
      "بالليل اختار لاعب وانقل دوره. بتتحول لدوره وبتعمل حركته الليلية.",
    square: cloneSquare,
    fullBody: clone2d,
  },
  {
    id: "joker",
    en: "Joker",
    name: "الجوكر",
    team: "neutral",
    title: "الكارت المجنون",
    description:
      "جنون متلفف في ضحكة. الجوكر عايش على الفوضى، وكسبانه بس لما يختار خسارته بنفسه.",
    ability:
      "انت تكسب لو القرية صوتت عليك تموت. اعمل شبهات، بس عمرك ما تقول هدفك لحد.",
    square: jokerSquare,
    fullBody: joker2d,
  },
  {
    id: "warlock",
    en: "Warlock",
    name: "الساحر",
    team: "village",
    title: "صاحب التعاويذ",
    description:
      "أستاذ السحر الأسود، بيدبر في القدر من ورا الستار. بمجرد رفة إيد، بيرمي هوية حد في المجهول.",
    ability:
      "اختار لاعب، دوره هيتبدل بكارت أرض عشوائي. انت مش هتشوف بقى بقى مين.",
    square: warlockSquare,
    fullBody: warlock2d,
  },
  {
    id: "oracle",
    en: "Oracle",
    name: "الكاهن",
    team: "village",
    title: "اللي بيسمع الهمس",
    description:
      "الرؤى بتيجيله من غير ما يطلب. كسر من أسرار الليل بيرن في دماغه: دور اتنسرق، عفريت مستخبي، عهد اتبكسر.",
    ability:
      "في آخر الليل بتيجيك رؤية عشوائية من حركة لاعب تاني. ممكن الرؤيا دي تغير كل حاجة.",
    square: oracleSquare,
    fullBody: oracle2d,
  },
];

// ===== CARD STYLE DATA FOR GAMECARD COMPONENT =====

export interface CardStyleData {
  frameColor: string;
  panelColor: string;
  borderColor: string;
}

export const cardStyleMap: Record<string, CardStyleData> = {
  werewolf: {
    frameColor: "#4a0e0e",
    panelColor: "#470d0d",
    borderColor: "#252525",
  },
  minion: {
    frameColor: "#4a0e0e",
    panelColor: "#470d0d",
    borderColor: "#252525",
  },
  seer: {
    frameColor: "#2a2a2a",
    panelColor: "#1e1e1e",
    borderColor: "#3a3a3a",
  },
  robber: {
    frameColor: "#2a2a2a",
    panelColor: "#1e1e1e",
    borderColor: "#3a3a3a",
  },
  troublemaker: {
    frameColor: "#2a2a2a",
    panelColor: "#1e1e1e",
    borderColor: "#3a3a3a",
  },
  mason: {
    frameColor: "#2a2a2a",
    panelColor: "#1e1e1e",
    borderColor: "#3a3a3a",
  },
  drunk: {
    frameColor: "#2a2a2a",
    panelColor: "#1e1e1e",
    borderColor: "#3a3a3a",
  },
  insomniac: {
    frameColor: "#2a2a2a",
    panelColor: "#1e1e1e",
    borderColor: "#3a3a3a",
  },
  clone: {
    frameColor: "#2a2a2a",
    panelColor: "#1e1e1e",
    borderColor: "#3a3a3a",
  },
  joker: {
    frameColor: "#0e2a1a",
    panelColor: "#0a2015",
    borderColor: "#1a3a2a",
  },
  warlock: {
    frameColor: "#2a2a2a",
    panelColor: "#1e1e1e",
    borderColor: "#3a3a3a",
  },
  oracle: {
    frameColor: "#2a2a2a",
    panelColor: "#1e1e1e",
    borderColor: "#3a3a3a",
  },
};

/** Get full GameCard props for a role by name (matches id, English, or Arabic) */
export function getGameCardData(roleName: string) {
  const char = findCharacter(roleName);
  const style = (char && cardStyleMap[char.id]) || cardStyleMap["werewolf"];

  return {
    name: char?.name || roleName,
    ability: char?.ability || "",
    frameColor: style.frameColor,
    panelColor: style.panelColor,
    borderColor: style.borderColor,
  };
}

// ===== CARD IMAGES =====

import { Team } from "@werewolf/shared";
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
import warlockCard from "./assets/warlock_card.webp";
import oracleCard from "./assets/oracle_card.webp";

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
import warlockCardSmall from "./assets/warlock_card_small.webp";
import oracleCardSmall from "./assets/oracle_card_small.webp";

export interface CardData {
  id: string;
  en: string;
  name: string;
  image: string;
  small: string;
}

export const backCardImage = backCard;

export const allCards: CardData[] = [
  {
    id: "werewolf",
    en: "Werewolf",
    name: "العفريت",
    image: werewolfCard,
    small: werewolfCardSmall,
  },
  { id: "minion", en: "Minion", name: "التابع", image: minionCard, small: minionCardSmall },
  { id: "seer", en: "Seer", name: "الرمال", image: seerCard, small: seerCardSmall },
  { id: "robber", en: "Robber", name: "الحرامي", image: robberCard, small: robberCardSmall },
  {
    id: "troublemaker",
    en: "Troublemaker",
    name: "الشقية",
    image: troublemakerCard,
    small: troublemakerCardSmall,
  },
  { id: "mason", en: "Mason", name: "البناي", image: masonCard, small: masonCardSmall },
  { id: "drunk", en: "Drunk", name: "الليم", image: drunkCard, small: drunkCardSmall },
  {
    id: "insomniac",
    en: "Insomniac",
    name: "الساهر",
    image: insomniacCard,
    small: insomniacCardSmall,
  },
  { id: "clone", en: "Clone", name: "الشبيه", image: cloneCard, small: cloneCardSmall },
  { id: "joker", en: "Joker", name: "الجوكر", image: jokerCard, small: jokerCardSmall },
  {
    id: "warlock",
    en: "Warlock",
    name: "الساحر",
    image: warlockCard,
    small: warlockCardSmall,
  },
  { id: "oracle", en: "Oracle", name: "الكاهن", image: oracleCard, small: oracleCardSmall },
];

/** Find a card by any identifier: id, English name, or Arabic display name */
export function findCard(roleName: string): CardData | undefined {
  const needle = roleName.trim().toLowerCase();
  return allCards.find(
    (c) =>
      c.id.toLowerCase() === needle ||
      c.en.toLowerCase() === needle ||
      c.name === roleName.trim(),
  );
}

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
