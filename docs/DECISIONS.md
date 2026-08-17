# DECISIONS

Append-only. Never edit or delete a past entry. To change a decision, add a new one
that says "Supersedes D-XX".

Status values: **LOCKED** (do not revisit) · **OPEN** (needs an answer before the
phase that depends on it) · **SUPERSEDED**.

---

## D-01 — Role IDs are frozen. Arabic names are a display layer.

**LOCKED · 2026-08-13**

The English role identifiers (`"Werewolf"`, `"Seer"`, …) stay exactly as they are in
the backend, on the wire, in `sessionStorage`, and in tests. A client-side map
resolves them to Arabic at render time.

_Why:_ `Role.name` is simultaneously the win-condition key (`VoteResolver.ts:43,69,82`),
the night-queue match (`Game.ts:367`), the timer map key (`NightPhaseManager.ts:11-24`),
and the client's action-UI dispatch key (`NightPhase.tsx:114,177`). There are ~60
hard-coded comparisons and 11 duplicate lists. A rename touches all of them at once and
fails **silently** — the player sees a blank action screen, their timer expires, and
the server auto-plays a random action for them.

_Consequence:_ backend changes for the reskin ≈ zero. 77 test assertions keep passing.

---

## D-02 — The 12 role names.

**LOCKED · 2026-08-13**

| Code ID (frozen) | Arabic UI name |
| ---------------- | -------------- |
| `Werewolf`       | حرامي          |
| `Minion`         | عصفورة         |
| `Clone`          | كوافير         |
| `Seer`           | خالتي اللتاتا  |
| `Mason`          | غفير           |
| `Robber`         | ديلر           |
| `Troublemaker`   | بلطجي          |
| `Drunk`          | حشاش           |
| `Joker`          | جوكر           |
| `Insomniac`      | جاضض           |
| `Warlock`        | شيخ الحارة     |
| `Oracle`         | دجال           |

Full copy (title, lore, ability text) lives in `docs/CONTENT.md`.

---

## D-03 — Team names change in UI only; the `Team` enum is untouched.

**LOCKED · 2026-08-13**

`villain` / `village` / `neutral` remain the wire values. Arabic labels are resolved
client-side, same mechanism as role names.

Proposed labels — see **Q-02**, not yet confirmed:

- `villain` → فريق الحرامية
- `village` → فريق الحارة
- `neutral` → لوحده

---

## D-04 — Character art is placeholder until real art exists.

**LOCKED · 2026-08-13**

Every place a character image appears renders a `<RoleFrame>` component: the themed
parchment/brass frame at the correct aspect ratio, with a neutral watermark inside and
the role name on the plate above it. No character illustration.

Swapping in real art later = drop a file in `assets/` and change one line in the role
manifest. Nothing else moves.

---

## D-05 — All card art is textless. Names and abilities are DOM text over the frame.

**LOCKED · 2026-08-13**

_Why:_ the 24 existing `*_card*.webp` files have English role names and full ability
sentences painted into the pixels — confirmed in `werewolf_card.webp` ("WEREWOLF" +
"Know The Other Werewolves / or / Peek at 1 Ground Card") and `seer_card_small.webp`
("SEER"). Baked text means every copy tweak is a redraw.

The pattern already exists and works in this repo: `lore.webp` and `ability.webp` are
deliberately blank plates with text positioned over them
(`HomePage.tsx:262-269`, `HomePage.css:215-230`). The owner's own home-screen mock
uses it too — name on a wood plate above the art, team and ability on ribbon banners
below.

**All 24 existing card images are therefore dead.** They are not translated, not
edited, and not shipped.

---

## D-06 — Western numerals (0123), not Arabic-Indic (٠١٢٣).

**LOCKED · 2026-08-13**

Applies to timers, vote counts, player counts, game codes, and the how-to-play
numbering. No `Intl` or `toLocale*` calls are needed anywhere.

---

## D-07 — Server prose is bypassed, not translated.

**LOCKED · 2026-08-13**

The server sends finished English sentences the client renders verbatim —
`lastActionResult.message`, `actionHistory[].description`, `roleDescription`,
`groundCards[].label`, and Oracle's 25 hand-written vision lines
(`Oracle.ts:69-160`).

**The client ignores every one of these `message` strings** and builds the Arabic
sentence itself from the structured fields that already sit alongside them in the same
payload (e.g. `SeerAction.tsx` already reads `actionResult.playerName` directly).

Backend edits are permitted **only** where a role's action result lacks a structured
field the client needs. Expected to be a handful of small additions — never a
deletion, never a change to an existing field name. Each one is logged as its own
decision entry when it happens.

_Why not translate the backend:_ Arabic in game logic breaks ~20 test assertions that
match on English prose, makes every future copy change a backend deploy, and couples
language to the server forever.

---

## D-08 — RTL is a single `dir` flip plus twelve CSS edits.

**LOCKED · 2026-08-13**

`<html lang="ar-EG" dir="rtl">` at the document root, then convert the **12** physical
directional declarations in the whole 8,420-line CSS codebase to logical properties.

Do **not** add `direction: rtl` per-component. Two such declarations already exist
(`HomePage.css:108,221`) as a stopgap and are removed in Phase 0.

Separately tracked, because `dir` does not fix them:

- the player circle (`roleHelpers.ts:27-48` — trigonometry, see **Q-03**)
- the two horizontal scrollers using `scrollLeft` (`NightRoleProgress.tsx:50-58`,
  `HomePage.tsx:341,393`)
- swipe direction (`HomePage.tsx:196-211`)
- two chevron SVGs and two `→` arrows

---

## D-09 — R2 (Results screen) is fixed during Phase 9, not before.

**LOCKED · 2026-08-13**

`Results.tsx:11-13,24-26,60-77` compares winners against `"werewolves"`/`"villagers"`/
`"joker"`; the server sends `"villain"`/`"village"`/`"neutral"`. Today the banner
prints the raw word `villain` and **every player is told they lost, including the
winners.**

The page is being rebuilt in Phase 9 anyway. `Discussion.tsx:24-29` already does this
comparison correctly using the `Team` enum — copy that pattern.

---

## D-10 — Planning docs in English; all user-facing copy in Egyptian Arabic.

**LOCKED · 2026-08-13**

The codebase, identifiers, comments, and these docs are English so agents and code
agree. Everything a player reads is Egyptian Arabic (عامية), not MSA.

---

## D-11 — `Alyamama` is the display face.

**LOCKED · 2026-08-13**

Already loaded (`index.html:11`) and already wired as `--font-display`. `Cinzel` and
`DynaPuff` are loaded and never used — removed in Phase 0. `index.html:10` is fully
redundant with `:11` — removed.

Body font: see **Q-04**. `Lexend` has no Arabic coverage, so `--font-body` currently
resolves to a fallback for every Arabic string. Interim behaviour is to use
`--font-display` everywhere.

---

## D-12 — Dead code blocking the reskin is deleted in Phase 0, not worked around.

**LOCKED · 2026-08-13**

Specifically:

- `HomePage.tsx:272-441` — ~170 lines hidden by `display:none`, including a
  **duplicate copy of the create/join modals**. A future session will otherwise edit
  the wrong one.
- Voice chat client — 469 LOC across 3 files, every call site commented out, and
  `VoiceConext.tsx:2` imports a module deleted in commit `f33e49e` so it cannot
  compile. Server half stays (harmless, unreferenced).
- `WaitingForTurn.tsx` — exported, imported by nothing.
- Orphaned assets — ~7.6 MB, including 12 PNGs in `public/assets/units/` that are
  **served publicly at the deploy root today** and include `hunter.png` / `tanner.png`
  for roles that don't exist in this game.

---

## D-13 — Frontend typecheck must pass before Phase 1.

**LOCKED · 2026-08-13**

`tsc -p tsconfig.app.json --noEmit` currently reports 20+ errors, so `npm run build`
fails and TypeScript is not catching anything. Until it's green, a reskin-introduced
type error is indistinguishable from the existing noise.

Root causes: `erasableSyntaxOnly: true` (`tsconfig.app.json:30`) rejects the shared
package's three enums; `characters.ts` team literals; the deleted-module import in
`VoiceConext.tsx`; wrong generic arity in `sockets.ts:8`.

---

## D-14 — The game is a phone-shaped app on every device. No desktop layout exists.

**LOCKED · 2026-08-13**

A fixed **430×932** frame, always. On anything larger it is centred and letterboxed;
on anything smaller it scales down proportionally. It never reflows, never rearranges,
and there is no tablet or desktop variant.

Surround color is `--void: #0E0B08` — a very dark warm brown, **not pure black**.
`#000` next to warm parchment reads as a rendering failure rather than as a deliberate
edge. A soft vignette where the frame meets the void sells it as depth.

_Already partly true in code:_ `index.css:52-60` locks `#root` to `aspect-ratio:
430/932` with `max-height` and `overflow: hidden`, and `body` also sets `overflow:
hidden`. Task 0.8b formalises it and adds the surround.

**Consequences that bind every later phase:**

- **Any media query that changes layout is a bug.** The only permitted media query is
  the one that scales the frame to fit the viewport.
- Never use `vw`/`vh` for anything inside the frame — they measure the browser
  window, not the frame. Use `%`, `px`, or frame-relative custom properties.
- The frame is `overflow: hidden`, so **overflowing Arabic text is clipped, not
  scrolled**. See the overflow section in `docs/DESIGN.md` — this is the single most
  likely way a page in this project breaks.

---

# OPEN QUESTIONS

## Q-01 — Which team is each role on, per the code?

**OPEN · blocks Phase 0 (task 0.4)**

`docs/CONTENT.md` has a team column filled from ONUW convention, but Clone, Warlock,
and Oracle are ambiguous in this codebase. The answer is in the `team` field of each
class in `Back-End/src/entities/roles/*.ts` and in `Front-End/src/characters.ts:42+`.

**Read it from the code, do not assume.** Clone in particular may inherit the copied
role's team at runtime.

## Q-02 — Confirm the three Arabic team labels.

**OPEN · blocks Phase 0 (task 0.4)**

Proposed in D-03. The orphaned `team.webp` asset says **فريق الحرامية**, which
confirms the villain label. Village and neutral are unconfirmed.

## Q-03 — Should the player circle mirror under RTL?

**OPEN · blocks Phase 6**

`roleHelpers.ts:27-48` seats players clockwise from the top using
`Math.cos/sin(270° + i·step)`. `dir="rtl"` does not affect it — it's trigonometry.
Mirroring is a one-line sign flip. Design call, not a bug.

## Q-04 — Body font for Arabic.

**OPEN · blocks Phase 1**

`--font-body: Lexend` has no Arabic glyphs. Options: use `Alyamama` for everything
(simplest, risks monotony at small sizes), or add a second Arabic face for body text.
Also unverified: whether `Alyamama` actually resolves on Google Fonts and renders
correctly on iOS and Android — needs testing on a real device.

## Q-05 — Is the character carousel coming back?

**OPEN · blocks Phase 2**

The deleted `display:none` block contained a full character showcase carousel. The
live layout replaced it with a single-image swipe panel whose array has exactly one
entry (`HomePage.tsx:19`). The owner's mock shows one large character panel with what
look like swipe affordances. Single panel with swipe-through-12, or grid, or carousel?

## Q-06 — What replaces the auto-assigned English joke names?

**OPEN · blocks launch, not blocking any phase**

`gameHandlers.ts:7` assigns a name from a 12-entry English joke pool to anyone joining
via share link with empty `sessionStorage`. One entry is `"Honor Hitler"`. This is a
backend string, so it violates the "frontend only" boundary — but it cannot ship.
Cheapest frontend-only fix: never send an empty name, prompt on `JoinPage` instead.
