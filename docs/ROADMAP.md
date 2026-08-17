# ROADMAP

Twelve phases. Strictly ordered — each one assumes everything before it is done.
A phase is finished only when its exit criteria are all true.

Track the atomic work in `docs/TASKS.md`. This file is the *why* and the *when to
stop*.

---

## Phase 0 — Foundations
*Nothing looks different at the end of this phase. That is correct.*

Put the machinery in place before touching a single page: the RTL flip, the design
tokens, the Arabic display layer, the placeholder art component, and a working
typecheck. Delete the dead code that would otherwise cause a future session to edit
the wrong file.

**Exit criteria**
- `tsc -p tsconfig.app.json --noEmit` is clean and `npm run build` succeeds
- `<html lang="ar-EG" dir="rtl">`, and the two per-component `direction: rtl` stopgaps
  are gone
- All 12 physical directional CSS declarations converted to logical properties
- Design tokens from `docs/DESIGN.md` exist in `index.css`
- `src/content/roles.ts` resolves all 12 role IDs → Arabic name, team, title, lore,
  ability — and `src/content/ui.ts` exists, even if nearly empty
- `<RoleFrame>` renders and is used by `roleHelpers` in place of card images
- Dead code and orphaned assets deleted (D-12); repo is ~7.6 MB lighter
- **The game is still playable end to end in English-layout-with-Arabic-role-names.**
  Play one full game before declaring this phase done.

---

## Phase 1 — Component kit
*Build the vocabulary once so eight pages can't drift.*

The mock is built from four repeating physical objects: the **wood plate** (headers,
titles), the **slate button** (anything tappable), the **parchment panel** (content
surfaces), and the **ribbon banner** (section labels). Every page is these four plus
content.

**Exit criteria**
- `src/ui/` contains `Plate`, `Button`, `Panel`, `Banner`, `Input`, `Modal`,
  `RoleFrame`, `Timer`
- Each takes only tokens from `docs/DESIGN.md` — no hard-coded hex anywhere
- A scratch route renders every component in every state for visual review
- Q-04 answered and the body font wired

---

## Phase 2 — Home page
*The one screen that already has a design. Match the mock.*

Rebuild `HomePage.tsx` on the component kit. Three slate buttons, the hanging wood
sign, the character panel, the two ribbon-headed info panels. Create and join modals —
**one copy of each**, the duplicate is already deleted in Phase 0.

**Exit criteria**
- Matches the mock at 430×932
- Create, join-by-code, and join-by-link all work
- No English visible anywhere on the screen
- Q-05 answered and the character panel behaves accordingly

---

## Phase 3 — How to Play
*Does not exist yet. Build it new.*

`HowToPlay.tsx` currently holds **four separate duplicate role lists** plus a fifth
copy of every ability sentence. All five are replaced by reads from
`src/content/roles.ts`. This is the page most likely to silently disagree with the
rest of the game, so it gets zero local data.

**Exit criteria**
- Reads 100% of role data from `content/roles.ts` — grep for a role name literal in
  this file returns nothing
- Player-count minimum and maximum read from `packages/shared` constants, not the
  hard-coded `6` and `12` currently in the JSX
- Reachable from Home and from the Waiting Room

---

## Phase 4 — Waiting room
*Lobby, ready state, game code, settings, kick, name change.*

**Exit criteria**
- Game code stays Latin and displays uppercase (players type lowercase; the round-trip
  already works) — the input is the one place the UI cannot be Arabic
- Share button copy is Arabic and no longer says "Werewolf"
- All-caps English labels replaced — Arabic has no letter case, so emphasis moves to
  weight, size, and color (see `docs/DESIGN.md`)

---

## Phase 5 — Role reveal
*The single most important screen in the game: "what am I?"*

Card flip, `<RoleFrame>` placeholder, name plate, team banner, ability banner —
exactly the composition in the mock.

**Exit criteria**
- All 12 roles render correctly with placeholder art
- Ability text comes from `content/roles.ts`, never from the server's
  `roleDescription`
- Confirm-ready flow and countdown work

---

## Phase 6 — Night phase
*The biggest phase. 12 action components plus the shared shell.*

Each `*Action.tsx` currently hard-codes its own role slug and reads the server's
English `message`. Per D-07, each one is converted to build its Arabic sentence from
the structured result fields. Where a field is missing, that is the only place a
backend edit is allowed — log it as a decision.

Do these **one role per session.** Werewolf and Seer first (they exercise both the
player-target and ground-card patterns); Clone last (it is the most role-string-coupled
code in the repo and it triggers a second follow-up action).

**Exit criteria**
- All 12 action UIs in Arabic, no server prose rendered anywhere
- Night role progress strip scrolls to the correct end under RTL
- Q-03 answered and the player circle matches the decision
- Timer bar has an explicit `transform-origin`
- Play a 12-player game and verify every role's screen

---

## Phase 7 — Discussion
*Timer, action history recap, player list.*

`actionHistory[].description` is server English — same treatment as Phase 6.

**Exit criteria**
- Recap lines built client-side from `{role, playerName}` + structured result
- Timer ring direction decided and consistent
- The client's independent countdown still drifts from the server's — **do not fix
  it here**, it is out of scope; note it and move on

---

## Phase 8 — Vote
*Player grid, vote confirmation, force-votes, the "no thief" option.*

The server sends the sentinel `"noWerewolf"` and the display string `"No Werewolf"`
(`Game.ts:645`). The sentinel stays. The display string is replaced client-side.

**Exit criteria**
- Vote counts in Western numerals, correct Arabic plural handling (see
  `docs/CONTENT.md` — Arabic has six plural forms, the current code uses `n === 1`)
- No English in any confirmation modal

---

## Phase 9 — Results
*Rebuild, and fix R2 while you're in there.*

**Exit criteria**
- Winner comparison uses the `Team` enum, matching `Discussion.tsx:24-29`
- Winners are actually told they won
- Vote arrows point the correct direction for RTL
- Restart flow works

---

## Phase 10 — App chrome
*Everything outside the React tree that still says Werewolf.*

**Exit criteria**
- `<title>`, `manifest.json` name and short_name, theme color
- Favicon is not the stock Vite logo
- PWA icons are actually 192×192 and 512×512 — they are currently 1000×1000 and
  ~1.1 MB each, declared as the wrong size in the manifest
- Share text in Arabic
- `lang="ar-EG"` verified by a screen reader

---

## Phase 11 — Pre-launch
*Blocking items that aren't design work.*

**Exit criteria**
- Q-06 resolved — no player can be auto-assigned an English joke name
- Every unused asset gone; nothing borrowed is served from the deploy root
- Real character art dropped in, if it exists by now; if not, ship with frames
- One full playtest per player count from 6 to 12
- `README.md` no longer describes a different application

---

## Deliberately after launch

Not forgotten, just not now: the three divergent host-migration paths, in-memory game
storage that dies on every restart, `lastActivityAt` never updating, the dual
discussion timers, the short-game-code bug, `.env` tracked in git, and the two roles
missing from the action-history order. All are in `CURRENT_STATE.md` §11.
