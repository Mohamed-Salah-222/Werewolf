# CONTENT

Single source of truth for every string a player reads. `src/content/roles.ts` and
`src/content/ui.ts` are generated from this file and must never diverge from it.

**Status of the Arabic copy below: DRAFT.** The 12 names are locked (D-02). The
titles, lore, and ability lines are written to be mechanically correct and in Egyptian
عامية — they need an owner pass for voice before Phase 5. Flag anything that reads
wrong.

**Never write new player-facing copy in a component.** Add it here first.

---

## Teams

| Wire value (frozen) | Arabic label | Wins when |
|---|---|---|
| `villain` | فريق الحرامية | محدش من الحرامية اتصوّت عليه |
| `village` | فريق الحارة | حرامي واحد على الأقل اتصوّت عليه |
| `neutral` | لوحده | الجوكر يكسب لو هو اللي اتصوّت عليه |

Village and neutral labels are unconfirmed — **Q-02**. The villain label is confirmed
by the existing `team.webp` asset.

---

## The 12 roles

Team column is **unverified** — it must be read from the `team` field of each class in
`Back-End/src/entities/roles/*.ts` during task 0.9 (**Q-01**). Clone's may be
inherited at runtime rather than static.

### `Werewolf` — حرامي
- **Team:** فريق الحرامية
- **Title:** اللي واخد الفلوس
- **Lore:** خد الفلوس وجري، ودلوقتي قاعد وسط الناس عمّال يعيّط زيّهم. كل اللي عايزه إن الليلة تعدّي وهو مستخبّي.
- **Ability:** بليل بيعرف مين الحرامية التانيين. لو مفيش حد معاه، يبص على كارت واحد من اللي على الأرض.

### `Minion` — عصفورة
- **Team:** فريق الحرامية
- **Title:** ودّان الحارة
- **Lore:** يعرف كل حارة وزاوية وأسرارها، عينه في كل مكان، يراقب من بعيد وينقل الأخبار لزمايله. المعلومة هي سلاحه الأقوى.
- **Ability:** بيعرف مين الحرامية، بس هما مش عارفينه. لو اتصوّت عليه، الحرامية تكسب.

### `Clone` — كوافير
- **Team:** بيتغير — بياخد فريق الدور اللي قلّده
- **Title:** بيقلّد أي حد
- **Lore:** قاعد في الدكان طول اليوم يتفرّج على الناس. مشيتهم، كلامهم، حتى الطريقة اللي بيكدبوا بيها — كلها محفوظة عنده.
- **Ability:** بيبص على كارت لاعب تاني ويبقى نفس دوره، وبيعمل قدرة الدور ده على طول.

### `Seer` — خالتي اللتاتا
- **Team:** فريق الحارة
- **Title:** مفيش حاجة بتفوتها
- **Lore:** قاعدة على الشباك من قبل ما الشمس تطلع. عارفة مين خرج ومين رجع ومين اتأخر ليه.
- **Ability:** تبص على كارت لاعب واحد، أو على كارتين من اللي على الأرض.

### `Mason` — غفير
- **Team:** فريق الحارة
- **Title:** حارس الليل
- **Lore:** ماشي في الحارة بالعصاية والفانوس. مش بيسيب حتة من غير ما يعدّي عليها.
- **Ability:** بيشوف الغفير التاني في الحارة. لو ملقاش حد، يبقى هو الوحيد.

### `Robber` — ديلر
- **Team:** فريق الحارة
- **Title:** بيبدّل ويقلب
- **Lore:** كل حاجة عنده قابلة للتبديل. بيدخل بحاجة ويخرج بحاجة تانية، ومحدش واخد باله.
- **Ability:** بياخد كارت لاعب تاني ويديله كارته، وبعدين يبص يشوف بقى إيه.

### `Troublemaker` — بلطجي
- **Team:** فريق الحارة
- **Title:** بيلخبط الدنيا
- **Lore:** مش عايز حاجة لنفسه. بيحب بس إن الحارة تولّع وهو واقف يتفرّج.
- **Ability:** بيبدّل كارتين لاعبين تانيين مع بعض من غير ما يبص على أي واحد فيهم.

### `Drunk` — حشاش
- **Team:** فريق الحارة
- **Title:** مش فاكر حاجة
- **Lore:** كان في الحارة ساعة الحادثة، أكيد. بس هو نفسه مش متأكد هو كان فين.
- **Ability:** بيبدّل كارته بكارت من اللي على الأرض، من غير ما يعرف بقى إيه.

### `Joker` — جوكر
- **Team:** لوحده
- **Title:** عايز الشبهة
- **Lore:** تعب من إن محدش بياخد باله منه. لو الحارة كلها هتتكلم عنه، يبقى تمام.
- **Ability:** بيكسب لوحده لو الناس صوّتت عليه هو. بيبص على كارت من اللي على الأرض.

### `Insomniac` — جاضض
- **Team:** فريق الحارة
- **Title:** صاحي لآخر الليل
- **Lore:** مش بينام. قاعد على القهوة لحد ما الشمس تطلع، ويشوف الحاجات اللي بتحصل بعد ما الكل ينام.
- **Ability:** آخر الليل بيبص على كارته يشوف اتغيّر ولا لسه زي ما هو.

### `Warlock` — شيخ الحارة
- **Team:** ⚠️ اتأكد من الكود — Q-01
- **Title:** كلمته نافذة
- **Lore:** بيقول كلمة، فتتنفّذ. الناس بتغيّر حياتها عشان قال، وهو نفسه ساعات مش عارف عمل إيه.
- **Ability:** بيبدّل كارت لاعب تاني بكارت من اللي على الأرض، من غير ما يبص.

### `Oracle` — دجال
- **Team:** ⚠️ اتأكد من الكود — Q-01
- **Title:** بيقرا الغيب
- **Lore:** بيفتح الودع ويقول للناس اللي عايزين يسمعوه. مرات بيطلع كلامه صح، ومرات بيطلع صح بالغلط.
- **Ability:** بيجيله كشف عن دور من الأدوار اللي في اللعبة.

⚠️ **Oracle's ability line is a placeholder.** `Oracle.ts:69-160` is a 12-arm switch
producing 25 different English vision sentences. Whoever does task 6.12 must read that
function and write an Arabic equivalent for each branch, adding them to this file.
It is the single largest translation surface in the project.

---

## UI strings

Seed set. Grows every phase. Keys mirror `src/content/ui.ts`.

### Global
| Key | Arabic |
|---|---|
| `app.name` | حارتنا |
| `common.confirm` | تمام |
| `common.cancel` | إلغاء |
| `common.leave` | اخرج |
| `common.back` | رجوع |
| `common.waiting` | استنى شوية… |
| `common.unknown` | مش معروف |

### Home
| Key | Arabic |
|---|---|
| `home.create` | إنشاء لعبة |
| `home.join` | انضم للعبة |
| `home.howToPlay` | طريقة اللعب |
| `home.enterName` | اكتب اسمك |
| `home.enterCode` | كود اللعبة |

### Waiting room
| Key | Arabic |
|---|---|
| `lobby.title` | أوضة الانتظار |
| `lobby.ready` | جاهز |
| `lobby.notReady` | لسه |
| `lobby.start` | ابدأ اللعبة |
| `lobby.code` | الكود |
| `lobby.share` | ابعت الكود |
| `lobby.host` | صاحب اللعبة |
| `lobby.kick` | اطرده |

### Phases
| Key | Arabic |
|---|---|
| `phase.role` | دورك |
| `phase.night` | الليل |
| `phase.discussion` | الكلام |
| `phase.vote` | التصويت |
| `phase.results` | النتيجة |

### Vote
| Key | Arabic |
|---|---|
| `vote.title` | مين الحرامي؟ |
| `vote.noThief` | محدش |
| `vote.confirm` | أكّد صوتك |
| `vote.forced` | التصويت اتقفل |

### Results
| Key | Arabic |
|---|---|
| `results.youWon` | كسبت |
| `results.youLost` | خسرت |
| `results.playAgain` | العب تاني |

### Errors
| Key | Arabic |
|---|---|
| `error.gameNotFound` | اللعبة مش موجودة |
| `error.gameFull` | اللعبة كاملة |
| `error.nameTaken` | الاسم ده متاخد |
| `error.nameTooShort` | الاسم قصير أوي |
| `error.connectionLost` | الاتصال قطع |

⚠️ Today the client only `console.error`s server errors (`sockets.ts:98-100`) — the
player sees **nothing** when an action is rejected. These strings have no display
surface yet. Building one is not in the reskin scope, but the strings are here for
whenever it is.

---

## Plurals — read before writing any counted string

Arabic has six plural categories: zero, one, two, few (3–10), many (11–99), other
(100+). The codebase currently uses binary `n === 1` logic in five places and the
`(s)` parenthetical dodge in two more — both are wrong in Arabic and the dodge has no
Arabic equivalent at all.

Player counts here run 0–12, so the categories that actually occur are **zero, one,
two, few (3–10), many (11–12)**.

```
0   محدش لسه جاهز
1   لاعب واحد لسه
2   لاعبين لسه
3–10  ٣ لاعبين لسه        → few: العدد + جمع
11–12 ١١ لاعب لسه          → many: العدد + مفرد
```

Note the reversal at 11: **few takes the plural noun, many takes the singular.** This
is the trap. Write one helper in `src/content/ui.ts` and route every counted string
through it.

Known sites needing it: `Vote.tsx:154`, `WaitingRoom.tsx:133`, `WaitingRoom.tsx:201`,
`Vote.tsx:141`, `Mason.ts:39` (via the client-side rebuild per D-07),
`Oracle.ts:80` (same).

---

## Ordinals

`HowToPlay.tsx:24-29` uses English suffixes — `"7th"`, `"8th"` … `"12th"` — for which
role enters at which player count. Arabic ordinals are separate gendered words, not
suffixes: السابع، الثامن، التاسع، العاشر، الحادي عشر، الثاني عشر.

Simplest fix and the one to prefer: rephrase to avoid ordinals entirely —
**"من ٧ لاعبين"** rather than **"اللاعب السابع"**.
