const ARABIC_NAME_TO_ID: Record<string, string> = {
  "العفريت": "werewolf",
  "التابع": "minion",
  "الشبيه": "clone",
  "الرمال": "seer",
  "البناي": "mason",
  "الحرامي": "robber",
  "الشقية": "troublemaker",
  "الليم": "drunk",
  "الساهر": "insomniac",
  "الجوكر": "joker",
  "الساحر": "warlock",
  "الكاهن": "oracle",
};

export function roleIdOf(name: string): string {
  return ARABIC_NAME_TO_ID[name] ?? name.toLowerCase();
}
