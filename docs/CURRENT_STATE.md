# CURRENT_STATE — Werewolf → حارتنا conversion audit

## 1. Audit metadata

- **Date:** 2026-08-13
- **Commit audited:** `a7f7af463ecb72bab178fee1f33356bc3f13462c` ("fixed night phase + discussion ( not 100% sure about clone )", 2026-07-14), branch `refactor/main`.
- **Working tree was dirty at audit time:** 23 uncommitted entries (10 modified CSS/TSX files, 13 untracked new `.webp` assets). Where a modified file is cited, line numbers refer to the **working tree**, not the commit. The largest divergence is `Front-End/src/pages/HomePage.tsx`, which contains uncommitted Egyptian-Arabic content and a new asset-driven layout.
- **Produced by:** Claude Opus 5 via Claude Code, read-only analysis. No files were modified except this one.
- **What I did NOT look at:**
  - I did **not run the test suite.** `Back-End/jest.config.js:7` sets `collectCoverage: true`, so `npm test` writes into `Back-End/coverage/` — a mutation. Test *counts and contents* below are from reading the files; **pass/fail status is unknown.**
  - I did **not run `npm run build` on either package** (both emit artifacts). I did run `tsc --noEmit` on both, which emits nothing. See §10.
  - I did not run the app, join a game, or observe any runtime behaviour. Every behavioural claim is derived from reading source.
  - I did not inspect `node_modules`, `Back-End/coverage/` (generated), `Front-End/dist/` (generated, gitignored), or the `Werewolf/` Obsidian vault beyond confirming it is planning notes.
  - I did not open every one of the 65 image assets. I opened 6 (`logo.webp`, `lore.webp`, `team.webp`, `ability.webp`, `werewolf_card.webp`, `seer_card_small.webp`, `joker_square.webp`) and generalise from them where stated; where I generalise I say so.
  - I did not inspect the Vercel or Render dashboards. Deployment claims are limited to what is in the repo.
  - I could not determine art provenance/licensing from the repo. See §14.

---

## 2. Executive summary

The reskin is **mechanically shallow but structurally unguarded**, and the art replacement is **the blocking item**, not the text.

Role identity is the whole risk. There is no role enum. `Role.name` is a plain `string` that is simultaneously the logic key, the map key, the network payload, the asset lookup key, and the text the player reads (`Back-End/src/entities/roles/Role.ts:3-9`, `Back-End/src/entities/game/Game.ts:682-684`). Renaming "Werewolf" → an Arabic name changes what the night-phase queue matches on (`Game.ts:367`), what the role-timer map is keyed by (`NightPhaseManager.ts:11-24`), what win conditions compare against (`VoteResolver.ts:43,69,82`), and what the client uses to pick the action UI (`NightPhase.tsx:114,177`) — all at once. There are **~60 hard-coded role string comparisons** across both halves and **at least 11 separate copies of the role list** that must stay in sync manually.

The one genuinely good thing: **asset paths are not derived from role IDs.** Images are static ES imports resolved through array lookups (`Front-End/src/characters.ts:2-25,310-343`). No `/img/${role}.png` anywhere. Swapping art is a data edit, not a path-scheme change.

The blocker is that **role card art has English text painted into the pixels** — role name and full ability sentence (`werewolf_card.webp`, `seer_card_small.webp`). Those 24 files must be redrawn, not swapped. The portrait `*_square.webp` files are clean.

RTL is unusually cheap here: only **12 physical directional CSS declarations** in 8,420 lines of CSS, because the layout is centred inside a fixed 430×932 phone frame (`index.css:52-60`). The Arabic display font (`Alyamama`) is already loaded (`index.html:11`) and already used as `--font-display`. Conversion has, in fact, already started ad hoc in `HomePage.tsx` — Arabic strings are hard-coded inline.

**Nothing in this repo would catch a broken role assignment before players did.** No CI, no frontend tests, no runtime error surfaced to the player (`sockets.ts:98-100` swallows every server error into `console.error`), and the frontend does not currently typecheck at all — `tsc` reports 20+ errors including three that reject the shared package outright.

---

## 3. Stack and topology (Section A)

### 3.1 Layout

npm workspaces monorepo (`package.json:2-6`): `packages/*`, `Front-End`, `Back-End`.

| Path | Contents |
|---|---|
| `Back-End/src/` | Express + Socket.IO server. 38 `.ts` files, **4,914 LOC** (of which 1,384 are tests). |
| `Front-End/src/` | React SPA. 32 `.tsx` + 6 `.ts` = **6,766 LOC**; 28 `.css` files = **8,420 LOC**. Total 15,186 LOC. |
| `packages/shared/` | 5 `.ts` files, **227 LOC**. Types, socket event names, constants, error strings. |
| `Werewolf/` | 19 committed files — an Obsidian vault of planning notes. Not code. |
| `Back-End/coverage/` | 95 committed files of generated Jest HTML coverage output. Should not be in git. |
| `.agents/` | Empty directory. |

Frontend/backend boundary is **entirely Socket.IO** plus five REST endpoints used only for game creation and existence checks (`Back-End/src/routes/gameRoutes.ts:8-18`). The frontend calls exactly one of them: `POST /api/games/create` (`Front-End/src/pages/HomePage.tsx:139`).

### 3.2 Languages and libraries

**Frontend** (`Front-End/package.json:11-19`):
- react 19.2.0, react-dom 19.2.0
- react-router-dom 7.13.0
- socket.io-client 4.8.3
- zustand 5.0.12
- lucide-react 0.577.0
- vite 7.3.1, typescript ~5.9.3, eslint 9.39.1 (`:22-36`)

**Backend** (`Back-End/package.json:16-21`):
- express 5.2.1
- socket.io 4.8.3
- cors 2.8.6, dotenv 17.2.4
- jest 30.2.0 + ts-jest 29.1.1, nodemon 3.1.11, typescript 5.9.3 (`:23-32`)

**Shared** (`packages/shared/package.json`): private workspace package `@werewolf/shared`, `main` and `types` both point at `./src/index.ts` — **raw TypeScript, never compiled**. Both consumers import it as source.

### 3.3 Styling — this determines the RTL approach

**Plain hand-written CSS, one file per page/component, imported directly by the component.** 28 files, 8,420 lines. No CSS Modules, no styled-components, no CSS-in-JS.

**Tailwind is a decoy.** `tailwindcss@4.1.18` and `@tailwindcss/vite@4.1.18` are in devDependencies (`Front-End/package.json:23,34`) but:
- `Front-End/vite.config.ts:5` registers only `react()` — the Tailwind plugin is not wired in.
- There is no `@import "tailwindcss"` anywhere in the CSS.
- A grep for Tailwind utility classes in JSX (`ml-`, `mr-`, `pl-`, `pr-`, `text-left`, `text-right`) returns **zero** matches.

**Consequence:** RTL is done with real CSS logical properties and a `dir` attribute. Tailwind's `ms-*`/`me-*` logical utilities are irrelevant — do not plan around them.

Design tokens exist as CSS custom properties in `Front-End/src/index.css:8-30` (colours, `--font-display`, `--font-body`, phone-frame dimensions). Some inline styles exist for computed values only (circle positions, animation delays), not for layout direction.

### 3.4 Build and entry points

| | Command | Entry |
|---|---|---|
| Frontend dev | `vite` (`Front-End/package.json:7`) | `Front-End/index.html` → `src/main.tsx:6` → `App.tsx` |
| Frontend build | `tsc -b && vite build` (`:8`) | — |
| Backend dev | `nodemon` → `ts-node src/server.ts` (`Back-End/nodemon.json:4`) | `Back-End/src/server.ts` |
| Backend build | `tsc` → `dist/` (`Back-End/package.json:9`) | `node dist/server.js` (`:10`) |
| Root | `tsc -p tsconfig.json` (`package.json:10`) | **Broken — no `tsconfig.json` exists at the repo root.** |

### 3.5 Deployment config present in the repo

- `Front-End/vercel.json` — SPA rewrite only: `{"rewrites":[{"source":"/(.*)","destination":"/"}]}`. Nothing else.
- **No `render.yaml`, no Dockerfile, no `Procfile`, no `.github/` directory, no CI config of any kind.** The Render backend is configured entirely outside the repo.
- Env var **names** (values not reproduced): frontend `VITE_BACKEND_URL` (`Front-End/src/config.ts:1`); backend `PORT`, `NODE_ENV`, `FRONTEND_URL` (`Back-End/src/server.ts:13,39`, `Back-End/src/config/cors.ts:4,13`).
- **`Back-End/.env` is committed to git.** It is not in `Back-End/.gitignore`. Its current contents are non-secret, but the file is tracked, so any secret added later ships to the remote.

---

## 4. Role identity map (Section B)

### 4.1 Where the canonical role list lives — it does not

There is no single canonical list. There are **at least 11 independent copies** that must agree:

| # | Location | Form | Case |
|---|---|---|---|
| 1 | `packages/shared/src/game-constants.ts:7-20` `ROLE_NAMES` | object of string literals | Capitalised |
| 2 | `Back-End/src/entities/roles/index.ts:33-46` `RoleClasses` | object keys → class refs | lowercase |
| 3 | Each `Back-End/src/entities/roles/*.ts` `name` field, e.g. `Werewolf.ts:16` | instance property | Capitalised |
| 4 | `Back-End/src/entities/game/NightPhaseManager.ts:11-24` `roleTimers` | `Map` keys | Capitalised |
| 5 | `Back-End/src/entities/game/RoleAssigner.ts:40` `createRoles` | array literal | Capitalised |
| 6 | `Back-End/src/entities/game/RoleAssigner.ts:69` `extraRolesInOrder` | array literal | Capitalised |
| 7 | `Back-End/src/entities/game/RoleAssigner.ts:102` and **again** at `:111` | two identical `roleOrder` arrays | Capitalised |
| 8 | `Back-End/src/entities/game/VoteResolver.ts:94` `roleOrder` | array literal, **10 of 12 roles — Warlock and Oracle are missing** | Capitalised |
| 9 | `Front-End/src/characters.ts:38-183` `characters[]` | `id` + `name` + lore + ability | both |
| 10 | `Front-End/src/characters.ts:310-343` `allCards[]` | `id` + `name` + images | both |
| 11 | `Front-End/src/components/HowToPlay.tsx:11,13-21,23-30,32-45` | **four more lists** — `ROLE_ORDER`, `BASE_ROLES`, `EXPANSION_ORDER`, `CHARACTER_INFO` | Capitalised |

Plus `Front-End/src/pages/NightPhase.tsx:44-57` (`ROLE_COMPONENTS`, lowercase keys) and `:60` (`ROLES_WITH_PERSISTENT_ACTION`, lowercase set), and `Front-End/src/characters.ts:193-254` (`cardStyleMap`, lowercase keys).

**`ROLE_NAMES` — the thing that looks canonical — is used in exactly one file.** `Back-End/src/entities/game/RoleAssigner.ts` is its only consumer. `Game.ts`, `NightPhaseManager.ts`, `VoteResolver.ts`, every role class, and the entire frontend ignore it and hard-code literals instead.

`packages/shared/src/game-constants.ts:5` `CLONE_ACTIVE_ROLES` is **exported and never imported anywhere**; `Back-End/src/entities/roles/Clone.ts:6` defines its own identical `CLONE_FOLLOW_UP_ROLES`. Two copies of the same list, one of them already dead.

### 4.2 Is the logic identifier the same value as the display string?

**Yes. Identically the same string.** `Role.name` (`Back-End/src/entities/roles/Role.ts:5`) is:
- the value compared in the night queue (`Game.ts:367,370`)
- the key of `roleTimers` (`NightPhaseManager.ts:38`) — **a miss throws** `Role ${roleName} has no timer` (`:40`)
- the key of `currentGameRolesMap` (`Game.ts:347,350-351`)
- the value compared in win conditions (`VoteResolver.ts:43,69,82`)
- the value sent to the client as `playerPrivateData.currentRole` / `.originalRole` (`Game.ts:682-683`)
- the value the client renders directly on screen (`NightPhase.tsx:247`, `Results.tsx:113,124,147`, `Discussion.tsx:225`)
- the key the client uses to look up card art (`Front-End/src/utils/roleHelpers.ts:5,11`)

There is no display-name layer. There is no `roleId`. `Role.id` exists (`Role.ts:4`) but it is a **random per-instance token** — `Math.random().toString(36).substring(2,10)` (`Werewolf.ts:21`, identical in all 12 classes) — used only to identify a specific *card* among ground cards. It is not a role type identifier.

**Form of the identifier:** a bare `string` literal. Not an enum, not numeric, not a class name (class names exist but are only reachable via the `RoleClasses` lookup object), not a filename.

### 4.3 One role traced end to end — Werewolf

| Hop | Location | What appears |
|---|---|---|
| Class definition | `Back-End/src/entities/roles/Werewolf.ts:16` | `name = "Werewolf"` |
| Description | `Werewolf.ts:18` | English prose, shipped to client |
| Action discriminator | `Werewolf.ts:7,11,26` | `type: "werewolf"` (separate namespace, see §4.6) |
| Self-identification inside its own action | `Werewolf.ts:30` | `p.getRole().name.toLowerCase() === "werewolf"` |
| Prose built into result | `Werewolf.ts:36,48` | `The other Werewolves are: …` / `You saw a ${groundCard.name} on the ground` |
| Class registry | `roles/index.ts:34` | `werewolf: Werewolf` |
| Constant | `packages/shared/src/game-constants.ts:8` | `WEREWOLF: "Werewolf"` |
| Distribution table | `RoleAssigner.ts:12` | `[ROLE_NAMES.WEREWOLF]: werewolfCount` |
| Deck construction | `RoleAssigner.ts:40,49,51` | literal `"Werewolf"`, `roleNames[0].toLowerCase()` |
| Expansion deck | `RoleAssigner.ts:69` | `"Werewolf"` at 10th player |
| Night order (×2) | `RoleAssigner.ts:102,111` | `ROLE_NAMES.WEREWOLF` first |
| Night timer | `NightPhaseManager.ts:12` | `["Werewolf", 10]` |
| Auto-action dispatch | `NightPhaseManager.ts:137,203` | `"werewolf"` in the auto-perform list and switch |
| Queue match | `Game.ts:367,370` | `p.getOriginalRole().name === nextRoleAction` |
| Referenced by another role | `Minion.ts:30` | `p.getRole().name.toLowerCase() === "werewolf"` |
| Referenced by Clone | `Clone.ts:60-64` | `case "werewolf"` → prose |
| Referenced by Oracle | `Oracle.ts:73-83` | `case "werewolf"` → four prose variants |
| **Win condition** | `VoteResolver.ts:43,69` | `player.getRole().name === "Werewolf"` |
| Vote sentinel | `Game.ts:436,465,470,487,644,697`, `VoteResolver.ts:38,67` | the magic id `"noWerewolf"` |
| Socket payload | `packages/shared/src/game-types.ts:63,64,76,77` and `:37-40` | role names as bare `string` |
| Snapshot build | `Game.ts:628-629,653,682-683` | emitted every state change |
| Client store | `Front-End/src/store/gameStore.ts:188-190,198,203` | stored as `roleName`, `originalRoleName`, `initialActiveRole` |
| **Client persistence** | `gameStore.ts:224-225` | persisted to `sessionStorage` under key `werewolf_game` |
| **Client turn gate** | `NightPhase.tsx:113-114` | `storeInitialActiveRole?.toLowerCase() === myNightRole.toLowerCase()` |
| **Client UI dispatch** | `NightPhase.tsx:45,177,184` | `ROLE_COMPONENTS["werewolf"]` |
| Client asset lookup | `roleHelpers.ts:5,11` | matched against `characters[].name` / `allCards[].name` |
| Client asset lookup (other path) | `NightRoleProgress.tsx:22,27` | matched against `characters[].id` / `allCards[].id` |
| Client content | `characters.ts:40-50` | `id`, `name`, `title`, `description`, `ability` |
| Client card data | `characters.ts:311-316` | `id`, `name`, two images |
| Client card colours | `characters.ts:194-198` | `werewolf:` key; **also the fallback for unknown roles** (`characters.ts:260`) |
| Client rules screen | `HowToPlay.tsx:11,14,27,33` | four separate mentions |
| Client action UI | `WerewolfAction.tsx:75,146,152` | literal `"werewolf"` for its own art |
| Client results | `Results.tsx:11` | `villains = ["werewolf","minion"]` |
| Client discussion | `Discussion.tsx:26` | `villains = ["werewolf","minion"]` |
| **Baked into pixels** | `Front-End/src/assets/werewolf_card.webp` | the word "WEREWOLF" + ability sentence, painted into the image |
| Tests | `Back-End/src/tests/unit/roles.test.ts` (41 role-name assertions), `feature/gameNightPhase.test.ts` (36) | `expect(...).toBe("Werewolf")` etc. |

### 4.4 The table

Every role has an identical shape. `logic ID === display string` for all 12. Common locations, applying to **every** role: shared `ROLE_NAMES`; `RoleClasses`; the role class file; `roleTimers`; `RoleAssigner` `roleOrder` ×2; `characters[]`; `allCards[]`; `cardStyleMap`; `HowToPlay` ×4 lists; `NightPhase.ROLE_COMPONENTS`; `ROLES_WITH_PERSISTENT_ACTION`; the socket snapshot; sessionStorage; the role's own `*Action.tsx` component.

| Role logic ID | Display string | Same value? | Extra locations beyond the common set | String-compared in logic? | In DB? | On wire? | Drives asset path? |
|---|---|---|---|---|---|---|---|
| `Werewolf` / `"werewolf"` | `Werewolf` | yes | `VoteResolver.ts:43,69`; `Minion.ts:30`; `Werewolf.ts:30`; `Clone.ts:60`; `Oracle.ts:73`; `Results.tsx:11`; `Discussion.tsx:26`; `NightPhaseManager.ts:137,203`; `"noWerewolf"` sentinel ×8 | **YES — 12+ sites, incl. both win conditions** | no DB | yes | no (array lookup) |
| `Minion` | `Minion` | yes | `VoteResolver.ts:82` (win condition); `Clone.ts:66`; `Oracle.ts:85`; `Results.tsx:11`; `Discussion.tsx:26`; `NightPhaseManager.ts:137,208` | **YES — incl. a win condition** | no DB | yes | no |
| `Seer` | `Seer` | yes | `Clone.ts:99,107`; `Oracle.ts:94`; `NightPhaseManager.ts:229,350`; `CloneAction.tsx:151` | YES — 7 sites | no DB | yes | no (**note:** file is `Seer_card.webp`, capital S — `characters.ts:277`) |
| `Robber` | `Robber` | yes | `Clone.ts:107`; `Oracle.ts:120`; `NightPhaseManager.ts:254,365`; `CloneAction.tsx:152`; `Discussion.tsx:54,70` | YES — 8 sites | no DB | yes | no |
| `Troublemaker` | `Troublemaker` | yes | `Clone.ts:107`; `Oracle.ts:127`; `NightPhaseManager.ts:269,370`; `CloneAction.tsx:153` | YES — 6 sites | no DB | yes | no |
| `Mason` | `Mason` | yes | `RoleAssigner.ts:45`; `Mason.ts:32,33`; `Clone.ts:72`; `Oracle.ts:111`; `NightPhaseManager.ts:125,137,213,392,400,401`; `CloneAction.tsx:175` | **YES — 14 sites, incl. Clone-Mason plumbing** | no DB | yes | no |
| `Drunk` | `Drunk` | yes | `Oracle.ts:134`; `NightPhaseManager.ts:137,277,375`; `CloneAction.tsx:159` | YES — 6 sites | no DB | yes | no |
| `Insomniac` | `Insomniac` | yes | `Clone.ts:78`; `Oracle.ts:137`; `NightPhaseManager.ts:129,137,218,427,434,439`; `CloneAction.tsx:183`; `Discussion.tsx:58,75` | **YES — 12 sites; `:439` also builds prose containing the name** | no DB | yes | no (dir is `insomaniac_*`, misspelt — `characters.ts:16,282,295`) |
| `Clone` | `Clone` | yes | `Clone.ts:32,53,56,118`; `Oracle.ts:104`; `NightPhaseManager.ts:292`; `gameHandlers.ts:78`; `NightPhase.tsx:129`; `Discussion.tsx:62` | **YES — 10 sites; the two-phase Clone flow is the most role-string-coupled code in the repo** | no DB | yes | no |
| `Joker` | `Joker` | yes | `Oracle.ts:144`; `NightPhaseManager.ts:137,284`; `CloneAction.tsx:167`; `Results.tsx:12,19,25,60,72`; `Discussion.tsx:27` | **YES — 11 sites, incl. win-label logic** | no DB | yes | no |
| `Warlock` | `Warlock` | yes | `Clone.ts:99,107`; `Oracle.ts:151`; `NightPhaseManager.ts:261,380`; `CloneAction.tsx:154`; **absent from `VoteResolver.ts:94`** | YES — 7 sites | no DB | yes | no (a stray 2.5 MB `warlock_2d.png` sits beside the `.webp`) |
| `Oracle` | `Oracle` | yes | `Clone.ts:84`; `NightPhaseManager.ts:133,137,223,472,479`; `CloneAction.tsx:191`; **absent from `VoteResolver.ts:94`** | YES — 9 sites | no DB | yes | no |

### 4.5 Answers to the specific questions

- **Compared as strings in logic?** Yes, extensively. Grep across `Back-End/src` + `Front-End/src` finds **~60 direct equality comparisons** against role-name literals, **28 `switch`/`case` arms** keyed on role names (`NightPhaseManager.ts:203-292` and `:350-380`, `Oracle.ts:73-156`, `Clone.ts:60-94`, `NightPhase.tsx:184-207`), and three `.includes()` calls against inline role arrays (`Clone.ts:53,56,118`). **The two highest-blast-radius sites are `VoteResolver.ts:43,69` (`=== "Werewolf"`) and `VoteResolver.ts:82` (`=== "Minion"`) — these decide who wins the game.**
- **In a database schema?** **No.** There is no database (§9). No migration is implied by a rename. However role names *are* written to client `sessionStorage` (`gameStore.ts:224-225`) — a rename mid-session leaves a stale role name in a live browser tab.
- **Cross the network?** **Yes**, as bare `string`. Real payload shape, from `packages/shared/src/game-types.ts:48-81` and `:36-46`:
  ```ts
  // ServerToClient: "updateGameSnapShot"
  {
    code: string; phase: string; hostId: PlayerId;
    players: Array<{ id; name; isReady; hasConfirmedRole; hasVoted; isHost; ping; isConnected }>;
    groundCards: Array<{ id: string; label: string }>;      // label = "Ground Card 1" (Game.ts:626)
    roleQueue: Array<{ roleName: string; seconds: number }>; // roleName = "Werewolf"
    currentActiveRole: string | null;                        // "Werewolf"
    winners: string | null;                                  // Team enum value: "villain"
    resultsPlayerRoles: Array<{ playerId; name; role: string }> | null; // role = "Werewolf"
    actionHistory: Array<{ role: string; playerName: string; description: string }> | null;
                                          // description = English prose, e.g. "You stole the Seer role"
    playerPrivateData: {
      currentRole: string | null;      // "Werewolf"
      originalRole: string | null;
      roleTeam: string | null;         // "villain"
      roleDescription: string | null;  // English sentence from the role class
      lastActionResult: Record<string, unknown> | null; // contains a `message` prose field
      …
    } | null;
    …
  }
  ```
  Note `roleQueue` and `currentActiveRole` are **Capitalised** while `ROLE_COMPONENTS` keys are **lowercase** — the client bridges this with `.toLowerCase()` at `NightPhase.tsx:114,176,218`. Any rename must preserve a stable lowercasing relationship or the bridge silently breaks.
- **Derive asset paths?** **No.** `Front-End/src/characters.ts:2-25` and `:274-299` are 37 static `import` statements bundled by Vite; lookup is `Array.find` on `name` (`roleHelpers.ts:5,11`) or on `id` (`NightRoleProgress.tsx:22,27`, `RoleReveal.tsx:20`). **This is the single best-structured thing in the codebase for this conversion.** The two lookup paths keying on different fields (`name` vs `id`) only work today because `id === name.toLowerCase()`; break that and half the art disappears.

### 4.6 Other identity namespaces

| Namespace | Definition | Values | Risk |
|---|---|---|---|
| **Teams** | `packages/shared/src/game-types.ts:21-25` `enum Team` | `villain`, `village`, `neutral` | **Already broken.** `Front-End/src/pages/Results.tsx:11-13,24-26,68-74` expects `"werewolves"`, `"villagers"`, `"joker"` — values the server never sends. See §11 R2. |
| **Phases** | `game-types.ts:12-19` `enum Phase` | `waiting`, `role`, `night`, `discussion`, `vote`, `endGame` | Low. Proper enum. Client maps `endGame`→`results` at `gameStore.ts:186`, routes at `GlobalPhaseRouter.tsx:5-12`. Never displayed raw; phase labels are separate hard-coded JSX (`NightPhase.tsx:245`, `Discussion.tsx:194`, `Vote.tsx:80`). |
| **Action types** | Per-role string literals, e.g. `Werewolf.ts:7` `type: "werewolf"`; `Seer.ts:6-9` `enum SeerActionType` | `"werewolf"`, `"minion"`, `"clone"`, `"seer_player_role"`, `"seer_ground_roles"`, … | **Low, and this is a real seam.** These are a *separate* namespace from role names, are never displayed, and are the correct thing to key logic on. They happen to look like lowercased role names but are not derived from them. |
| **Socket events** | `packages/shared/src/socket-events.ts:1-37` | 20 client + 10 server | None. Properly centralised, never displayed. |
| **Win conditions** | Not named. Implicit in `VoteResolver.calculateResults` (`:24-91`) | — | Returns a `Team`, which the client then mis-handles. |
| **Vote sentinel** | The literal `"noWerewolf"` | occupies the same slot as a `PlayerId` | Medium. Appears at 8 backend sites and 3 frontend sites. Converted to the display string `"No Werewolf"` at `Game.ts:645`. A werewolf-flavoured magic value that will outlive the theme unless renamed. |

---

## 5. Text inventory (Section C)

### 5.1 i18n framework

**None.** No `i18next`, `next-intl`, `react-intl`, `formatjs`, or custom translation hook in either `package.json` or anywhere in source. Adoption is 0%; 100% of strings bypass any framework because none exists.

**However, conversion has already begun ad hoc.** `Front-End/src/pages/HomePage.tsx` contains 5 hard-coded Egyptian-Arabic strings: `:22` (lore), `:25` (ability), `:235` `ابدا لعب`, `:246` `خش الحارة`, `:250` `ازاي تلعب`. It is the only file in the repo containing Arabic. These sit inline in JSX exactly the way the English strings do — no abstraction was introduced.

### 5.2 Category table

Counts are from mechanical grep of `Front-End/src` and `Back-End/src`; treat them as ±10% (a heuristic cannot perfectly separate a UI string from a CSS class name).

| Category | Count | Representative citations |
|---|---|---|
| JSX text nodes (literal text between tags) | 156 | `HowToPlay.tsx` (20), `RoleReveal.tsx` (19), `NightPhase.tsx` (14), `Discussion.tsx` (13), `Vote.tsx` (9) |
| Display strings inside JSX expressions (`{cond ? "A" : "B"}`) | ~85 | `WerewolfAction.tsx:187,192,199,208`; `RobberAction.tsx:210,215,220,227,230-233`; `InsomniacAction.tsx:76-89` |
| Button / control labels | ~45 | `WaitingRoom.tsx:278,282,285`; `RoleReveal.tsx:174,187,209,265`; `Results.tsx:183,194`; `Vote.tsx:104,141,158,161` |
| `placeholder=` | 6 | `HomePage.tsx:407,426,427,446,464,465` |
| `aria-label=` | 12 | `HomePage.tsx:216,220,343,395`; `WaitingRoom.tsx:213,223,258,263`; `RoleReveal.tsx:137,146`; `NightPhase.tsx:249`; `Discussion.tsx:190` |
| `alt=` | 26 | `RoleReveal.tsx:162,166`; `WerewolfAction.tsx:149,152,172,175`; `SeerAction.tsx:240,243,276,279` |
| `title=` attribute | 1 | `WaitingRoom.tsx:51` (`"Measuring..."` / `` `Signal: ${…}` ``) |
| **Role names / lore / ability / flavour (frontend data)** | **12 roles × 5 fields = 60** | `characters.ts:38-183` — `name`, `team`, `title`, `description`, `ability` per role |
| **Role descriptions (backend data, sent to client)** | **12** | `Werewolf.ts:18`, `Seer.ts:40`, `Minion.ts:18`, `Clone.ts:24`, `Drunk.ts:20`, `Insomniac.ts:18`, `Joker.ts:20`, `Mason.ts:18`, `Oracle.ts:18`, `Robber.ts:20`, `Troublemaker.ts:22`, `Warlock.ts:20` |
| Rules / how-to-play / onboarding | ~55 | `HowToPlay.tsx:93-215` (5 numbered steps, 3 win conditions, 12 character abilities, 3 notes) |
| Phase-info modals (4 of them, near-identical structure) | ~40 | `RoleReveal.tsx:226-261` (5 items), `NightPhase.tsx:300-335` (5 items), `Discussion.tsx:260-281` (3 items) |
| Phase / status labels | ~30 | `NightPhase.tsx:234,245,247`; `Discussion.tsx:194,239`; `Vote.tsx:74,80,81,122`; `RoleReveal.tsx:111,112,151,152,154`; `WaitingRoom.tsx:222,229,238` |
| Modals / confirmations | ~25 | `WaitingRoom.tsx:294,296,314,334`; `Vote.tsx:152,154,158,161`; `RoleReveal.tsx:197,198,210` |
| Client-side validation errors | 7 | `HomePage.tsx:131,145,154,166,179`; `WaitingRoom.tsx:183,187` |
| Client fallback/placeholder values | 6 | `WaitingRoom.tsx:70` `"Unknown"`; `NightPhase.tsx:69,247` `"Unknown"`; `Vote.tsx:14,63` `"Unknown"`; `CloneAction.tsx:131` `"Player"` |
| **Server-originated prose — `message:` fields** | **~33 (excluding logger)** | See §5.3 |
| **Server-originated prose — thrown `Error` messages** | **67 throw sites, ~58 distinct literals** | See §5.3 |
| Server centralised error strings | 12 | `packages/shared/src/game-constants.ts:28-41` |
| Server API response messages | 4 | `gameController.ts:14,178`; `app.ts:40,47`; `Manager.ts:52` |
| Server socket notification messages | 3 | `Game.ts:187` (`"You have been removed from the game"`), `Game.ts:242` (host transfer), `voiceHandlers.ts:12,18,30` |
| **Random player-name pool** | **12 English joke names** | `Back-End/src/socket/socketHandlers/gameHandlers.ts:7` — includes `"Honor Hitler"`, `"Master Baiter"`, `"BenDover69"`, `"Nora Ganzer"`. Assigned automatically to any player who joins without a name (`:36,41`). Fallback is `` `Wolf${n}` `` (`:13`). |
| Share text | 2 | `ShareButton.tsx:12` `` `Join my Werewolf game! Code: ${…}` ``, `:20` `"Werewolf Game"` |
| `<title>` / meta / manifest | 5 | `index.html:13` `<title>Werewolf</title>`; `manifest.json:2,3` `"name"`/`"short_name"` = `"Werewolf"`; `index.html:7` theme-color; `index.html:5` favicon → `/vite.svg` (the stock Vite logo) |
| Email/SMS | 0 | None exist. |
| Constants / config / seed data | see above | `game-constants.ts` is the only constants file with user-facing text. |

**Total user-visible English strings: roughly 480–520.** No shared package holds them; they are scattered across 30 frontend files and 20 backend files.

### 5.3 Server-originated prose — flagged separately, this is the missed category

The backend does not send codes. It sends **finished English sentences that the frontend renders verbatim**, with no structured fallback.

**Night-action result messages** — every role action returns a `message` string that the client displays as-is (`Discussion.tsx:182,230`, `Results.tsx:151`, and the per-role `*Action.tsx` components):

| File:line | String |
|---|---|
| `Werewolf.ts:36` | `` `The other Werewolves are: ${names}` `` |
| `Werewolf.ts:48` | `` `You are alone. You saw a ${groundCard.name} on the ground` `` |
| `Minion.ts:34` | `` `The Werewolves are: ${names}` `` / `"There are no Werewolves among the players. All Werewolves are on the ground."` |
| `Seer.ts:75` | `` `${targetPlayer.name} is a ${targetRole.name}` `` |
| `Seer.ts:95` | `` `You saw ${groundRole1.name} and ${groundRole2.name} on the ground` `` |
| `Robber.ts:57` | `` `You stole the ${stolenRole.name} role` `` |
| `Troublemaker.ts:62` | `` `You swapped ${p1.name} and ${p2.name}'s roles` `` |
| `Drunk.ts:54` | `"You swapped your role with a ground card"` |
| `Insomniac.ts:38` | `` `Your role changed from ${a} to ${b}` `` / `` `Your role is still ${b}` `` |
| `Joker.ts:50` | `` `You saw a ${groundRole.name} on the ground` `` |
| `Warlock.ts:64` | `` `You swapped ${targetPlayer.name}'s role with a random ground card` `` |
| `Mason.ts:39` | `` `You see ${names} as fellow Mason(s)` `` / `"You are the only Mason"` |
| `Clone.ts:62,68,74,80,86,92,119` | **7 distinct sentences**, each naming a role |
| `Oracle.ts:47,75,80,82,89,91,96,99,101,106,108,114,117,122,124,129,131,135,140,141,146,148,153,155,159` | **`buildVisionMessage` (`:69-160`) is 25 hand-written English sentences in a 12-arm switch on role name.** Every arm hard-codes `The Werewolf …`, `The Seer …`, etc. |
| `NightPhaseManager.ts:407,439` | Clone-Mason / Clone-Insomniac duplicates of the above |
| `NightPhaseManager.ts:326,327` | `"Action was auto-performed"` (catch-all on error) |
| `NightPhaseManager.ts:315` | `"No action performed"` |
| `VoteResolver.ts:107` | `"Performed their action"` (action-history fallback) |
| `Game.ts:645` | `"No Werewolf"` — a display string built server-side into `resultsVotes` |
| `Game.ts:626` | `` `Ground Card ${i+1}` `` — a display label built server-side into `groundCards` |
| `Clone.ts:102` | `` `Ground Card ${index+1}` `` — the same label, duplicated |

**Error messages reaching the client.** 67 `throw new Error(...)` sites. `safeHandler` (`shared.ts:21-34`) catches each and emits `socket.emit("error", { message: error.message })` (`:31`) — i.e. **raw internal English exception text is transmitted to the browser**, including strings like `Player with id ${id} not found` (`Game.ts:266`) and `` `Invalid action for Werewolf. Expected 'werewolf', received '${action.type}'.` `` (`Werewolf.ts:27`). The client's handler (`sockets.ts:98-100`) only `console.error`s them, so today none are displayed — but the pipe exists and is fully English.

### 5.4 Strings assembled by concatenation — full list

These break under Arabic word order and need restructuring, not translation.

**Frontend:**
| File:line | Expression |
|---|---|
| `WaitingRoom.tsx:133` | `` `${notReadyCount} player(s) not ready yet` `` |
| `WaitingRoom.tsx:201` | `` `NEED ${needMore} MORE` `` and `` `${notReadyCount} NOT READY` `` |
| `WaitingRoom.tsx:51` | `` `Signal: ${["","Poor","Fair","Good","Great"][level]}` `` |
| `WaitingRoom.tsx:238` | `PLAYERS {players.length}/12` (JSX-interleaved) |
| `Vote.tsx:83` | `{totalVoted} / {totalPlayers} voted` (JSX-interleaved) |
| `Vote.tsx:141` | `` `FORCE VOTES (${missingVotes} missing)` `` |
| `Vote.tsx:154` | `<span>{missingVotes}</span> player{…} haven't voted yet.` — number, plural suffix and sentence all interleaved in JSX |
| `RoleReveal.tsx:154` | `Waiting for other players ({countdown}s)` |
| `RoleReveal.tsx:130-134` | `{readyCount}` `/` `{totalCount}` split across three `<span>`s |
| `SeerAction.tsx:300` | `` `${selectedGroundIds.length}/2 ground cards selected` `` |
| `SeerAction.tsx:304` | `` `You saw ${actionResult.playerName}'s role` `` — English possessive `'s` |
| `RobberAction.tsx:233` | `` `You are now the ${newRole}` `` |
| `ShareButton.tsx:12` | `` `Join my Werewolf game! Code: ${gameCode.toUpperCase()}` `` |
| `Results.tsx:147-149` | role · `—` · playerName assembled from three `<span>`s |
| `HowToPlay.tsx:176` | `×{r.count}` |
| `HowToPlay.tsx:187-189` | `{e.player} player` `→` `{e.role}` |
| `HowToPlay.tsx:137-148` | 3 win-condition lines, each a `<span>TEAM</span>` followed by a bare sentence fragment (`wins if a Werewolf is eliminated.`) |
| `Discussion.tsx:15` | `` `${mins}:${secs.padStart(2,"0")}` `` |

**Backend** — every `message` and `Error` template in §5.3 is a concatenation. The worst offenders for word order:
- `Seer.ts:75` `` `${name} is a ${role}` `` — copula + indefinite article
- `Troublemaker.ts:62` `` `You swapped ${a} and ${b}'s roles` `` — English possessive across a conjunction
- `Oracle.ts:80` `` `The Werewolf saw that ${names} ${plural ? "are Werewolves" : "is also a Werewolf"}.` `` — verb agreement selected by count and spliced mid-sentence
- `Game.ts:242` `` `${oldName} disconnected. You are now the host!` ``
- `Game.ts:110` `` `Game is full, max players is ${max}` ``

### 5.5 Pluralization and number agreement — full list

Arabic has six plural categories (zero / one / two / few 3–10 / many 11–99 / other 100+). Every one of these uses binary `n===1` logic or none at all, and every one will be wrong:

| File:line | Code | Failure |
|---|---|---|
| `Vote.tsx:154` | `player{missingVotes !== 1 ? "s" : ""}` | Binary English plural. Needs 6 forms. |
| `WaitingRoom.tsx:133` | `player(s)` | Parenthetical dodge; has no Arabic equivalent. |
| `Mason.ts:39` and `NightPhaseManager.ts:407` | `` `as fellow Mason(s)` `` | Same dodge, server-side, **duplicated in two files**. |
| `Oracle.ts:80` | `wolves.length > 1 ? "are Werewolves" : "is also a Werewolf"` | Verb + noun agreement on a binary. Arabic needs dual as a distinct case. |
| `WaitingRoom.tsx:201` | `` `NEED ${needMore} MORE` `` | No plural handling; the counted noun is elided entirely. |
| `Vote.tsx:141` | `` `(${missingVotes} missing)` `` | Same. |
| `HowToPlay.tsx:99` | `"You need at least 6 players to start."` | Hard-coded numeral inside a sentence; also **hard-codes 6** rather than reading `MIN_PLAYERS`. |
| `HowToPlay.tsx:107,171,195` | `"3 extra cards"`, `"6 PLAYERS + 3 GROUND"`, `"3 more cards than players"` | Numerals baked into prose. |
| `WaitingRoom.tsx:238` | `PLAYERS {n}/12` | **Hard-codes 12** rather than reading `MAX_PLAYERS` from shared. |
| `HowToPlay.tsx:24-29` | `"7th"`, `"8th"`, `"9th"`, `"10th"`, `"11th"`, `"12th"` | English ordinal suffixes. Arabic ordinals are gendered words, not suffixes. |

### 5.6 Locale-sensitive number/time formatting

**There is none — anywhere.** Zero uses of `Intl.*`, `toLocaleString`, `toLocaleDateString`, or `toLocaleTimeString` in either `Front-End/src` or `Back-End/src`. All numbers render as Western (ASCII) digits via default `toString`. Timer formatting is manual string building (`Discussion.tsx:12-16`). No decision about Arabic-Indic (٠١٢٣) vs Western (0123) numerals exists in the code — this is an unmade decision, not a wrong one.

---

## 6. RTL readiness (Section D)

### 6.1 Document direction

- `Front-End/index.html:2` — `<html lang="en">`. **No `dir` attribute anywhere in the repo.**
- The document root is `Front-End/index.html`; React mounts into `#root` (`src/main.tsx:6`). Nothing sets `dir` at runtime.
- The only `direction` declarations in 8,420 lines of CSS are `HomePage.css:108` and `HomePage.css:221` — both `direction: rtl`, scoped to `.home-action-asset-text` and `.home-panel-text`, added to make the new Arabic strings render. This is the pattern to avoid repeating 200 times.

### 6.2 Physical vs logical properties — counts

| Property | Physical count | Logical equivalent count |
|---|---|---|
| `margin-left` | 1 | — |
| `margin-right` | 2 | — |
| `padding-left` | 0 | — |
| `padding-right` | 0 | — |
| `text-align: left` | 2 | — |
| `text-align: right` | 3 | — |
| `border-left` | 2 | — |
| `border-right` | 2 | — |
| bare `left:` (absolute positioning) | 27 | — |
| bare `right:` (absolute positioning) | 6 | — |
| `float` | 0 | — |
| `transform: translateX` | 27 | — |
| **`margin-inline` / `padding-inline` / `inset-inline` / `border-inline` / `text-align: start|end`** | — | **0** |
| `text-align: center` (direction-neutral) | 35 | — |

**Total physical directional declarations needing conversion: 12** (`margin-*`, `padding-*`, `border-*`, `text-align`). This is remarkably low for a 8.4k-line CSS codebase and is the single cheapest part of this conversion.

Their locations, in full:

| File:line | Declaration |
|---|---|
| `HowToPlay.css:208` | `margin-right: 4px` |
| `HowToPlay.css:239` | `text-align: right` |
| `HomePage.css:952` / `:953` | `margin-left: auto` / `margin-right: auto` (centring pair — direction-neutral in effect) |
| `HomePage.css:1051` | `text-align: left` |
| `NightPhase.css:142` | `text-align: right` |
| `Results.css:219` | `text-align: right` |
| `WaitingRoom.css:94` / `:95` | `border-left` / `border-right` (symmetric pair) |
| `WaitingRoom.css:829` / `:830` | `border-left: none` / `border-right: none` (symmetric pair) |
| `RoleActions.css:90` | `text-align: left` |

The 27 bare `left:` and 27 `translateX` are a different problem: the great majority are **`left: 50%; transform: translateX(-50%)` centring idioms** (e.g. `HomePage.css:104-107,217-218`), which are direction-neutral and need no change. The remainder are the circle/carousel positioning discussed below. They live in `HowToPlay.css`, `NightPhase.css`, `Discussion.css`, `RoleReveal.css`, `HomePage.css`, `InsomaniacAction.css`, `OracleAction.css`, `TroublemakerAction.css`, `shared/RoleShared.css`.

### 6.3 Layouts that depend on reading order

| Thing | Location | Behaviour under `dir="rtl"` |
|---|---|---|
| **Player circle** | `Front-End/src/utils/roleHelpers.ts:27-48` | Positions computed with `Math.cos/sin` from angle `270° + i·step` — self at top, then **clockwise**. Absolute `left`/`top` percentages applied inline (`RobberAction.tsx:169-170`, `TroublemakerAction.tsx:176-177`, `WarlockAction.tsx:145-150,202-203`, and 5 other action components). `dir` will not flip this; seating order stays clockwise unless the angle formula is inverted. Whether it *should* flip is a design call. |
| **Night role progress strip** | `NightRoleProgress.tsx:50-58` | Horizontal scroller, auto-centres the active role with `container.scrollTo({ left: scrollTarget })` computed from `offsetLeft`. **`scrollLeft` semantics differ across browsers in RTL** (negative vs. reversed origin). This will visibly misbehave. |
| **Character carousel** | `HomePage.tsx:341,393` | `gridRef.current?.scrollBy({ left: ±200 })`, driven by buttons classed `carousel-arrow--left` / `--right`. Same `scrollLeft` problem, plus the arrows point the wrong way. Currently inside the `display:none` block (§12) but the code is live. |
| **Swipe gesture** | `HomePage.tsx:196-211` | `swipeDistance < 0 ? next : prev`. Hard-coded LTR swipe semantics; must invert for RTL. |
| **Discussion timer ring** | `Discussion.tsx:203-206` | SVG `strokeDashoffset` on a circle — fills in a fixed rotational direction. Direction-neutral by convention but worth a design decision. |
| **Night action timer bar** | `NightPhase.tsx:258` | `transform: scaleX(fraction)` on a fill element. **Scales from the element's left edge** under default `transform-origin: 50%`… actually 50%, so it shrinks toward centre. Under RTL this reads oddly either way; needs an explicit `transform-origin`. |
| **Vote/player list stagger** | `Vote.tsx:93,129`, `WaitingRoom.tsx:246` | `animationDelay` by index — order-dependent but not direction-dependent. Fine. |
| **Step indicators** | `HowToPlay.tsx:96-132` | Numbered 1–5 with `htp-step-num` badges; `HowToPlay.css:208` `margin-right: 4px` is the one physical property here. |

### 6.4 Directional icons and imagery that must mirror

| Icon | Location | Notes |
|---|---|---|
| `→` (rightwards arrow) | `Results.tsx:171` (voter → target), `HowToPlay.tsx:188` (player → role) | Must become `←`. Both are semantic direction-of-flow arrows. |
| `▲` / `▼` (disclosure) | `Discussion.tsx:218`, `Results.tsx:135,164` | Vertical — no mirroring needed. |
| `⋮` (kebab menu) | `WaitingRoom.tsx:259,264` | Vertical — fine. |
| Chevron-left SVG | `HomePage.tsx:346` `polyline points="15 18 9 12 15 6"` | Must mirror. |
| Chevron-right SVG | `HomePage.tsx:398` `polyline points="9 6 15 12 9 18"` | Must mirror. |
| Share/upload SVG | `ShareButton.tsx:60-64` | Vertical arrow — fine. |
| Checkmark SVG | `ShareButton.tsx:53-55` | Fine. |
| Gear SVG | `WaitingRoom.tsx:214-217` | Fine. |
| Users SVG | `RoleReveal.tsx:138-143` | Asymmetric (two figures, one behind-right) — cosmetic, optional mirror. |
| `✓` / `✕` | `WaitingRoom.tsx:282,336`; `Vote.tsx:132`; `RoleReveal.tsx:222`; `NightPhase.tsx:296`; `Discussion.tsx:256` | Fine. |
| Emoji `💀`, `☽` | `RoleReveal.tsx:196`, `HowToPlay.tsx:67` | Fine, but `☽` is a werewolf-theme artefact. |

**No back-button or send-icon exists** — the app has no back navigation; every escape is a "LEAVE" text button (`RoleReveal.tsx:187`, `NightPhase.tsx:355`, `Vote.tsx:177`, `Discussion.tsx:301`, `WaitingRoom.tsx:285`).

### 6.5 Animations with a directional component

27 `translateX` uses across `HomePage.css` (14), `WaitingRoom.css` (5), `shared/RoleShared.css` (4), `Vote.css` (2), `RoleReveal.css` (1), `DrunkAction.css` (1). Most are the `-50%` centring idiom. Any that are slide-in entrances will play from the wrong side under RTL; these need auditing individually when the `dir` flip is made — the counts above tell you the search space is ~27 declarations in 6 files, not hundreds.

### 6.6 Third-party UI components

**Only one, and it is safe:** `lucide-react@0.577.0`, used for exactly two icons — `Crown` and `CircleHelp` (`WaitingRoom.tsx:3,224,251`). Both are rotationally symmetric. There is no component library (no MUI, Radix, Chakra, Headless UI) whose RTL behaviour you would have to fight. Every other icon is inline SVG you control (7 `<svg>` blocks across the frontend).

### 6.7 Font stack

`Front-End/index.html:10-11` loads **two** Google Fonts stylesheets — the second is a superset of the first, so line 10 is redundant:
- Line 10: `Cinzel` (400–900), `Lexend` (100–900)
- Line 11: `Alyamama` (300–900), `Cinzel`, `DynaPuff` (400–700), `Lexend`

Tokens (`index.css:29-30`): `--font-display: "Alyamama", sans-serif`; `--font-body: "Lexend", sans-serif`.

**`Alyamama` is an Arabic typeface and is already the display font throughout the app** (~60 `font-family: var(--font-display)` declarations). Someone has already done this work. `Cinzel` and `DynaPuff` are loaded but **never referenced by any CSS rule** — dead weight in the critical path.

Two problems:
1. `index.css:42` sets `body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }` — the body ignores both tokens. Any text that doesn't explicitly set `--font-display`/`--font-body` falls through to the system stack, whose Arabic coverage varies by device. On Android this is a real rendering-quality risk.
2. **No `font-display` strategy, no preload, no local fallback.** Both stylesheets are render-blocking `<link rel="stylesheet">` in `<head>`. Arabic webfonts are substantially heavier than Latin ones (larger glyph set, contextual forms). On the mobile-first audience this is a measurable first-paint regression that nothing currently mitigates. Whether `Alyamama` actually resolves on Google Fonts — **UNKNOWN, I could not verify without a network request.**

### 6.8 Places where Latin text metrics are assumed

| Location | Assumption |
|---|---|
| `index.css:52-60` | `#root` is locked to a **430×932 phone frame** with `aspect-ratio: 430/932`, `max-height`, and **`overflow: hidden`**. Every screen is designed to fit exactly. Arabic text is typically 20–30% longer than English for the same content, and there is nowhere for it to go — it will be clipped, not scrolled. **This is the biggest RTL/i18n risk in the CSS.** |
| `index.css:45` | `body { overflow: hidden }` — reinforces the above at document level. |
| `HomePage.css:104-119`, `:215-230` | `.home-action-asset-text` and `.home-panel-text` are absolutely positioned overlays on top of button/panel images, with **`white-space: nowrap`** (`:117`) and a fixed `width: 82%`/`76%`. Text longer than the image is clipped with no wrap and no ellipsis. |
| `WaitingRoom.tsx:238` | `PLAYERS {n}/12` in a fixed-width row. |
| All-caps labels (~60 sites, e.g. `WaitingRoom.tsx:222,229`, `Vote.tsx:80`) | Arabic has no letter case. Every `text-transform`/manual-uppercase label loses its visual weight distinction and needs a different typographic treatment (weight, size, or colour). `HomePage.tsx:324` calls `.toUpperCase()` on a role name in JS — a no-op on Arabic. |
| `NightPhase.tsx:247` | `myNightRole.toUpperCase()` — same. |
| `WaitingRoom.tsx:231` | `gameCode?.toUpperCase()` — fine (codes stay Latin). |
| `text-overflow` / character-count truncation | **None found.** No `text-overflow: ellipsis` anywhere, no `.slice()`-based truncation of display strings. Text simply overflows and is clipped by the frame. |

### 6.9 Existing Arabic-Indic vs Western numeral decisions

**None.** No such decision is encoded anywhere. All numerals are Western ASCII by default.

---

## 7. Asset inventory (Section E)

### 7.1 Full inventory

**`Front-End/src/assets/` — 65 files, ~12.9 MB.** Bundled via ES import (Vite fingerprints and inlines/copies them).

*Role card art — full size (`*_card.webp`), 12 files:*

| File | Size | Dimensions | Referenced from |
|---|---|---|---|
| `werewolf_card.webp` | 81 KB | 808×1224 | `characters.ts:275,314` |
| `minion_card.webp` | 88 KB | 808×1224 | `characters.ts:276,317` |
| `Seer_card.webp` | 80 KB | 808×1224 | `characters.ts:277,318` (**capital S filename**) |
| `robber_card.webp` | 75 KB | 808×1224 | `characters.ts:278,319` |
| `troublemaker_card.webp` | 332 KB | 1684×2528 | `characters.ts:279,321-324` |
| `mason_card.webp` | 74 KB | 808×1224 | `characters.ts:280,326` |
| `drunk_card.webp` | 252 KB | 1750×2432 | `characters.ts:281,327` |
| `insomaniac_card.webp` | 258 KB | 1684×2528 | `characters.ts:282,328-333` (**misspelt "insomaniac"**) |
| `clone_card.webp` | 239 KB | 1684×2528 | `characters.ts:283,334` |
| `joker_card.webp` | 271 KB | 1684×2528 | `characters.ts:284,335` |
| `warlock_card.webp` | 85 KB | 856×1152 | `characters.ts:285,336-341` |
| `oracle_card.webp` | 79 KB | 856×1152 | `characters.ts:286,342` |

*Role card art — small (`*_card_small.webp`), 12 files:* 53–115 KB each, 832×1248 (or 856×1152 for warlock/oracle). Imported `characters.ts:288-299`, used as `CardData.small`. **`warlock_card.webp` and `warlock_card_small.webp` are byte-identical in size (84,866) — almost certainly the same file duplicated**; same for `oracle_card_small.webp` (84,866).

*Role portraits — square (`*_square.webp`), 12 files:* 57–132 KB, **1024×1024** (clone is 1024×1536). Imported `characters.ts:2-25`, used for the circle layout and grid via `roleHelpers.getSquareImage` (`:5-7`).

*Role portraits — full body (`*_2d.webp`), 12 files:* 28–383 KB, **256×256** (oracle is 152×100). Imported `characters.ts:2-25`, used as `CharacterData.fullBody` on the home showcase (`HomePage.tsx:313`) — **which is inside the `display:none` block**, so they are loaded (and eagerly preloaded, `characters.ts:347-356`) but never seen.

*Chrome / branding:*

| File | Size | Dim | Referenced from | Note |
|---|---|---|---|---|
| `back_card.webp` | 67 KB | 848×1200 | `characters.ts:274,308` | Card back — generic |
| `bg_waiting.webp` | 59 KB | 744×1328 | 7 CSS files: `Discussion.css:472`, `JoinPage.css:8`, `NightPhase.css:472`, `Results.css:410`, `RoleReveal.css:548`, `WaitingRoom.css:825`, `Vote.css:423` | Shared background |
| `background.webp` | 45 KB | 173×136 | `HomePage.css:10` | **New (untracked)** |
| `logo.webp` | 163 KB | 202×152 | `HomePage.tsx:12,219` | **New.** حارتنا on a hanging wooden sign — **Arabic text baked in** |
| `button.webp` | 214 KB | 185×11 | `HomePage.tsx:14,234,245,249` | **New.** Blank button plate; text overlaid in CSS ✓ |
| `lore.webp` | 51 KB | 118×174 | `HomePage.tsx:16,263` | **New.** Blank parchment; text overlaid ✓ |
| `ability.webp` | 69 KB | 47×146 | `HomePage.tsx:17,268` | **New.** Blank leather plate; text overlaid ✓ |
| `character.webp` | 473 KB | 235×232 | `HomePage.tsx:15,19` | **New.** Home character panel |
| `settings.webp` | 68 KB | 171×210 | `HomePage.tsx:11,217` | **New.** Gear icon |
| `account.webp` | 86 KB | 26×61 | `HomePage.tsx:13,221` | **New.** Account icon |

*Orphaned in `src/assets/` — imported by nothing:* `ability1.webp` (112 KB), `button1.webp` (90 KB), `character2.webp` (187 KB), `team.webp` (101 KB), `background - Copy.webp` (45 KB), `image (18).jpg` (145 KB, 864×1200), `warlock_2d.png` (**2.5 MB**, 1024×1536 — the PNG source of the `.webp` beside it).

**`Front-End/public/` — 16 files, ~5.5 MB**, copied verbatim to the deploy root:

| File | Size | Dim | Referenced? |
|---|---|---|---|
| `icon-192.png` | **1.07 MB** | **1000×1000** | `manifest.json:11` declares `"sizes": "192x192"` — **the declaration is a lie; the file is 1000×1000 and 1 MB** |
| `icon-512.png` | **1.23 MB** | **1000×1000** | `manifest.json:16` declares `512x512` — same problem |
| `manifest.json` | 388 B | — | `index.html:6` |
| `vite.svg` | 1.5 KB | — | `index.html:5` — **the app's favicon is the stock Vite logo** |
| `assets/backgrounds/village.png` | **2.5 MB** | 1536×1024 | **Nothing.** |
| `assets/units/werewolf.png` | 256 KB | 408×612 | **Nothing.** |
| `assets/units/seer.png` | 181 KB | 408×612 | **Nothing.** |
| `assets/units/robber.png` | 167 KB | 408×612 | **Nothing.** |
| `assets/units/troublemaker.png` | 168 KB | 408×612 | **Nothing.** |
| `assets/units/minion.png` | 128 KB | 612×408 | **Nothing.** |
| `assets/units/Jocker.png` | 156 KB | 408×612 | **Nothing.** (sic — "Jocker") |
| `assets/units/hunter.png` | 159 KB | 408×612 | **Nothing.** No Hunter role exists in this codebase. |
| `assets/units/tanner.png` | 167 KB | 408×612 | **Nothing.** No Tanner role exists in this codebase. |
| `assets/units/villager1-3.png` | 3×~139 KB | 408×612 | **Nothing.** No Villager role exists. |

`Front-End/src/react.svg` — orphaned React logo. `Front-End/dist/` exists on disk (gitignored build output).

**Sound / video: none.** No `.mp3`, `.wav`, `.ogg`, `.mp4` anywhere in the repo.

### 7.2 How assets are referenced

Three mechanisms, all fine, none derived from IDs:

1. **Static ES imports resolved by array lookup** — the dominant pattern. `characters.ts:2-25` and `:274-299` import 37 images at module scope; components find them with `Array.find` on `name` (`roleHelpers.ts:5,11`) or on `id` (`NightRoleProgress.tsx:22,27`, `RoleReveal.tsx:20`, `CloneAction.tsx:42,47`).
2. **CSS `url()` relative paths** — `bg_waiting.webp` in 7 files, `background.webp` in `HomePage.css:10`, plus one inline data-URI SVG noise texture (`HomePage.css:263`).
3. **Direct component imports** for the new home-screen chrome (`HomePage.tsx:11-17`).

**There is no `/img/${role}.png` pattern anywhere.** Confirmed by grep. Renaming roles cannot break an asset path.

### 7.3 Role-specific vs generic vs branding

- **Role-specific (48 files):** `*_card`, `*_card_small`, `*_square`, `*_2d` × 12 roles.
- **Generic chrome (8):** `back_card`, `button`, `lore`, `ability`, `settings`, `account`, `character`, `background`.
- **Branding (4):** `logo.webp`, `icon-192.png`, `icon-512.png`, `vite.svg`.
- **Background (2):** `bg_waiting.webp`, `background.webp`.

### 7.4 Borrowed / third-party werewolf art — blocking

**`Front-End/public/assets/units/*.png` and `backgrounds/village.png` are, on the evidence in the repo, third-party One Night Ultimate Werewolf card art.** The tell: the set includes **`hunter.png` and `tanner.png`** — two canonical ONUW roles that **do not exist anywhere in this codebase** — plus three `villager*.png`, also absent. They are uniformly 408×612 (a standard playing-card aspect) and were clearly imported as a set from an external source rather than authored for this game. `village.png` at 1536×1024/2.5 MB matches. **All 12 are referenced by nothing** and can be deleted today with zero risk.

**For `src/assets/*` I cannot determine provenance from the repo.** There is no license file, no attribution, no source note, and no metadata I can read. What I *can* say from opening them: `werewolf_card.webp` and `seer_card_small.webp` are in **two visibly different art styles** (ornate silver-on-black vs. flat blue-on-navy), and `werewolf_card.webp` contains malformed letterforms ("WEREWOLF" with distorted glyphs) characteristic of generative image output. That is consistent with placeholder/borrowed art but is not proof. See §14 and §15.

### 7.5 Assets with English text baked into the image — these need redrawing, not swapping

**Confirmed by opening the files:**

- `werewolf_card.webp` — contains the painted title **"WEREWOLF"** and the painted ability text **"Know The Other Werewolves / or / Peek at 1 Ground Card"**. The lettering is already malformed.
- `seer_card_small.webp` — contains the painted title **"SEER"**.

**Generalising from those two** (I did not open the other 22, and say so): the 12 `*_card.webp` and 12 `*_card_small.webp` files — **24 assets** — carry role names, and in at least some cases full ability sentences, as pixels. These are the images shown on the role-reveal card flip (`RoleReveal.tsx:118,166`) and in every card modal (`CardModal.tsx:45`). **They cannot be translated by editing code, and they cannot be swapped for the same art with different text. They must be redrawn.** This is the blocking path of the whole conversion.

**Confirmed clean (no baked text):** `joker_square.webp` — pure portrait. Generalising, the 12 `*_square.webp` and 12 `*_2d.webp` portraits should be safe to replace 1-for-1. `lore.webp` and `ability.webp` are deliberately blank plates with text overlaid in CSS (`HomePage.tsx:263-269`) — **this is the right pattern and it already exists in this repo.**

**Already-Arabic assets:** `logo.webp` (حارتنا) and the orphaned `team.webp` (فريق الحرامية — "the thieves' team") have Arabic baked in. `team.webp` proves someone has already picked Arabic faction naming — but it is wired to nothing.

### 7.6 Existing icon system

Effectively none. `lucide-react` is installed but used for exactly 2 icons in 1 file (`WaitingRoom.tsx:3`). Everything else is 7 hand-written inline `<svg>` blocks plus Unicode glyphs (`✓ ✕ ▲ ▼ → ⋮ ☽ 💀`). No SVG sprite, no icon font.

### 7.7 Where an asset manifest would live — the natural seam

`Front-End/src/characters.ts` **already is one**, in three parts:
- `characters[]` (`:38-183`) — id, name, team, title, description, ability, square, fullBody
- `cardStyleMap` (`:193-254`) — per-role frame/panel/border colours
- `allCards[]` (`:310-343`) — id, name, image, small

It is 356 lines mixing image imports, display copy, colour tokens, a lookup helper (`getGameCardData`, `:257-269`), and an eager-preload side effect (`:347-356`) — but the seam is real and singular. **Every role-facing image and every role-facing string on the client resolves through this one file.** The only client code that reaches around it is `HowToPlay.tsx:11-45` (four duplicate lists) and the 12 `*Action.tsx` components that hard-code their own role slug (e.g. `WerewolfAction.tsx:146` `getFullCardImage("werewolf")`).

---

## 8. Realtime and game flow (Section F)

### 8.1 Transport

**Socket.IO.** Server `socket.io@4.8.3` (`Back-End/package.json:20`), client `socket.io-client@4.8.3` (`Front-End/package.json:17`). Server created at `Back-End/src/server.ts:17-23` with CORS via `resolveCorsOrigin` (`config/cors.ts:20-27`). Client is a **module-level singleton** with `autoConnect: false` and 10 reconnect attempts (`Front-End/src/store/sockets.ts:8-14`); it is private to that module and reached only through the exported `gameActions` object (`:107-168`). No SSE, no polling, no bare WebSocket.

### 8.2 Event catalogue

Names are centralised in `packages/shared/src/socket-events.ts:1-37`; payload types in `socket-types.ts:14-54`.

**Client → Server** (all registered in `Back-End/src/socket/socketHandlers/`, all wrapped in `safeHandler`):

| Event | Payload | Emitter | Handler |
|---|---|---|---|
| `joinGame` | `{gameCode, playerName}` | `sockets.ts:43,108` | `gameHandlers.ts:20` |
| `rejoinGame` | `{gameCode, playerId, playerName}` | `sockets.ts:64,110` | `playerHandlers.ts:8` |
| `leaveGame` | `{gameCode, playerId}` | `sockets.ts:112` | `playerHandlers.ts:82` |
| `startGame` | `{gameCode, playerId}` | `sockets.ts:127` | `gameHandlers.ts:62` |
| `playerReady` | `{gameCode, playerId, ready}` | `sockets.ts:115` | `playerHandlers.ts:101` |
| `confirmRoleReveal` | `{gameCode, playerId}` | `sockets.ts:130` | `gameHandlers.ts:69` |
| `performAction` | `{gameCode, playerId, action: any}` | `sockets.ts:133` | `gameHandlers.ts:74` |
| `vote` | `{gameCode, playerId, votedPlayerId}` | `sockets.ts:136` | `gameHandlers.ts:117` |
| `forceVotes` | `{gameCode, playerId}` | `sockets.ts:142` | `gameHandlers.ts:123` |
| `skipToVote` | `{gameCode, playerId}` | `sockets.ts:139` | `gameHandlers.ts:135` |
| `restartGame` | `{gameCode, playerId}` | `sockets.ts:145` | `gameHandlers.ts:128` |
| `kickPlayer` | `{gameCode, hostId, kickedPlayerId}` | `sockets.ts:118` | `playerHandlers.ts:71` |
| `changeName` | `{gameCode, playerId, newName}` | `sockets.ts:121` | `playerHandlers.ts:47` |
| `settingsUpdate` | `{gameCode, playerId, settings}` | `sockets.ts:124` | `playerHandlers.ts:37` |
| `pingMeasure` | `{gameCode, playerId}` | `sockets.ts:23,148` | `playerHandlers.ts:108` — **no-op stub, returns immediately** |
| `reportPing` | `{gameCode, playerId, ping}` | `sockets.ts:25,151` | `playerHandlers.ts:112` |
| `voiceJoin` / `voiceOffer` / `voiceAnswer` / `voiceIce` / `voiceLeave` | WebRTC signalling | `sockets.ts:154-167` | `voiceHandlers.ts` — **client callers are all commented out** (§12) |

**Server → Client:**

| Event | Payload | Emitter | Handler |
|---|---|---|---|
| `updateGameSnapShot` | `UpdateGamePayload` (§4.5) | `Game.emit()` `Game.ts:592-601`, `playerHandlers.ts:32` | `sockets.ts:68` → `store.hydrate` |
| `error` | `{message: string}` | `shared.ts:31`, `voiceHandlers.ts:12,18,30` | `sockets.ts:98-100` — **`console.error` only** |
| `kicked` | `{message}` | `Game.ts:186-188` | `sockets.ts:92-96` → reset + hard redirect to `/` |
| `hostTransferred` | `{message}` | `Game.ts:241-243` | `sockets.ts:102-104` → `setIsHost(true)`; **the message is discarded** |
| `voiceNewPeer` / `voiceOffer` / `voiceAnswer` / `voiceIce` / `voiceLeave` / `voiceExistingPeers` | WebRTC | `voiceHandlers.ts` | dead |

**There is exactly one meaningful server→client message: a full state snapshot.** Every state change calls `Game.emit()`, which iterates all sockets, filters by room membership, and sends each player a *personalised* snapshot including their private role data (`Game.ts:592-601` → `BuildGameSnapshot(game, socket.playerId)` → `buildPlayerPrivateData`, `:665-691`). This is a clean architecture and a genuinely good seam.

### 8.3 Does the server send display-ready prose?

**Yes, constantly, and this is the highest-volume translation surface.** See §5.3. `actionHistory[].description`, `playerPrivateData.roleDescription`, `playerPrivateData.lastActionResult.message`, `groundCards[].label`, and `resultsVotes[].vote` (which contains the literal `"No Werewolf"`, `Game.ts:645`) are all finished English sentences generated server-side. The client renders them verbatim with no code path to substitute anything.

### 8.4 Where game state lives

**Server-authoritative, client-mirrored.** The `Game` object holds everything (`Back-End/src/entities/game/Game.ts:31-72`). The client store is a pure projection: `gameStore.hydrate(snapshot)` (`gameStore.ts:176-221`) overwrites 26 fields from the snapshot on every message. The client keeps some derived UI state locally (`NightPhase.tsx:82-96`, `Vote.tsx:24-25`) but never authors game state.

**One exception:** `Discussion.tsx:107-159` runs its own countdown from `startedAt`, independent of the server's `setInterval` (`Game.ts:397-406`). Two timers, one truth.

### 8.5 Room / lobby lifecycle

- **Creation:** `POST /api/games/create` → `Manager.createGame()` (`Manager.ts:23-27`) → `new Game(...)` → `generateCode()` (`Game.ts:571-573`). The creating client is not in the game yet; it immediately emits `joinGame` (`HomePage.tsx:150-151`).
- **Join:** `joinGame` → `Manager.joinGame` (`Manager.ts:38-61`) → `Game.playerJoin` (`Game.ts:105-134`) → `socket.join(this.code)`. **First player becomes host** (`Game.ts:124-127`).
- **Reconnection:** `sockets.ts:61-66` — on every `connect`, if the store has `gameCode`+`playerId`+`playerName` it auto-emits `rejoinGame`. `playerHandlers.ts:8-35` matches by `playerId`, then falls back to matching **by name** (`:14`) — a weak identity check.
- **Host migration:** two independent implementations. `Game.disconnectPlayer` (`Game.ts:212-257`) uses a **10-second grace timer** (`disconnectGraceSeconds`, `:74`) before transferring. `shared.ts:transferHostIfNeeded` (`:46-61`) transfers **immediately** and is used by `leaveGame` (`playerHandlers.ts:90`). `Game.kickPlayer` (`:159-194`) has a **third** inline copy, with the comment `// huh again ? how can a host be even kicked ?` (`:167`).
- **Cleanup:** `Manager.startCleanupJob` (`:74-86`) runs every 120 s; deletes ended games 5 min after `endedAt` and non-waiting games idle 30 min (`:97-119`). **`lastActivityAt` is set once in the constructor (`Game.ts:59`) and once on restart (`:546`) — never on actual activity.** The 30-minute orphan rule therefore measures time-since-creation, not idleness.

### 8.6 Room join codes — relevant to Arabic keyboards

`Back-End/src/entities/game/Game.ts:571-573`:
```ts
private generateCode(): string {
  return (this.code = Math.random().toString(36).substring(2, 8));
}
```
**Base-36, 6 characters, lowercase Latin letters + Western digits** (`a-z0-9`). Entry paths:
- Typed into a text input, `maxLength={6}` (`HomePage.tsx:426,464`), then `.toLowerCase()` before send (`HomePage.tsx:173`).
- Displayed **uppercased** (`WaitingRoom.tsx:231`) — so a player reads `A7K2P9` and must type `a7k2p9`; the client lowercases, and the server also lowercases on every lookup (`Manager.ts:30,48,65`). This round-trips correctly.
- Via a share link `/join/:gameCode` (`ShareButton.tsx:11`, `App.tsx:39`, `JoinPage.tsx:15`).
- `substring(2,8)` on a `Math.random()` base-36 string **can produce fewer than 6 characters** when the random value has a short representation, and the server rejects any code whose length ≠ 6 (`gameHandlers.ts:25`). Rare, but a real "game vanishes at creation" bug.

**Arabic-keyboard implication:** a player on an Arabic layout must switch to a Latin layout to type the code. On iOS/Android this is a globe-key tap; on desktop a layout switch. Not blocking, but the code is the single friction point where the UI cannot be Arabic. The share link path avoids it entirely and should be the primary flow.

### 8.7 Phase logic

Phases defined in `packages/shared/src/game-types.ts:12-19`. Advancement is entirely server-side:
`start()` → `Phase.Role` + 30 s timeout (`Game.ts:307-311`) → `startNight()` (`:336-340`) → `NightPhaseManager.startNight()` (`:46-66`) walks `roleQueue` via `advanceToNextRole()` (`:91-188`) with per-role timers → `startDay()` (`Game.ts:388-407`) → `startVoting()` (`:421-429`) → `finish()` (`:477-502`) → `Phase.EndGame`.

The client mirrors phase into routes via `GlobalPhaseRouter` (`:20-27`), which force-navigates whenever `pathname !== /${phase}/${gameCode}`.

### 8.8 Player-name validation — Arabic-safety

| Check | Location | Latin-script assumption? |
|---|---|---|
| Length 2–20 | `playerHandlers.ts:55` (`trimmed.length`), `HomePage.tsx:130,161`, shared `VALIDATION:23-24` | **No charset restriction.** Arabic names pass. `.length` counts UTF-16 units, so Arabic BMP characters count 1 each — correct. Emoji count 2 — a minor miscount, pre-existing. |
| `maxLength={20}` on input | `HomePage.tsx:407,427,446,465`; `WaitingRoom.tsx:315` | Same. |
| Uniqueness | `playerHandlers.ts:59` (`toLowerCase()` comparison), `gameHandlers.ts:39` | `toLowerCase()` is a no-op on Arabic — harmless, but it means Arabic names are compared case-sensitively while Latin ones aren't. Cosmetic inconsistency. |
| Profanity filter | — | **None exists.** |
| Fallback name | `gameHandlers.ts:36,41` → `pickRandomName` (`:9-14`) | **Assigns an English joke name from a 12-entry pool (`:7`) to any player who joins nameless.** One entry is `"Honor Hitler"`. This fires on the share-link path whenever `sessionStorage` has no saved name (`JoinPage.tsx:25-27` passes `""`). |

---

## 9. Persistence (Section G)

**There is no database. There is no ORM. There is no schema. There are no tables or collections.**

- All state is an in-memory array: `Manager.games: Game[]` (`Back-End/src/entities/Manager.ts:8,14,26`). A single process-local `Manager` instance is created at `server.ts:26`.
- **Games do not survive a server restart.** Every in-flight game is lost. On Render's free tier this also means every cold start after idle-spin-down destroys all lobbies. No reconnection logic can recover it — `rejoinGame` throws `Game not found` (`shared.ts:38`) because the `Game` object is gone.
- **Nothing storing role names, display strings, or English content is persisted server-side.** Role names exist only in live objects.
- **Migration mechanism: none, and none is needed.** A role rename implies **zero** data migration on the server.
- **Live production data that a rename would invalidate: none server-side.**

**Client-side persistence does exist and does hold role names:**

| Key | Storage | Written | Contains |
|---|---|---|---|
| `werewolf_game` | `sessionStorage` | `gameStore.ts:224-225` (zustand `persist`) | The **entire** store — including `roleName`, `originalRoleName`, `currentRoleName`, `roleTeam`, `roleDescription`, `lastActionResult`, `playerRoles[]`, `actionHistory[]`. All English role names and prose. |
| `werewolf_playerName` | `sessionStorage` | `HomePage.tsx:134,169`; `sockets.ts:82`; `WaitingRoom.tsx:191` | Player's display name |
| `wr_htp_seen` | `sessionStorage` | `WaitingRoom.tsx:86,162` | Whether the how-to-play hint was dismissed |

`sessionStorage` is per-tab and cleared on tab close, so the blast radius is a single open tab. But a player with a tab open across a deploy will have a stale English role name rehydrated into a renamed game.

**Server-side file writes:** `Back-End/src/utils/Logger.ts:11` writes to `${cwd()}/logs/game.log` — append-only text, gitignored, containing player names and role names in English. Not a data store.

---

## 10. Quality and safety net (Section H)

### 10.1 Tests

| | |
|---|---|
| Framework | Jest 30.2.0 + ts-jest 29.1.1 (`Back-End/package.json:27,31`), config `Back-End/jest.config.js` |
| Files | **2**, both backend: `src/tests/unit/roles.test.ts` (893 LOC, 16 `describe`, 48 `it`), `src/tests/feature/gameNightPhase.test.ts` (491 LOC, 4 `describe`, 13 `it`) |
| Total | **61 test cases, 1,384 LOC** |
| Coverage of | The 12 role classes' `performAction` behaviour, and one end-to-end night-phase sequence with all roles |
| **Frontend tests** | **Zero.** No test runner is even installed in `Front-End/package.json`. |
| Do they run? | **UNKNOWN — I did not execute them**, because `jest.config.js:7` sets `collectCoverage: true`, which writes to `Back-End/coverage/`. The committed `Back-End/coverage/` artefacts indicate they ran at some point. |

**Relevance to the reskin:** the tests are surprisingly load-bearing. They contain **77 hard-coded role-name string assertions** (41 in the unit file, 36 in the feature file) — `expect(player.getRole().name).toBe("Werewolf")` (`roles.test.ts:250`), `expect(result.groundRole1).toBe("Minion")` (`:150`), and so on — plus **~20 assertions on English prose** (`expect(result.message).toContain("All Werewolves are on the ground")`, `:216`; `toContain("spirits are silent")`, `:660`; `toContain("wake with the Masons")`, `:722`).

So: **renaming roles will break ~77 tests loudly, and re-translating server prose will break ~20 more.** That is a feature, not a bug — it is the only mechanism in this repo that will notice a role rename. It will also make the rename feel much larger than it is.

### 10.2 CI/CD

**None in the repo.** No `.github/`, no `.gitlab-ci.yml`, no `render.yaml`, no Dockerfile. Nothing runs the tests automatically. Nothing gates a merge or a deploy.

### 10.3 Linting, formatting, TypeScript strictness

| | |
|---|---|
| Frontend lint | `Front-End/eslint.config.js` — flat config, `js.recommended` + `typescript-eslint.recommended` + `react-hooks` + `react-refresh`. Run via `npm run lint` (`package.json:9`). Not run by anything automatically. |
| Backend lint | **None.** No ESLint config in `Back-End/`. There are `// eslint-disable-next-line` comments in `NightPhaseManager.ts:190,196,198,318,325,345,426,442,444` referencing rules that no configured linter enforces. |
| Formatter | **None.** No Prettier config, no `.editorconfig`. Formatting is inconsistent (2-space vs 4-space blocks, mixed quote handling, trailing whitespace at `Game.ts:392,510`). |
| **Backend `strict`** | **`false`** — `Back-End/tsconfig.json:7`. No `noImplicitAny`, no strict null checks. `any` is used freely (`gameHandlers.ts:83,101,130`, `Game.ts:512-516`, `NightPhaseManager.ts:191,197,199`). |
| **Frontend `strict`** | **`true`** — `Front-End/tsconfig.app.json:24`, plus `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly` (`:25-31`). |

### 10.4 The frontend does not typecheck

`Front-End/package.json:8` — `"build": "tsc -b && vite build"`.

Running `tsc -p tsconfig.app.json --noEmit` (no emit, no mutation) produces **20+ errors**:

| Error | Location | Meaning |
|---|---|---|
| `TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled` ×3 | `packages/shared/src/game-types.ts:3,12,21` | `erasableSyntaxOnly: true` (`tsconfig.app.json:30`) **rejects the `TimerOption`, `Phase`, and `Team` enums** — i.e. the frontend's own config rejects the shared package. |
| `TS2322: Type '"villain"' is not assignable to type 'Team'` ×12 | `Front-End/src/characters.ts:42,54,66,78,90,102,114,126,138,150,162,174` | Every role's `team` field. |
| `TS2307: Cannot find module '../socket'` | `Front-End/src/contexts/VoiceConext.tsx:2` | The file it imports was deleted in commit `f33e49e`. |
| `TS2345` (phase widened to `string`) | `Front-End/src/store/gameStore.ts:177` | `hydrate` assigns `snapshot.phase: string` into a union-typed field. |
| `TS2558: Expected 0 type arguments, but got 2` | `Front-End/src/store/sockets.ts:8` | `io<ServerToClientEvents, ClientToServerEvents>(...)` — wrong generic arity, and the two type params are in the wrong order relative to the backend's usage. |
| `TS6133` unused ×3 | `NightPhase.tsx:69,71`, `Vote.tsx:14` | `playerName`, `isHost` read from the store and never used. |

The backend, by contrast, typechecks **clean** (`tsc --noEmit` produces no output) — but with `strict: false`, that means much less.

**Implication:** `npm run build` in `Front-End/` fails today. Vercel is therefore either running a different build command (configured in its dashboard, not in the repo — `vercel.json` specifies none) or the deployed build predates these errors. **UNKNOWN which.** Either way, **TypeScript is not currently acting as a safety net on the frontend**, and a new type error introduced by the reskin would be indistinguishable from the 20 already there.

### 10.5 Error handling and logging

**Server:** every socket handler is wrapped in `safeHandler` (`shared.ts:21-34`), which catches, `console.error`s, and emits `error` with the raw `error.message`. Express has a 404 catch-all (`app.ts:45-50`) but **no error middleware** — it is commented out (`app.ts:53`). `Logger` (`utils/Logger.ts`) writes to a file; `info`/`debug`/`warn`/`error` do **not** go to stdout, only `log` does (`:40-43`). On Render, where stdout is the log stream, most server logging is invisible.

**Client on server error:**
```ts
socket.on(SOCKET_EVENTS.SERVER.ERROR, (data: { message: string }) => {
  console.error("Server error:", data.message);
});
```
`Front-End/src/store/sockets.ts:98-100`. **That is the entire handling.** No toast, no banner, no state change, no retry. **When the server rejects an action, the player sees absolutely nothing** — the UI just doesn't advance. There is no React error boundary anywhere in the app either.

The only visible error paths are: `kicked` → hard redirect (`sockets.ts:92-96`), and a 10-second join timeout on the share-link page (`JoinPage.tsx:29-35`).

### 10.6 Direct answer: if the reskin silently broke role assignment, what would catch it?

**Nothing, on the path that matters.**

The backend unit tests would catch drift *inside the backend* — 77 assertions would fail loudly the moment a role name changes. But:

- **Nothing runs them.** No CI, no pre-commit hook.
- **They only cover the backend.** There are zero frontend tests.
- **Nothing type-constrains the backend↔frontend contract.** Role names are `string` on both sides (`game-types.ts:37-38,63-64,76-77`). If the server starts sending `"العصفورة"` and the client's `ROLE_COMPONENTS` (`NightPhase.tsx:44-57`) still keys on `"seer"`, TypeScript is perfectly happy.
- **The frontend build already fails**, so a new type error would hide in the existing noise (§10.4).
- **The failure mode is silent.** `ROLE_COMPONENTS[roleLower]` returns `undefined` → `renderActionComponent()` returns `null` (`NightPhase.tsx:177-178`) → **the player gets a blank content area with no error, no console warning, and no server-side signal.** They wait, their timer expires, `NightPhaseManager.autoPerformAction` (`:191-329`) silently performs a random action for them, and the game continues as if nothing happened.
- Similarly, `roleHelpers.getSquareImage` falls back to `backCardImage` (`:6`) and `getFullCardImage` to `backCardImage` (`:12`) — **a wrong role name renders a face-down card back instead of throwing.** `characters.ts:260` falls back to `cardStyleMap["werewolf"]`. Every lookup degrades gracefully into looking-almost-right.

The one place that *would* crash loudly is `NightPhaseManager.ts:38-41`: a role in the queue with no timer entry throws `Role ${roleName} has no timer`. That throw happens inside a getter called from `BuildGameSnapshot` (`Game.ts:628`), i.e. inside `emit()` — so it would break state broadcast for the whole room, mid-game, with the error visible only in Render's logs.

**Answer: nothing. Add a contract test before touching role names.**

---

## 11. Risk register

Ranked by blast radius, not by effort.

### HIGH

**R1 — Role name is the logic key; renaming breaks the game in ~60 places at once.**
*What breaks:* win-condition evaluation, night-queue matching, per-role timer lookup, role-count bookkeeping, Clone/Mason/Insomniac/Oracle special-casing, and the client's entire action-UI dispatch.
*How it manifests to a player:* they see their card, the night starts, and **the action screen is blank**. No error. Their timer runs out, the server auto-plays a random action for them, and at the results screen the winner is wrong. Silently. Every game.
*Where the risk lives:* `Back-End/src/entities/game/VoteResolver.ts:43,69,82` (win conditions); `Back-End/src/entities/game/Game.ts:367,370` (queue match); `Back-End/src/entities/game/NightPhaseManager.ts:11-24,120,125,129,133,137,203-292` (timers + dispatch); `Front-End/src/pages/NightPhase.tsx:44-57,113-114,177` (UI dispatch).

**R2 — Team values already do not match between server and client; the results screen is already wrong.**
*What breaks:* `Front-End/src/pages/Results.tsx` compares `winners` against `"werewolves"` / `"villagers"` / `"joker"`. The server sends `Team` enum values: `"villain"` / `"village"` / `"neutral"` (`packages/shared/src/game-types.ts:21-25`, emitted at `Game.ts:637`).
*How it manifests to a player:* `winnerLabel()` falls through to `default: return winners` (`Results.tsx:75`), so the banner reads the raw string **"villain"** instead of "Werewolves Win". `didIWin()` (`:57-64`) can never return true, so **every player is told "You lost"**, including the winners. `getWinnerColorClass()` (`:23-27`) always returns the village colour.
*Where the risk lives:* `Front-End/src/pages/Results.tsx:11-13,24-26,60-77`. Note `Discussion.tsx:24-29` solves the same problem correctly using the `Team` enum — so the fix pattern already exists in the repo. **This is a pre-existing bug, not one the reskin introduces, but any work on Results.tsx will collide with it.**

**R3 — 24 role card images have English text painted into the pixels.**
*What breaks:* the role-reveal flip and every card modal.
*How it manifests to a player:* an Arabic-language game where the single most important screen — "what am I?" — shows an English word and an English ability sentence, in a mangled typeface.
*Where the risk lives:* `Front-End/src/assets/werewolf_card.webp` (confirmed: "WEREWOLF" + "Know The Other Werewolves / or / Peek at 1 Ground Card"), `Front-End/src/assets/seer_card_small.webp` (confirmed: "SEER"), and by extension the other 22 `*_card*.webp`. Rendered at `Front-End/src/pages/RoleReveal.tsx:118,166` and `Front-End/src/components/CardModal.tsx:45`.

**R4 — The frontend does not typecheck, so type safety cannot catch reskin regressions.**
*What breaks:* `npm run build`.
*How it manifests to a player:* nothing today (the deployed build predates or bypasses this). But it means every reskin-introduced type error lands in a pile of 20 existing ones and is not noticed.
*Where the risk lives:* `Front-End/tsconfig.app.json:30` (`erasableSyntaxOnly`) vs `packages/shared/src/game-types.ts:3,12,21` (enums); `Front-End/src/characters.ts:42` (and 11 siblings); `Front-End/src/store/sockets.ts:8`; `Front-End/src/contexts/VoiceConext.tsx:2`.

**R5 — Server errors are invisible to players.**
*What breaks:* every rejected action.
*How it manifests to a player:* they tap, nothing happens, they tap again, nothing happens. Total silence. During the reskin this converts every integration mistake into an unreportable "the game froze" complaint.
*Where the risk lives:* `Front-End/src/store/sockets.ts:98-100`.

**R6 — A role in the night queue with no timer entry crashes state broadcast for the entire room.**
*What breaks:* `roleQueueWithTimer` throws inside `BuildGameSnapshot`, which is inside `Game.emit()`.
*How it manifests to a player:* the game freezes for **everyone** at the moment a role is called; no snapshot is delivered; no client shows an error.
*Where the risk lives:* `Back-End/src/entities/game/NightPhaseManager.ts:38-41`, reached via `Back-End/src/entities/game/Game.ts:382-384,628`. Renaming a role in `ROLE_NAMES` (`game-constants.ts:7-20`) or in a role class without updating the `roleTimers` map (`NightPhaseManager.ts:11-24`) triggers exactly this.

### MEDIUM

**R7 — 11+ duplicate role lists will drift during a rename.**
*Manifests as:* a role appears in the how-to-play screen with its old name; a role is missing from the night order; `Warlock` and `Oracle` already have no entry in `VoteResolver.ts:94`, so their night actions **never appear in the end-of-game action history**.
*Lives at:* the table in §4.1; the missing entries at `Back-End/src/entities/game/VoteResolver.ts:94`.

**R8 — The `display: none` block in HomePage.tsx contains a full duplicate of the create/join modals.**
*Manifests as:* a translator or developer edits the wrong copy and sees no change. Or fixes one and not the other.
*Lives at:* `Front-End/src/pages/HomePage.tsx:272-441` (dead, hidden by `HomePage.css:18-20`) vs `:442-477` (live). Lines 403-439 and 442-477 are near-identical.

**R9 — The `#root` phone frame is a fixed 430×932 box with `overflow: hidden`; Arabic text will be clipped, not scrolled.**
*Manifests as:* on smaller devices, or with longer Arabic strings, labels are cut off mid-word with no scrollbar and no ellipsis.
*Lives at:* `Front-End/src/index.css:45,52-60`; compounded by `HomePage.css:117` `white-space: nowrap` on the button-plate overlay text.

**R10 — Horizontal scrollers use `scrollLeft`, whose RTL semantics differ across browsers.**
*Manifests as:* the night role-progress strip auto-scrolls to the wrong end, or jumps; the character carousel arrows move the wrong way.
*Lives at:* `Front-End/src/components/roles/NightRoleProgress.tsx:50-58`; `Front-End/src/pages/HomePage.tsx:341,393`.

**R11 — English joke names are auto-assigned to nameless joiners, one of them is "Honor Hitler".**
*Manifests as:* a player following a share link with no saved name is silently given a Latin-script joke name in an Arabic game. `"Honor Hitler"` is a reputational hazard independent of language.
*Lives at:* `Back-End/src/socket/socketHandlers/gameHandlers.ts:7,9-14,36,41`; triggered from `Front-End/src/pages/JoinPage.tsx:25-27`.

**R12 — `Math.random().toString(36).substring(2,8)` can yield a code shorter than 6 characters, which the server then rejects.**
*Manifests as:* occasional "game doesn't exist" immediately after creating one.
*Lives at:* `Back-End/src/entities/game/Game.ts:571-573` vs the length check at `Back-End/src/socket/socketHandlers/gameHandlers.ts:25` and `Back-End/src/controllers/gameController.ts:33,88`.

**R13 — Three divergent host-migration implementations.**
*Manifests as:* host transfers behave differently depending on whether the host left, was kicked, or disconnected — 10-second grace in one path, immediate in the others.
*Lives at:* `Back-End/src/entities/game/Game.ts:168-179` (kick), `:219-254` (disconnect, with grace), `Back-End/src/socket/socketHandlers/shared.ts:46-61` (leave, immediate).

**R14 — Games are in-memory only; a Render restart destroys every live lobby.**
*Manifests as:* mid-game, everyone is ejected with `Game not found` and no explanation (see R5 — they see nothing).
*Lives at:* `Back-End/src/entities/Manager.ts:8,14,26`. This is a design decision, not a defect — but it means every deploy during the reskin kills live games.

**R15 — `lastActivityAt` is never updated, so the 30-minute orphan cleanup is really a 30-minute hard cap on game age.**
*Manifests as:* a long, slow game with a long discussion timer gets garbage-collected mid-play.
*Lives at:* `Back-End/src/entities/game/Game.ts:59,546` (only writes) vs `Back-End/src/entities/Manager.ts:108`.

**R16 — Two independent discussion timers.**
*Manifests as:* the on-screen countdown drifts from the server's, so voting can start "early" or the timer sits at 0:00 for several seconds.
*Lives at:* `Back-End/src/entities/game/Game.ts:397-406` vs `Front-End/src/pages/Discussion.tsx:134-159`.

**R17 — `settingsUpdate` sends a field the server's type does not have.**
*Manifests as:* nothing today (`Game.updateSettings` only reads `.timer`), but the shape mismatch means the client's `showHint` setting is silently dropped.
*Lives at:* `Front-End/src/pages/WaitingRoom.tsx:19-22,78,143` (`{timer, showHint}`) vs `packages/shared/src/game-types.ts:32-34` (`{timer}`) and `Back-End/src/entities/game/Game.ts:153-157`.

**R18 — `Back-End/.env` is tracked in git.**
*Manifests as:* any secret added to it is published on the next push.
*Lives at:* absence of `.env` from `Back-End/.gitignore`; the file appears in `git ls-files`.

### LOW

**R19 — PWA icons are 1000×1000 / ~1.1 MB each but declared as 192×192 and 512×512.**
`Front-End/public/manifest.json:11,16` vs the actual files. 2.3 MB of icon downloaded on install.

**R20 — Favicon is the stock Vite logo.** `Front-End/index.html:5` → `/vite.svg`.

**R21 — `<title>Werewolf</title>`, manifest name `"Werewolf"`, share text `"Join my Werewolf game!"`.**
`Front-End/index.html:13`; `Front-End/public/manifest.json:2-3`; `Front-End/src/components/ShareButton.tsx:12,20`.

**R22 — `lang="en"` with no `dir`.** `Front-End/index.html:2`. Screen readers will announce Arabic content with an English voice.

**R23 — `Cinzel` and `DynaPuff` webfonts are loaded and never used**; `index.html:10` is fully redundant with `:11`. Render-blocking dead weight.

**R24 — `body` font-family ignores the `--font-display`/`--font-body` tokens**, falling back to a system stack with variable Arabic coverage. `Front-End/src/index.css:42`.

**R25 — `warlock_card.webp` and `warlock_card_small.webp` are byte-identical (84,866 bytes), as is `oracle_card_small.webp`.** Likely a copy-paste; the "small" variant offers no size benefit.

**R26 — `Manager.deleteGame` does not disconnect sockets or notify players.** `Back-End/src/entities/Manager.ts:88-91`, `Game.ts:563-567`.

**R27 — Asset lookup uses two different keys.** `roleHelpers.ts:5,11` matches on `.name`; `NightRoleProgress.tsx:22,27`, `RoleReveal.tsx:20`, `CloneAction.tsx:42,47` match on `.id`. Both work only because `id === name.toLowerCase()`. Any Arabic naming scheme that breaks that identity silently blanks half the art.

---

## 12. Dead weight (Section I)

### Committed build/tool output that should not be in git

- **`Back-End/coverage/` — 95 tracked files** of generated Jest HTML coverage. Regenerated on every `npm test`.
- **`Back-End/.env` — tracked.** See R18.
- **`Werewolf/` — 19 tracked files**, an Obsidian vault (`.obsidian/` config, a custom theme, daily notes, socket-refactor plans). Planning notes committed as source.
- `.plan.md` at repo root — gitignored but present on disk; a 4-item TODO list, 3 items done.
- `.agents/` — empty directory.

### Dead code

| Item | Location | Evidence |
|---|---|---|
| **The entire `home-visuals` block** — ~170 lines of JSX including a **duplicate copy of both modals** | `Front-End/src/pages/HomePage.tsx:272-441` | Hidden by `home-visuals--hidden { display: none }` at `Front-End/src/pages/HomePage.css:18-20`. Contains the old English title, the three English buttons, the character showcase, the carousel, and lines 403-439 which duplicate the live modals at 442-477. |
| **Voice chat — 469 LOC, entirely disconnected** | `Front-End/src/contexts/VoiceConext.tsx` (304), `Front-End/src/components/VoiceChat.tsx` (39), `Front-End/src/pages/Rtc.tsx` (126) | Every call site is commented out: `App.tsx:2,49,51`; `Discussion.tsx:4,197`; `Vote.tsx:3,86`; `NightPhase.tsx:19`; `Results.tsx:6`. `VoiceConext.tsx:2` imports `'../socket'`, deleted in commit `f33e49e` — **it cannot compile.** The backend half (`voiceHandlers.ts`, 5 client events + 6 server events in `socket-events.ts:19-23,30-35`, `voice.types.ts`) is fully live and reachable but has no caller. `Rtc.tsx` is imported by nothing at all. |
| `WaitingForTurn.tsx` — 84 LOC | `Front-End/src/components/roles/WaitingForTurn.tsx` | Defined and exported; imported by nothing. |
| `CLONE_ACTIVE_ROLES` | `packages/shared/src/game-constants.ts:5`, re-exported `index.ts:9` | Imported by nothing. Duplicates `CLONE_FOLLOW_UP_ROLES` (`Clone.ts:6`). |
| `RequestType` enum + `Result` type | `Back-End/src/types/result.types.ts:7-14` | 15-member enum, imported by nothing. Its own header comment describes an event system that doesn't exist. |
| `createMasonAction` | `Back-End/src/entities/roles/Mason.ts:10` | Defined but **not exported** from `roles/index.ts:24` (every other role's factory is). Unreachable. |
| `Game.numberOfWerewolf` / `Game.numberOfMasons` | `Back-End/src/entities/game/Game.ts:45-46`, set to `0` at `:94-95` | Never read. The real values live privately in `RoleAssigner.ts:28-29`. |
| `JoinGameResponse` | `Back-End/src/types/socket.types.ts:7-13` | Imported by nothing. |
| `Logger.debug` / `Logger.json` / `Logger.logToConsole` / `Logger.close` | `Back-End/src/utils/Logger.ts:37,53,56,22` | Never called. |
| `pingMeasure` handler | `Back-End/src/socket/socketHandlers/playerHandlers.ts:108-110` | `socket.on(..., (_data) => { return; })` — the client's `measurePing` (`sockets.ts:23`) passes an ack callback the server never invokes, so **the ack never fires and `reportPing` is never sent from that path.** |
| Commented-out validation | `Back-End/src/entities/Manager.ts:43-46` | Game-code length check, disabled. |
| Commented-out test override | `Back-End/src/entities/game/Game.ts:392` | `// const totalSeconds = 10; // for testing` |
| Commented-out error middleware | `Back-End/src/app.ts:7-8,13,53` | `errorHandler` and `Logger` imports and registration, all disabled. |
| Commented-out debug middleware | `Back-End/src/app.ts:24-33` | An empty middleware whose body is entirely commented out. |
| Commented-out socket emit | `Back-End/src/entities/game/NightPhaseManager.ts:491` | |
| Unused store reads | `Front-End/src/pages/NightPhase.tsx:69,71`; `Front-End/src/pages/Vote.tsx:14` | `playerName`, `isHost` — flagged by `tsc` as TS6133. |
| `Game.startPerformActions` | `Back-End/src/entities/game/Game.ts:377-380` | Sets phase to a value it already has; called by nothing. |

### Orphaned assets

- `Front-End/src/assets/`: `ability1.webp`, `button1.webp`, `character2.webp`, `team.webp` (has Arabic "فريق الحرامية" baked in), `background - Copy.webp`, `image (18).jpg`, `warlock_2d.png` (**2.5 MB**). **~3.2 MB.**
- `Front-End/public/assets/`: all 12 `units/*.png` + `backgrounds/village.png`. **~4.4 MB**, and these are copied verbatim into every deploy.
- `Front-End/src/react.svg`.
- **Total dead asset weight: ~7.6 MB.**

### Duplicated logic that will drift

| Duplicate | Locations |
|---|---|
| Role order list | `RoleAssigner.ts:102` and `:111` — **two identical arrays in the same class**; `HowToPlay.tsx:11`; `VoteResolver.ts:94` (incomplete — missing Warlock, Oracle) |
| Clone follow-up role list | `Clone.ts:6` vs `game-constants.ts:5` |
| Role ability text | `characters.ts` `ability` field (12) vs `HowToPlay.tsx:33-44` `CHARACTER_INFO` (12) vs the backend role classes' `description` (12) — **three independent copies of the same 12 sentences, already divergent in wording** |
| Mason "fellow Mason(s)" message | `Mason.ts:39` and `NightPhaseManager.ts:407` |
| `teamColor` / `teamLabel` helpers | `HomePage.tsx:29-39` and `HowToPlay.tsx:47-57` — near-identical, different label strings (`"WEREWOLF TEAM"` vs `"WEREWOLF"`) |
| Team-from-role derivation | `Results.tsx:9-14` (returns `"werewolves"`) and `Discussion.tsx:24-29` (returns `Team.Villain`) — **same function, two different return vocabularies, one of them wrong** |
| `"Ground Card N"` label | `Game.ts:626` and `Clone.ts:102` |
| Host transfer | 3 implementations (R13) |
| `getSquareImage` / `getFullCardImage` | `roleHelpers.ts:4-13` (keys on `name`), duplicated in `CloneAction.tsx:41-48` and `NightRoleProgress.tsx:22-29` (both key on `id`) |
| Create/join modals | `HomePage.tsx:403-439` and `:442-477` |

### Abandoned mid-refactor

- **`HomePage.tsx` is mid-rewrite.** The new Arabic asset-driven layout (`:214-270`) sits above the old English layout (`:272-441`) which is `display:none`'d rather than deleted. Both are in the file, both compile, one is invisible.
- **Voice chat was ripped out but only on the client**, leaving the whole server half live and a client file that cannot compile.
- Commit `f33e49e` "remove socket.ts" left `VoiceConext.tsx:2` importing the deleted file.
- The `Werewolf/Plans/Socket Refactor Master Plan.md` vault suggests a refactor in progress; `Game.ts` still carries `// HUH ? where does this come from ? wtf ?` (`:510`), `// WARN: this code looks fishy, but it works` (`:211`), and `// huh again ? how can a host be even kicked ?` (`:167`).
- `README.md` is stale in at least six ways: says "React 18" (actual 19), "React Router v6" (actual 7), "10 unique roles" (actual 12 — omits Warlock and Oracle), "localStorage client sessions" (actual `sessionStorage`), "6 – 10 players" (actual 6–12, `game-constants.ts:1-2`), and instructs `cd backend` / `cd frontend` (actual `Back-End` / `Front-End`). It also advertises voice chat as a working feature.
- File-name inconsistencies from partial renames: `InsomaniacAction.css` (misspelt) beside `InsomniacAction.tsx`; `werewolfAction.css` (lowercase) beside `WerewolfAction.tsx`; `Seer_card.webp` (capital) beside `seer_card_small.webp`; `VoiceConext.tsx` (misspelt "Context"); `Jocker.png`.

---

## 13. Natural seams

Places where content, assets, and layout direction could be extracted cleanly. Described, not implemented.

**S1 — `Front-End/src/characters.ts` is already a role content+asset manifest.**
All 12 roles' `id`, `name`, `title`, `description`, `ability`, portrait, full-body, card, and small-card resolve through this one file (`:38-183`, `:310-343`), plus a per-role colour table (`:193-254`). Every client-side role image and every client-side role string flows through it. The only client code that bypasses it is `HowToPlay.tsx:11-45` (four duplicate lists) and the per-role slug hard-coded inside each `*Action.tsx` (e.g. `WerewolfAction.tsx:146`).

**S2 — `Back-End/src/entities/roles/Role.ts:3-9` is the one interface every role implements.**
Adding a field here propagates to all 12 classes with compiler enforcement (on the backend, where `tsc` passes). It already carries `name`, `team`, and `description` — the three pieces of display identity — alongside `id` and `performAction`. This is where a stable logic key would go if one were separated from the display name.

**S3 — Action-type discriminators are already a separate, display-free identity namespace.**
`Werewolf.ts:7,11,26` (`type: "werewolf"`), `Seer.ts:6-9` (`enum SeerActionType`), and their 10 siblings. These strings are validated server-side, transmitted in `performAction` payloads, and **never shown to a player**. They are what logic should key on, and they already exist.

**S4 — `Game.BuildGameSnapshot` (`Back-End/src/entities/game/Game.ts:604-663`) is the single server→client content boundary.**
One function assembles every field the client can ever see, including every prose string (`groundCards[].label` `:626`, `resultsVotes[].vote` `:645`, `actionHistory[].description` `:656`, `playerPrivateData.roleDescription` and `.lastActionResult` via `:657-659`). Everything the server tells a player passes through here.

**S5 — `packages/shared/src/game-constants.ts:28-41` `ERROR_MESSAGES` is a partial, already-existing string table.**
12 error strings centralised in the shared package, consumed by `gameHandlers.ts`, `playerHandlers.ts`, `shared.ts`, and `gameController.ts`. It demonstrates the pattern; it just covers 12 of ~58 error strings, and none of the 33 gameplay `message` strings.

**S6 — `Front-End/src/store/gameStore.ts:176-221` `hydrate` is the single client-side ingestion point.**
Every server field enters client state here, in one function, with explicit per-field mapping. Anything that needs to be transformed on arrival — a role-name mapping, a prose lookup — has exactly one place to happen.

**S7 — `Front-End/src/index.css:8-30` is an existing design-token block.**
`:root` custom properties for colours, fonts (`--font-display`, `--font-body`), and the phone-frame geometry. A `--text-align-start`-style direction token, or a `[dir="rtl"]` override block, has an established home.

**S8 — `Front-End/index.html:2` and `Front-End/src/index.css` `#root` are the two places that define document direction.**
`<html lang="en">` at `index.html:2` (no `dir`), and the `#root` frame at `index.css:52-60`. There is exactly one document root and one app container. With only 12 physical directional CSS declarations in the whole codebase (§6.2), a single `dir` flip plus twelve edits is very nearly the entire CSS change.

**S9 — The blank-plate-plus-CSS-text pattern already exists and works.**
`lore.webp` and `ability.webp` are deliberately textless background images with text positioned over them via `.home-lore-text` / `.home-ability-text-new` (`HomePage.tsx:262-270`, `HomePage.css:215-230`). This is the proven in-repo answer to R3 for the card art: textless card frames plus overlaid strings.

**S10 — `Front-End/src/utils/roleHelpers.ts:4-13` is a two-function art-resolution chokepoint.**
`getSquareImage` and `getFullCardImage` are where role identity becomes an image. Two functions, 10 lines. (Caveat: `CloneAction.tsx:41-48` and `NightRoleProgress.tsx:22-29` reimplement them locally — those two copies would need folding in first.)

**S11 — `Back-End/src/entities/roles/Oracle.ts:69-160` `buildVisionMessage` is the single largest prose block, and it is already a pure function.**
25 English sentences in one `switch(roleName)`, taking `(roleName, result)` and returning `string`, with no side effects and no dependencies. It is the most translation-hostile code in the repo and simultaneously the easiest to isolate.

**S12 — `packages/shared/` is an existing cross-cutting package that both halves already import.**
Five files, 227 LOC, already the home of `Phase`, `Team`, `SOCKET_EVENTS`, `VALIDATION`, and `ERROR_MESSAGES`. It is the obvious home for anything that must be identical on both sides. Caveat: `Front-End/tsconfig.app.json:30` `erasableSyntaxOnly` currently **rejects** its enums (§10.4), so this seam is broken on the frontend until that config conflict is resolved.

---

## 14. Unknowns

| # | Unknown | What would settle it |
|---|---|---|
| U1 | **Do the backend tests pass?** | I did not run `npm test` — `jest.config.js:7` forces coverage output, which writes files. Run it manually. |
| U2 | **Does the deployed frontend actually build?** `tsc -p tsconfig.app.json --noEmit` reports 20+ errors and `package.json:8` runs `tsc -b` first. Yet the app is reportedly live. | The Vercel project's Build Command setting (not in the repo — `vercel.json` specifies none), and the last successful Vercel build log. |
| U3 | **Provenance and licensing of `Front-End/src/assets/*`.** No license file, no attribution, no metadata I can read. | The owner. See Q1. |
| U4 | **Whether all 22 unopened `*_card*.webp` files carry baked-in English text.** I opened 2 of 24 and confirmed both do. | Opening the remaining 22. |
| U5 | **Whether `Alyamama` resolves on Google Fonts and renders correctly on iOS/Android.** `index.html:11` requests it; I could not make a network request. | Load the page on a real device and inspect computed `font-family`. |
| U6 | **The Render service configuration** — build command, start command, instance tier, whether it spins down when idle. Nothing about it exists in the repo. | The Render dashboard. Determines the real-world impact of R14. |
| U7 | **Whether `Front-End/.env` and `Back-End/.env` match production.** Both are tracked; I read only the key names. | The Vercel/Render environment settings. |
| U8 | **Actual player counts, session lengths, and whether games routinely run past 30 minutes** — needed to know whether R15 (orphan cleanup) bites in practice. | Server logs or telemetry. There is no analytics in the repo. |
| U9 | **Whether R2 (the Results screen showing "villain" and telling everyone "You lost") is currently visible in production or masked by something I cannot see.** The code path is unambiguous, but I did not run the app. | Play one game to the end. |
| U10 | **Whether `pickRandomName` (R11) actually fires in practice** — it depends on players arriving via share link with empty `sessionStorage`. | Server logs; search for the pool names in `logs/game.log`. |
| U11 | **Whether the 12 `public/assets/units/*.png` are licensed art, and whether they were ever shipped.** They are in `public/`, so they are **served at the deploy root today** even though nothing links to them. | The owner; and whether any external page hotlinks them. |
| U12 | **Which `HomePage.tsx` layout users currently see.** The Arabic layout is uncommitted working-tree state; the deployed version may be the committed English one. | `git diff HEAD -- Front-End/src/pages/HomePage.tsx` against what is live on Vercel. |
| U13 | **Whether image dimensions I report for `.webp` files are exact.** I parsed the RIFF/VP8 headers by hand; values are consistent and plausible but not verified against a decoder. | `identify` / `magick` / any real WebP decoder. |
| U14 | **Intended Arabic faction naming.** `team.webp` says فريق الحرامية ("the thieves' team") but it is wired to nothing, and `Team` enum values are `villain`/`village`/`neutral`. | The owner. See Q4. |

---

## 15. Questions for the owner

Blunt, and specific. Several are places where the code contradicts the brief.

**Q1 — Where did `Front-End/src/assets/*` come from, and can it ship?**
The brief says current art is placeholder/borrowed and cannot ship. The repo contains no license, no attribution, no source note. Two of the card images I opened show malformed letterforms consistent with generative output, and `werewolf_card.webp` is in a visibly different art style from `seer_card_small.webp`. **Which of these 65 files, if any, do you actually own?** The answer changes whether §7 is a redraw job or a replace job.

**Q2 — `Front-End/public/assets/units/` contains `hunter.png`, `tanner.png`, and three `villager*.png` — roles that do not exist in this codebase. Where is that set from?**
It reads as an imported third-party ONUW card set. It is referenced by nothing, but it sits in `public/`, so **it is being served at your deploy root right now.** If it is someone else's art, it is publicly accessible from your domain. Can it be deleted?

**Q3 — Was the `HomePage.tsx` rewrite abandoned or paused?**
The file contains two complete layouts. The new Arabic one is live; the old English one (lines 272-441) is `display: none`, and it includes a **duplicate copy of the create/join modals**. It also still holds the character carousel — which the new layout replaced with a single-image swipe panel that has exactly **one** entry (`homeCharacterImages` has one element, `:19`). **Is the carousel coming back, or is the single-character panel the design?** This determines whether ~170 lines and the whole `characters[]` showcase path get deleted or restored.

**Q4 — What are the Arabic faction names, and does the `Team` enum change?**
`team.webp` (unreferenced) says **فريق الحرامية**. The code says `villain` / `village` / `neutral` (`game-types.ts:21-25`). Meanwhile `Results.tsx:11-13` is checking for `"werewolves"` / `"villagers"` / `"joker"` — values nothing produces. **Are teams being renamed too, or only roles?** If teams change, R2 must be fixed first or the results screen breaks in a new way on top of the way it is already broken.

**Q5 — Are you aware the results screen is currently broken?**
`Results.tsx:57-77`: `winnerLabel()` falls through to `default` and prints the raw enum value `"villain"`; `didIWin()` cannot return `true` for anyone, so **every player is shown "You lost"**. `Discussion.tsx:24-29` handles the same comparison correctly. This looks like Results.tsx was written before the `Team` enum landed and never updated. **Was this known, or has nobody read the end screen closely?**

**Q6 — Does `npm run build` currently succeed in `Front-End/`?**
`tsc --noEmit` gives 20+ errors, including three that reject `packages/shared`'s enums outright because `erasableSyntaxOnly` is on (`tsconfig.app.json:30`). The build script is `tsc -b && vite build`. If Vercel is succeeding, **it is running a different command that is configured only in the dashboard.** What is it? And is the `erasableSyntaxOnly` flag deliberate, or did it arrive with a Vite template?

**Q7 — Is voice chat dead or paused?**
The entire server half is live and reachable (`voiceHandlers.ts`, 11 socket events, `voice.types.ts`). The entire client half is commented out in six files, and `VoiceConext.tsx:2` imports a module deleted in commit `f33e49e` — it cannot compile. README advertises it as a shipped feature. **Delete it or fix it?** 469 client LOC + 100 server LOC + 11 event names are riding along either way.

**Q8 — `gameHandlers.ts:7` auto-assigns English joke names, including "Honor Hitler", to anyone who joins without a name.**
This fires on the share-link path when `sessionStorage` is empty. **Deliberate in-joke, or leftover from testing?** If حارتنا is going public, this is a headline waiting to happen and it is unrelated to translation.

**Q9 — Are you willing to separate the role's logic key from its display name, or do you want to rename the strings in place?**
Renaming in place touches ~60 comparison sites, 11 duplicate lists, 77 test assertions, and the wire format simultaneously, with the failure mode being a silent blank screen (§10.6). Introducing a stable key (the action-type strings at `Werewolf.ts:7` etc. are already exactly that) confines the change to a lookup table. **This is the single decision that determines whether the reskin is a weekend or a fortnight.** I am not proposing an implementation — I am asking which risk you want.

**Q10 — Should the player circle mirror under RTL?**
`roleHelpers.ts:27-48` seats players clockwise from the top. `dir="rtl"` will not change it; it is trigonometry, not layout. Mirroring it is a one-line sign flip. **Is clockwise seating a design intent, or an accident of the maths?**

**Q11 — Arabic-Indic (٠١٢٣) or Western (0123) numerals?**
No decision exists anywhere in the code — there is not a single `Intl` or `toLocale*` call in either package. Every number renders as ASCII by default. Egyptian usage is mixed. **This needs an answer before any timer, vote count, or player count is touched.**

**Q12 — Game codes are lowercase Latin base-36 (`Game.ts:572`) and displayed uppercased. Players on Arabic keyboards must switch layouts to type one.**
Share links avoid this entirely. **Is manual code entry a flow you care about keeping, or should the UI push people toward the link?** Also worth knowing: `substring(2,8)` on `Math.random().toString(36)` can produce a 5-character code, which the server then rejects (R12) — an occasional "game doesn't exist right after I made it" bug. Has that been seen?

**Q13 — `Back-End/coverage/` (95 files) and the `Werewolf/` Obsidian vault (19 files) are committed to git, and `Back-End/.env` is tracked.**
The `.env` currently holds nothing sensitive. **Deliberate, or should `.gitignore` be fixed before anything secret goes in?**

**Q14 — Games are in-memory only and die on every Render restart, with no notification to players (they see nothing at all — `sockets.ts:98-100`).**
During a conversion you will deploy often. **Is that acceptable, or does a "the game ended, sorry" path need to exist before the reskin starts?**

**Q15 — `VoteResolver.ts:94` omits Warlock and Oracle from the action-history role order, so those two roles' night actions never appear in the end-of-game recap.**
Bug, or deliberate (their actions being blind swaps that arguably shouldn't be revealed)? It reads as an oversight from when those two roles were added late — they are also the last two entries in `RoleAssigner.ts:69`'s expansion list.
