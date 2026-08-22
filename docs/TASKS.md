# TASKS

The working file. One task ≈ one agent session. Tick the box in the same commit as
the work.

Phases 0–2 are written out in full. Phases 3+ are stubs — expand them into atomic
tasks when the preceding phase closes, so they reflect what the code actually looks
like by then rather than what we guessed today.

Legend: `[ ]` todo · `[x]` done · `[~]` in progress · `[!]` blocked (say why)

---

## Phase 0 — Foundations

### Cleanup first (so later sessions can't edit the wrong file)

- [x] **0.1 — Delete the hidden HomePage block.**
      Remove `HomePage.tsx:272-441` and the `.home-visuals--hidden` rule in
      `HomePage.css:18-20`. This block contains a **duplicate copy of the create/join
      modals** (`:403-439` duplicates `:442-477`) — keep the live copy at `:442-477`.
      Also removes the character showcase and carousel; if Q-05 turns out to want the
      carousel back, it is rebuilt on the component kit, not restored.

- [x] **0.2 — Delete voice chat client.**
      `contexts/VoiceConext.tsx`, `components/VoiceChat.tsx`, `pages/Rtc.tsx`, and the
      commented-out call sites in `App.tsx`, `Discussion.tsx`, `Vote.tsx`,
      `NightPhase.tsx`, `Results.tsx`. Leave the backend half alone — it's unreferenced
      and harmless. Also delete `components/roles/WaitingForTurn.tsx` (exported,
      imported by nothing).

- [x] **0.3 — Delete orphaned assets (~7.6 MB).**
      `public/assets/units/*.png` (all 12 — includes `hunter.png` and `tanner.png` for
      roles that don't exist here, and they are **served publicly at the deploy root
      today**), `public/assets/backgrounds/village.png`, `src/react.svg`, and from
      `src/assets/`: `ability1.webp`, `button1.webp`, `character2.webp`,
      `background - Copy.webp`, `image (18).jpg`, `warlock_2d.png` (2.5 MB PNG source of
      a webp sitting next to it).
      **Keep `team.webp`** — it's the reference for the Arabic team label.
      Verify nothing imports any of them before deleting.

### Make TypeScript work again (D-13)

- [x] **0.4 — Fix the shared-package enum rejection.**
      `tsconfig.app.json:30` `erasableSyntaxOnly: true` rejects `TimerOption`, `Phase`,
      and `Team` in `packages/shared/src/game-types.ts:3,12,21` — the frontend's own
      config refuses its own shared package. Either turn the flag off or convert the three
      enums to `as const` objects with derived union types.
      If you convert them: `Team` is compared in `Discussion.tsx` and will be compared in
      `Results.tsx` in Phase 9, and `Phase` is compared in `GlobalPhaseRouter`. Check
      every consumer on both sides of the wire.

- [x] **0.5 — Clear the remaining type errors.**
      `characters.ts` team literals (12 errors), `sockets.ts:8` wrong generic arity,
      `gameStore.ts:177` phase widened to `string`, three TS6133 unused reads in
      `NightPhase.tsx:69,71` and `Vote.tsx:14`.
      **Exit:** `tsc -p tsconfig.app.json --noEmit` prints nothing and `npm run build`
      succeeds.

### RTL and tokens

- [x] **0.6 — Flip the document.**
      `index.html:2` → `<html lang="ar-EG" dir="rtl">`. Delete the two stopgap
      `direction: rtl` declarations at `HomePage.css:108` and `:221`. Delete the
      redundant font `<link>` at `index.html:10` and drop `Cinzel` + `DynaPuff` from
      `:11` (loaded, never referenced by any CSS rule).

- [x] **0.7 — Convert the 12 physical directional CSS declarations.**
      Full list, this is all of them:
      `HowToPlay.css:208` `margin-right` · `HowToPlay.css:239` `text-align: right` ·
      `HomePage.css:1051` `text-align: left` · `NightPhase.css:142` `text-align: right` ·
      `Results.css:219` `text-align: right` · `RoleActions.css:90` `text-align: left` ·
      `WaitingRoom.css:94,95` and `:829,830` `border-left`/`border-right` (symmetric
      pairs) · `HomePage.css:952,953` `margin-left/right: auto` (centring pair —
      direction-neutral, leave it).
      Do **not** touch the 27 `left: 50%; transform: translateX(-50%)` centring idioms.

- [ ] **0.8 — Add the design tokens.**
      Copy the token block from `docs/DESIGN.md` into `index.css:8-30`, replacing the
      existing `:root` custom properties. Keep the existing phone-frame geometry vars.
      Fix `index.css:42` — `body` currently sets a system font stack and ignores both
      font tokens, so any text that doesn't explicitly opt in falls through to whatever
      the device has for Arabic.

- [ ] **0.8b — Formalise the phone frame (D-14).**
      `index.css:52-60` already locks `#root` to `aspect-ratio: 430/932`. Add the
      surround: `--void` background on `body`, centred with `place-items: center`, and
      the vignette `box-shadow`. Swap `100vh` for `100dvh` if present — mobile browser
      chrome collapses on scroll and `vh` doesn't track it.
      Then **audit the whole CSS codebase for `vw` and `vh` inside the frame** and
      replace them; they measure the browser window, not the frame, so they are correct
      on a phone and wrong on a laptop. Same for any media query that changes layout
      rather than scaling the frame — delete it.
      **Verify:** open at 1920×1080 and confirm a centred phone screen on a dark warm
      surround; open at 375×667 and confirm it scales down with nothing clipped.
      Delete RoleActions.css — zero imports anywhere, absent from the production
      bundle, and .role-action\_\_item has zero TSX references. Confirmed dead in
      task 0.7. Also remove the empty ruleset at HomePage.css:968.

### The display layer

- [ ] **0.9 — Build `src/content/roles.ts` (interim).**
      Create the Arabic display layer keyed by the **frozen English role ID**: name, team,
      title, lore, ability. Copy comes from `docs/CONTENT.md` — do not write new copy
      here.
      Export a lookup that is **case-insensitive**, because the server sends `"Werewolf"`
      while several client maps key on `"werewolf"`.
      Type it loosely for now; Phase 0.5 retypes it as `Record<RoleId, RoleCopy>` once
      the shared registry exists (D-15). Do not try to build the registry here.

      This is the localized display layer, not the source of truth. Mechanical

  facts live in the shared registry (D-15, D-16); this file holds only what
  a player reads. Phase 0.5 retypes it as Record<RoleId, RoleCopy>.

- [ ] **0.10 — Build `src/content/ui.ts`.**
      A flat string table for non-role UI copy. Seed it from `docs/CONTENT.md §UI
strings`. Expect it to grow every phase. Include a plural helper — Arabic has six
      categories and the current code uses `n === 1` in five places.

- [ ] **0.11 — Build `<RoleFrame>` and route all art through it.**
      Renders the themed frame at the card aspect ratio with a neutral watermark, no
      character illustration. Accepts a role ID and a size variant
      (`card` / `small` / `square`).
      Then rewrite `utils/roleHelpers.ts:4-13` to return frames instead of images, and
      fold in the two local reimplementations at `CloneAction.tsx:41-48` and
      `NightRoleProgress.tsx:22-29` — they exist only because the original keys on
      `.name` while those key on `.id`.
      Delete the 24 `*_card*.webp` imports (D-05). Keep `back_card.webp` for now.
      Art references belong to the copy layer, not to the component — RoleFrame
      takes a role ID and resolves through content/roles.ts. Do not hardcode a
      per-role art path in the component.

- [ ] **0.12 — Playtest.** One full 6-player game, start to results. Arabic role
      names, RTL layout, placeholder frames, no crashes. **This is the phase gate.**

---

## Phase 0.5 — Role registry

Read **D-15** first. The one-line version: mechanical facts move to
`packages/shared`, Arabic copy stays on the client, nothing display-facing crosses
the wire.

- [ ] **0.5.1 — Answer Q-01 and Q-02, then build the registry.**
      Read the actual `team` value of all 12 classes in
      `Back-End/src/entities/roles/*.ts`. Record the answers in `docs/CONTENT.md` and
      `docs/DECISIONS.md`. Note whether Clone's team is static or inherited at runtime —
      if inherited, the registry needs to express that rather than pick a value.
      Then create `packages/shared/src/roles.ts` as an `as const` object with a derived
      `RoleId` type: `id`, `actionType`, `team`, `nightOrder`, `timerSeconds`,
      `entersAtPlayerCount`.
      Source the values by reading the existing duplicates — do not invent them.
      Timers come from `NightPhaseManager.ts:11-24`, night order from
      `RoleAssigner.ts:102`, deck thresholds from `:69`.
      **Add nothing else yet.** This task only creates the file.

- [ ] **0.5.2 — Migrate the backend to the registry.**
      Replace with reads from `ROLES`: `ROLE_NAMES` (`game-constants.ts:7-20`),
      `roleTimers` (`NightPhaseManager.ts:11-24`), **both** identical `roleOrder` arrays
      (`RoleAssigner.ts:102` and `:111`), `createRoles` (`:40`), and `extraRolesInOrder`
      (`:69`).
      Collapse `CLONE_ACTIVE_ROLES` (`game-constants.ts:5`, exported and imported by
      nothing) with its duplicate `CLONE_FOLLOW_UP_ROLES` (`Clone.ts:6`).
      **Leave every role class's `name` field alone** — it is frozen and load-bearing
      (D-01).
      **Exit:** all 61 backend tests pass, unchanged. If a test fails you have changed
      behaviour, not just structure — stop and report rather than editing the test.

- [ ] **0.5.3 — Fix `VoteResolver.ts:94` via the registry.**
      That array lists 10 of 12 roles — **Warlock and Oracle are missing, so their night
      actions never appear in the end-of-game action history.** Derive the order from
      `ROLES` sorted by `nightOrder` so the omission cannot come back.
      This is a real behaviour change: two roles start appearing in the recap that
      didn't before. Confirm it's wanted before shipping — the audit reads it as an
      oversight from when those roles were added late, but it could conceivably have been
      deliberate.

- [ ] **0.5.4 — Migrate the frontend to the registry.**
      Retype `src/content/roles.ts` as `Record<RoleId, RoleCopy>` so a missing role is a
      build error.
      Delete the **four** duplicate lists in `HowToPlay.tsx:11-45` — `ROLE_ORDER`,
      `BASE_ROLES`, `EXPANSION_ORDER`, `CHARACTER_INFO` — and read from the registry plus
      the copy layer.
      Fold `characters.ts` into the two layers: mechanical fields to the registry, Arabic
      copy to `content/roles.ts`, art to `<RoleFrame>`. `cardStyleMap` colours move to
      design tokens.
      **Exit:** grep the frontend for a hard-coded role-name literal outside
      `content/roles.ts` and the per-role `*Action.tsx` slugs. Report anything left.

- [ ] **0.5.5 — Playtest.** Full game, 6 players minimum. Verify the night order is
      unchanged, timers are unchanged, and the results recap now includes Warlock and
      Oracle. **Phase gate.**

---

## Phase 1 — Component kit

- [ ] **1.1 — Answer Q-04.** Decide the body font. Verify `Alyamama` actually
      resolves from Google Fonts and renders on a real Android device — it is currently
      unverified.
- [ ] **1.2 — `Plate`** — the wood sign. Variants: `title` (hanging, with rope),
      `header`, `label`.
- [ ] **1.3 — `Button`** — slate, the only element allowed to use slate blue.
      States: default, pressed, disabled, loading.
- [ ] **1.4 — `Panel`** — parchment surface with brass inner hairline.
- [ ] **1.5 — `Banner`** — the ribbon section header.
- [ ] **1.6 — `Input`** — slate field. Latin-mode variant for the game code.
- [ ] **1.7 — `Modal`** — parchment sheet over a dimmed alley.
- [ ] **1.8 — `Timer`** — ring and bar variants, both with explicit direction.
- [ ] **1.9 — Scratch route** rendering every component in every state at 430×932.

---

## Phase 2 — Home page

- [ ] **2.1 — Answer Q-05** (character panel behaviour).
- [ ] **2.2 — Rebuild `HomePage.tsx`** on the kit, matching the mock.
      Wire the ازاي تلعب button — it has no onClick and never had one, so
      How To Play is unreachable from Home. Also sweep the dead CSS left in
      HomePage.css by task 0.1: .home-visuals, .home-vignette, .home-topbar,
      .home-title, .action-btn, .home-showcase, .home-char-_, .home-info-panel,
      .home-team-badge, .home-selectbar, .carousel-_, .home-grid-_, and the
      anim-_ keyframes. A few hundred lines.Known-broken before you start, measured in task 0.6:
  - .home-ability-panel text renders at y 807-853 in an 805px frame —
    entirely below the fold and unreachable under overflow:hidden.
    Pre-existing, not caused by the RTL flip.
  - Button labels self-clip 3px: line-height:1 against Alyamama's Arabic
    ascenders. DESIGN.md sets 1.3 minimum for headings — never below 1.25.
  - Remove white-space: nowrap from .home-action-asset-text.
  - Flex row order (settings/account icons, the three action buttons)
    now reverses under dir=rtl. Decide each order deliberately rather
    than inheriting the mirror.
- [ ] **2.3 — Create-game modal.**
- [ ] **2.4 — Join-game modal**, plus the `/join/:code` link path.
- [ ] **2.5 — Verify** no English is visible and all three entry paths work.

---

## Phase 3 — How to Play

- [ ] **3.1** — Build the page on the component kit. All role data reads from the
      shared registry and `content/roles.ts` — the four duplicate lists were already
      deleted in task 0.5.4, so grepping this file for a role-name literal must return
      nothing.
- [ ] **3.2** — Read player min/max from `packages/shared` constants, not the
      hard-coded `6` and `12` currently in the JSX. Rephrase the ordinals — see
      `docs/CONTENT.md §Ordinals`.

## Phase 4 — Waiting room

- [ ] **4.1** — Lobby, player list, ready state.
- [ ] **4.2** — Game code display and share.
- [ ] **4.3** — Settings, kick, name change modals.
      Fix the timer picker. WaitingRoom.tsx:344 uses Object.entries(TimerOption),
      and numeric enums carry a runtime reverse mapping — so it renders 8 buttons,
      not 4, and clicking a reverse-mapped one sets settings.timer to the string
      "Short" rather than a number. That value reaches the server. Use
      Object.values(TimerOption).filter(v => typeof v === "number").
      Found during task 0.4; pre-existing, not introduced.

## Phase 5 — Role reveal

- [ ] **5.1** — Card flip and composition.
- [ ] **5.2** — Confirm and countdown.

## Phase 6 — Night phase

- [ ] **6.1** — Shell, progress strip, timer.
- [ ] Read role metadata from the shared registry and text from the copy layer.
      The only role literal permitted in an action component is its own
      actionType discriminator.
- [ ] **6.14** — Q-03, player circle.

## Phase 7 — Discussion

Discussion LEAVE button lands at the frame edge under RTL and clips; content is ~21px off-centre from a physical-offset centring idiom that mirrors instead of centring.

## Phase 8 — Vote

## Phase 9 — Results (includes the R2 fix, D-09)

The ▼ on SHOW VOTE DETAILS detaches from its label under RTL.

## Phase 10 — App chrome

## Phase 11 — Pre-launch

---

## Session log

Newest first. One line per session: date, task ID, outcome, anything the next session
needs to know.

2026-08-17 — **0.7** done. **The count of 12 is correct** (unlike the 12-vs-11 PNG
count) — an exhaustive grep for all 8 physical properties returns exactly 12, and no
directional hazards exist outside that list (no `float`, no corner-specific radius, no
directional `background-position`; the one multi-value radius, `Discussion.css:233`
`0 0 4px 4px`, is vertically asymmetric only. One inline style exists,
`ActionComplete.tsx:26 textAlign:"center"`, neutral).
Converted 10, left the `margin-left/right: auto` pair per the exception. Only the
**line numbers** were stale: `text-align: left` is at `HomePage.css:1045` not `:1051`,
and the margin-auto pair at `:946,947` not `:952,953`.
**But only 4 of the 12 are live and directional.** Two of the listed declarations are
in dead code: `.home-info-panel` (`HomePage.css:1045`) styles an element **deleted in
0.1**, inside a landscape media query D-14 forbids anyway; and `.role-action__item`
(`RoleActions.css:90`) sits in a stylesheet **imported by nothing** — `RoleActions.css`
has zero importers and its classes zero TSX references, so it never enters the bundle.
Both converted for completeness; neither can change a pixel.
Conversions: `.htp-win-team` `margin-right`→`margin-inline-end` · `.htp-order-num`,
`.np-timer-text`, `.res-voted-name` `text-align:right`→`end` · `.home-info-panel`
(dead), `.role-action__item` (dead) `text-align:left`→`start` · `.wr-center` ×2
`border-left`+`border-right`→`border-inline` (**cosmetic** — symmetric pairs, provably
zero rendering change).
**Verified by measurement, not by reading.** Built the bundle, served it, and measured
every selector in headless Chrome under both directions, before and after, against two
invariants: (1) under `dir=ltr` nothing may change, since logical resolves to the
original physical — all 6 byte-identical; (2) under `dir=rtl` the directional ones must
mirror and `.wr-center` must not move — all 6 pass. Text position was measured with a
Range, because `text-align` moves the _text_, not the box, and a box-only measurement
shows nothing. Control pairs (`left` vs `start`, `right` vs `end`, `margin-right` vs
`margin-inline-end`) were measured alongside to prove the mapping rather than assume it.
Zero physical directional declarations remain except the sanctioned pair. tsc clean.
**Noticed:** `WaitingRoom.css:820` `@media (max-width: 768px)` changes layout — a D-14
bug for 0.8b; and a pre-existing empty ruleset at `HomePage.css:968`. Next: task 0.8.

2026-08-17 — **0.6** done. `<html lang="ar-EG" dir="rtl">`; deleted the redundant font
link (`index.html:10`) and dropped Cinzel + DynaPuff from the survivor; removed both
stopgap `direction: rtl` declarations — found by property, they had shifted to
`HomePage.css:104` (`.home-action-asset-text`) and `:217` (`.home-panel-text`), exactly
the two predicted selectors. Zero `direction: rtl` left in the codebase. tsc clean,
build succeeds.
**Verified in headless Chrome over CDP, not by eye:** `document.documentElement.dir`
= `rtl`, computed `direction: rtl` on body, and Alyamama genuinely resolves —
`document.fonts` lists `Alyamama 300 900` as **loaded**, computed `font-family` on the
Arabic elements is `Alyamama, sans-serif`, and a canvas measure of "ابدا لعب" gives
**60.16px in Alyamama vs 44.63px in generic sans-serif**. Different metrics = real
face, not a silent fallback. Zero console errors. (Desktop Chrome only — **Q-04's
"renders on a real Android/iOS device" is still unverified**.)
**Attributable to the flip** — for Phase 2+: (1) _Discussion_ mirrors badly: the
global LEAVE button moves from the right edge to the left and is clipped by the frame
on whichever side it lands; title and timer ring shift 43px. (2) _Results_: the `▼`
chevron on SHOW VOTE DETAILS jumps to the far side of its label and reads as detached
— one of D-08's two chevrons. (3) Every flex row reverses: HomePage settings/account
icons swap sides, the three action buttons reverse order, WaitingRoom's `?` moves left
and the LEAVE/READY pair swaps.
**A/B-tested as PRE-EXISTING, not caused by 0.6** (identical metrics under `dir=ltr`):
HomePage's `.home-ability-panel` sits at 779-884 in an 805px frame, so **the ability
sentence is entirely below the fold and invisible** — the D-14 clipping hazard, already
live; the three button labels self-clip 3px (`scrollHeight` 20 vs `clientHeight` 17);
and Discussion's content is 21px off-centre in both directions. Next: task 0.7.

2026-08-17 — **0.5** done. **tsc prints nothing**, `npm run build` succeeds, backend
`tsc --noEmit` clean, 61/61 tests pass, shared package compiles standalone.
Counts per group: 17 → **5** (characters.ts) → **4** (sockets.ts) → **3**
(gameStore.ts) → **0** (TS6133).
`characters.ts`: one-line change, `team: Team` → ``team: `${Team}` `` (the union of the
enum's string values), so all 12 literals type-check untouched and the file stays easy
to move in 0.5.4. The `=== Team.Villain` comparisons in `HowToPlay.tsx` still pass.
`sockets.ts:8`: `io()` is **not generic** in socket.io-client 4.8.3 —
`declare function lookup(uri?, opts?): Socket`. Typed the variable instead:
`const socket: Socket<ServerToClientEvents, ClientToServerEvents>`. **That order was
already right and must stay** — `Socket<ListenEvents, EmitEvents>`, and the client
listens to server→client. It is the _mirror_ of the backend's
`Server<ClientToServerEvents, ServerToClientEvents>`, not a copy.
Typing the socket properly surfaced two errors the untyped `DefaultEventsMap` had been
hiding — hence the 5 → 6 blip mid-group: `settingsUpdate` declared `settings: unknown`
(now `Settings`), and `pingMeasure` passes an ack the shared type never declared (added
to `socket-types.ts:28`, type-only, backend unaffected). Deleted the dead
`gameActions.pingMeasure` / `reportPing` pair — nothing called them; the live path is
the private `measurePing()`.
`gameStore.ts`: added `toStorePhase()` — narrows, does not widen, maps `endGame`→
`results`, falls back to the current phase on an unrecognised value.
Deleted `NightPhase.tsx` `playerName`+`isHost`, `Vote.tsx` `playerName` (each appeared
exactly once — grep-confirmed against `Vote.tsx`'s `isHost`, which is used at `:136`),
and the `useSocketRejoin` comment at `App.tsx:3`.
**Found, not fixed — ping is broken end to end.** `playerHandlers.ts:108` is
`socket.on(PING_MEASURE, (_data: any) => { return; })` — it never calls the ack, so the
client's callback never fires and `reportPing` is never emitted. Every player's ping
stays at its initial value. Backend bug, out of scope here.
**Also still open:** the `Object.entries(TimerOption)` 8-button bug from 0.4
(`WaitingRoom.tsx:344`) — type-correct, so tsc does not flag it. Next: task 0.6.

2026-08-17 — **0.4** done via **option (a)**: removed `erasableSyntaxOnly` from
`Front-End/tsconfig.app.json`. Enums untouched. Logged as **D-16** with the reasoning.
Frontend tsc **20 → 17** (all three TS1294 gone; the 17 left are exactly 0.5's list).
Backend `tsc --noEmit` clean, **61/61 tests pass**, `vite build` succeeds.
The deciding evidence against option (b): `TimerOption` is a _numeric_ enum and
`WaitingRoom.tsx:344` does `Object.entries(TimerOption)`, which yields **8** entries
(reverse mapping) where `as const` would yield 4 — a runtime change `tsc` cannot see.
**Which means the timer picker renders 8 buttons today, not 4**, and the 4 spurious
ones set `settings.timer` to a string like `"Short"` instead of a number. Left alone
as an unrelated bug — flagged into 0.5 below. `tsconfig.node.json` still sets the flag;
it only covers `vite.config.ts`, which has no enums, so it was left alone.

2026-08-17 — **0.3** done. 18 orphaned assets deleted, **7,460,712 bytes (7.12 MB)**;
Front-End asset total 17,968,485 → 10,507,773 bytes. `public/assets/` is now gone
entirely (both `units/` and `backgrounds/`), so nothing unreferenced is served at the
deploy root any more — confirmed absent from `dist/` after a build. Grepped every
filename across the repo for **both** module imports and CSS `url()` before deleting;
all 18 had zero references outside `docs/`. `team.webp` and `bg_waiting.webp` kept as
instructed (`bg_waiting` is used by 7 CSS files via `url()`; `team.webp` is orphaned
but is the Q-02 reference). **Note: `public/assets/units/` held 11 PNGs, not the 12 in
D-12 and this task** — there is no `villager4`/`clone`/`drunk` unit; the list is
Jocker, hunter, minion, robber, seer, tanner, troublemaker, villager1-3, werewolf.
`vite build` succeeds (every import and `url()` resolves) and the dev server starts
clean with no warnings. tsc errors unchanged at 20. Next: task 0.4.

2026-08-17 — **0.2** done. Voice chat client deleted: `contexts/VoiceConext.tsx`,
`components/VoiceChat.tsx`, `components/VoiceChat.css`, `pages/Rtc.tsx`, plus
`components/roles/WaitingForTurn.tsx` (grep-confirmed: zero importers anywhere in the
repo). Commented-out call sites cleaned in `App.tsx`, `Discussion.tsx`, `Vote.tsx`,
`NightPhase.tsx`, `Results.tsx`. Also removed the five dead `gameActions.voice*`
emitters at `store/sockets.ts:154-167` — frontend voice surface, unreachable once the
context was gone. Backend voice half untouched per scope (`voiceHandlers.ts`,
`voice.types.ts`, `SOCKET_EVENTS.CLIENT.VOICE_*`), so `packages/shared` still exports
the event names those emitters used. `src/contexts/` is now an empty directory and git
has dropped it. **tsc errors 21 → 20** (the `VoiceConext.tsx` TS2307 import of the
deleted `../socket` module is gone; nothing new introduced). Two dead CSS rules left
behind for the phase that rebuilds those pages: `.res-voice` (`Results.css:61`) and
`.vote-voice` (`Vote.css:66`). Next: task 0.3.

2026-08-17 — **0.1** done (previous session). Hidden `.home-visuals` block deleted from
`HomePage.tsx` (482→246 lines) plus the `.home-visuals--hidden` rule in `HomePage.css`.
Live create/join modals kept; `teamColor`/`teamLabel`, the `Team` / `characters` /
`HowToPlay` imports, and the whole character-switch animation state went with it.
Follow-ups folded into task 2.2.

<!-- 2026-08-13 — planning docs created. Next: task 0.1. -->
