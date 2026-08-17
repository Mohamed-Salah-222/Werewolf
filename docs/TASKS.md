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

- [ ] **0.1 — Delete the hidden HomePage block.**
      Remove `HomePage.tsx:272-441` and the `.home-visuals--hidden` rule in
      `HomePage.css:18-20`. This block contains a **duplicate copy of the create/join
      modals** (`:403-439` duplicates `:442-477`) — keep the live copy at `:442-477`.
      Also removes the character showcase and carousel; if Q-05 turns out to want the
      carousel back, it is rebuilt on the component kit, not restored.

- [ ] **0.2 — Delete voice chat client.**
      `contexts/VoiceConext.tsx`, `components/VoiceChat.tsx`, `pages/Rtc.tsx`, and the
      commented-out call sites in `App.tsx`, `Discussion.tsx`, `Vote.tsx`,
      `NightPhase.tsx`, `Results.tsx`. Leave the backend half alone — it's unreferenced
      and harmless. Also delete `components/roles/WaitingForTurn.tsx` (exported,
      imported by nothing).

- [ ] **0.3 — Delete orphaned assets (~7.6 MB).**
      `public/assets/units/*.png` (all 12 — includes `hunter.png` and `tanner.png` for
      roles that don't exist here, and they are **served publicly at the deploy root
      today**), `public/assets/backgrounds/village.png`, `src/react.svg`, and from
      `src/assets/`: `ability1.webp`, `button1.webp`, `character2.webp`,
      `background - Copy.webp`, `image (18).jpg`, `warlock_2d.png` (2.5 MB PNG source of
      a webp sitting next to it).
      **Keep `team.webp`** — it's the reference for the Arabic team label.
      Verify nothing imports any of them before deleting.

### Make TypeScript work again (D-13)

- [ ] **0.4 — Fix the shared-package enum rejection.**
      `tsconfig.app.json:30` `erasableSyntaxOnly: true` rejects `TimerOption`, `Phase`,
      and `Team` in `packages/shared/src/game-types.ts:3,12,21` — the frontend's own
      config refuses its own shared package. Either turn the flag off or convert the three
      enums to `as const` objects with derived union types.
      If you convert them: `Team` is compared in `Discussion.tsx` and will be compared in
      `Results.tsx` in Phase 9, and `Phase` is compared in `GlobalPhaseRouter`. Check
      every consumer on both sides of the wire.

- [ ] **0.5 — Clear the remaining type errors.**
      `characters.ts` team literals (12 errors), `sockets.ts:8` wrong generic arity,
      `gameStore.ts:177` phase widened to `string`, three TS6133 unused reads in
      `NightPhase.tsx:69,71` and `Vote.tsx:14`.
      **Exit:** `tsc -p tsconfig.app.json --noEmit` prints nothing and `npm run build`
      succeeds.

### RTL and tokens

- [ ] **0.6 — Flip the document.**
      `index.html:2` → `<html lang="ar-EG" dir="rtl">`. Delete the two stopgap
      `direction: rtl` declarations at `HomePage.css:108` and `:221`. Delete the
      redundant font `<link>` at `index.html:10` and drop `Cinzel` + `DynaPuff` from
      `:11` (loaded, never referenced by any CSS rule).

- [ ] **0.7 — Convert the 12 physical directional CSS declarations.**
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

### The display layer

- [ ] **0.9 — Answer Q-01 and Q-02, then build `src/content/roles.ts`.**
      Read the actual `team` value of each of the 12 classes in
      `Back-End/src/entities/roles/*.ts`. Record them in `docs/CONTENT.md`. Note whether
      Clone's team is static or inherited at runtime.
      Then create `src/content/roles.ts`: one record per role, keyed by the **frozen
      English ID**, holding Arabic name, team, title, lore, ability, and art reference.
      Copy comes from `docs/CONTENT.md` — do not write new copy here.
      Export a lookup that is **case-insensitive**, because the server sends `"Werewolf"`
      while several client maps key on `"werewolf"`.

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

- [ ] **0.12 — Playtest.** One full 6-player game, start to results. Arabic role
      names, RTL layout, placeholder frames, no crashes. **This is the phase gate.**

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
- [ ] **2.3 — Create-game modal.**
- [ ] **2.4 — Join-game modal**, plus the `/join/:code` link path.
- [ ] **2.5 — Verify** no English is visible and all three entry paths work.

---

## Phase 3 — How to Play

- [ ] **3.1** — Delete the four duplicate role lists and the fifth copy of every
      ability sentence in `HowToPlay.tsx:11-45`; read from `content/roles.ts`.
- [ ] **3.2** — Build the page. Read player min/max from `packages/shared`, not the
      hard-coded `6` and `12`.

## Phase 4 — Waiting room

- [ ] **4.1** — Lobby, player list, ready state.
- [ ] **4.2** — Game code display and share.
- [ ] **4.3** — Settings, kick, name change modals.

## Phase 5 — Role reveal

- [ ] **5.1** — Card flip and composition.
- [ ] **5.2** — Confirm and countdown.

## Phase 6 — Night phase

- [ ] **6.1** — Shell, progress strip, timer.
- [ ] **6.2 … 6.13** — one role per session. Order: Werewolf, Seer, Robber,
      Troublemaker, Minion, Mason, Drunk, Insomniac, Joker, Warlock, Oracle, Clone.
- [ ] **6.14** — Q-03, player circle.

## Phase 7 — Discussion

## Phase 8 — Vote

## Phase 9 — Results (includes the R2 fix, D-09)

## Phase 10 — App chrome

## Phase 11 — Pre-launch

---

## Session log

Newest first. One line per session: date, task ID, outcome, anything the next session
needs to know.

<!-- 2026-08-13 — planning docs created. Next: task 0.1. -->
