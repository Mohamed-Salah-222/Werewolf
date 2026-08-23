// ═══════════════════════════════════════════════════════════════════
//  ROLE REGISTRY — the single place to edit character content.
//
//  • name        : Arabic display name (used everywhere in the UI)
//  • description : Arabic description shown on role reveal & night
//  • artPath     : optional image path (e.g. "/art/seer.png" served
//                  from Front-End/public/art/). Leave undefined to use
//                  the built-in inline SVG icon for this role.
//
//  Changing a name here updates the backend role classes, the client
//  role-id mapping and every screen automatically.
// ═══════════════════════════════════════════════════════════════════

export interface RoleDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** What the player learns when their night action resolves. */
  readonly knows?: string;
  /** Optional image path (e.g. "/art/seer.png" served from Front-End/public/art/).
   *  Leave undefined to use the built-in inline SVG icon for this role. */
  readonly artPath?: string;
}

export const ROLE_REGISTRY: Record<string, RoleDef> = {
  werewolf: {
    id: "werewolf",
    name: "العفريت",
    description: "يشوف باقي العفاريت. لو لوحده، يشوف كارت أرض واحدة",
    knows: "أسماء زماعه العفاريت — ولو كنت لوحدك، كارت أرض واحد",
  },
  minion: {
    id: "minion",
    name: "التابع",
    description: "يشوف مين العفاريت. يكسب لو اتطرد والعفاريت يكسبوا",
    knows: "أسماء العفاريت (هما مش هيوفوك)",
  },
  clone: {
    id: "clone",
    name: "الشبيه",
    description: "ياخد دور لاعب تاني ويعمل حركته على طول",
    knows: "الدور اللي استنسخته ونتيجة حركته",
  },
  seer: {
    id: "seer",
    name: "الرمال",
    description: "يشوف دور لاعب واحد أو كارتين أرض",
    knows: "دور اللاعب اللي اخترته — أو كارتين الأرض بالاسم",
  },
  mason: {
    id: "mason",
    name: "البناي",
    description: "يصحى مع البنايين التانيين يتشافوا",
    knows: "أسماء البنايين التانيين (أو إنك لوحدك)",
  },
  robber: {
    id: "robber",
    name: "الحرامي",
    description: "يسرق دور لاعب تاني ويشوف دوره الجديد",
    knows: "مين سرقت منه ودورك الجديد بالاسم",
  },
  troublemaker: {
    id: "troublemaker",
    name: "الشقية",
    description: "يبادل دورين لاعبين من غير ما يشوف",
    knows: "أسماء الاتنين اللي بدلتهم بس — مش الأدوار",
  },
  drunk: {
    id: "drunk",
    name: "الليم",
    description: "يبدل دوره بكارت أرض عشوائي من غير ما يبص",
    knows: "إنك بدلت بس — مفيش أي معلومات عن كارتك الجديد",
  },
  warlock: {
    id: "warlock",
    name: "الساحر",
    description: "يبدل دور لاعب بكارت أرض عشوائي من غير ما يبص",
    knows: "مين بدلت دوره بس — لا دوره القديم ولا الجديد",
  },
  insomniac: {
    id: "insomniac",
    name: "الساهر",
    description: "يصحى آخر الليل يتأكد دوره اتغير ولا لأ",
    knows: "دورك النهائي — واتغير من إيه ليه لو اتبدل",
  },
  joker: {
    id: "joker",
    name: "الجوكر",
    description: "يبص على كارت أرض. يكسب لوحدو لو اتصوّت عليه",
    knows: "كارت الأرض اللي بصيت عليه بالاسم",
  },
  oracle: {
    id: "oracle",
    name: "الكاهن",
    description: "آخر الليل يستلم نتيجة حركة عشوائية للاعب تاني",
    knows: "رؤية عشوائية من حركة لاعب تاني (لو حصلت)",
  },
};

/** Arabic name -> role id lookup (derived). */
export const ROLE_ID_BY_NAME: Record<string, string> = Object.fromEntries(
  Object.values(ROLE_REGISTRY).map((r) => [r.name, r.id]),
);
