# حارتنا — Agent Entry Point

Read this file at the start of every session. Then read `docs/TASKS.md` and pick up
the first unchecked task in the current phase.

---

## What this project is

A social deduction game (mechanically One Night Ultimate Werewolf) being reskinned
from a generic English "Werewolf" theme to **حارتنا** — an old Egyptian alley where a
robbery has happened, and the people around it are the characters.

The game is a React SPA rendered inside a **fixed 430×932 phone frame** — on a phone
and on a laptop alike, where it sits centred and letterboxed. There is no desktop
layout and no responsive design; a media query that changes layout is a bug (D-14).
The backend is Express + Socket.IO and is **working**. This project is a **frontend
reskin**.

## The one rule that governs everything

**Role IDs never change.**

`"Werewolf"`, `"Seer"`, `"Minion"` etc. are frozen forever as opaque identifiers in
code, on the wire, in `sessionStorage`, and in tests. They are the win-condition key,
the night-queue key, and the timer-map key all at once — renaming them breaks the game
in ~60 places with a silent blank screen as the failure mode.

The Arabic names are a **display layer only**, resolved in
`Front-End/src/content/roles.ts` at render time.

```
server sends "Werewolf"  →  client looks up  →  renders حرامي
```

If you ever find yourself editing a role name string in `Back-End/`, stop. You have
misunderstood the task.

## Scope boundaries

**In scope**

- Everything under `Front-End/src/`
- `Front-End/index.html`, `Front-End/public/manifest.json`
- New content/display layers
- `packages/shared/src/roles.ts` and the backend migration onto it — **Phase 0.5
  only**, see D-15. This is the one deliberate backend change: collapsing 11
  duplicate role lists into one registry. It moves no display strings.
- Backend edits **only** where a night-action result lacks the structured fields the
  client needs to build an Arabic sentence (see `docs/DECISIONS.md` D-07)

  Type-only additions to packages/shared are permitted when a type is missing
  or wrong — adding a declared ack, widening an optional field. Renaming or
  removing an existing field is not: both halves and the 61 tests depend on
  those names. If you touch shared, verify the backend typechecks and all 61
  tests pass before reporting.

**Out of scope until the reskin ships**

- Game logic, win conditions, night order, timers
- The 17 non-visual bugs in `CURRENT_STATE.md` §11, **except** R2 (Results screen
  team mismatch), which is fixed as part of Phase 9 because that page is being
  rebuilt anyway
- Voice chat (dead code — deleted in Phase 0, not revived)
- Database, deployment, CI

## Working agreement

1. **One task per session.** Tasks in `docs/TASKS.md` are sized to fit one context
   window. Do not batch them.
2. **Tick the box when done.** Edit `docs/TASKS.md` in the same commit as the work.
3. **Never invent Arabic copy.** All user-facing strings live in
   `docs/CONTENT.md` and `Front-End/src/content/`. If a string you need does not
   exist, add it to `docs/CONTENT.md` first, flag it in your report, and use it.
4. **Role data lives in exactly two places (D-15).** Mechanical facts — team, night
   order, timer, action type, deck threshold — in `packages/shared/src/roles.ts`.
   Arabic copy — name, title, lore, ability — in `Front-End/src/content/roles.ts`.
   Nothing display-facing crosses the wire, and a twelfth copy of the role list is
   never the answer to anything.
5. **Never invent a design token.** Colors, spacing, radii, and shadows come from
   `docs/DESIGN.md`. If you need a value that isn't there, say so rather than
   picking one.
6. **A decision that outlives the session goes in `docs/DECISIONS.md`.** Append only.
   Never rewrite a past decision — supersede it with a new numbered entry.
7. **Report at the end of every session** in this shape:
   - What changed (files touched)
   - What I decided that wasn't in the docs
   - What I could not do and why
   - What the next session should start with

## Repo map

```
Front-End/src/
  pages/           HomePage, WaitingRoom, RoleReveal, NightPhase,
                   Discussion, Vote, Results, JoinPage
  components/      HowToPlay, CardModal, ShareButton, roles/*Action.tsx
  content/         [NEW] Arabic copy layer — roles.ts, ui.ts (D-15)
  ui/              [NEW] shared themed primitives — Plate, Banner, Panel, ...
  characters.ts    role → art + copy manifest (existing seam, being rewritten)
  utils/roleHelpers.ts   role → image resolution
  store/gameStore.ts     single client ingestion point for server state
  index.css        design tokens + the #root phone frame
Back-End/src/      DO NOT TOUCH except per D-07
packages/shared/   types, socket event names, constants, roles.ts registry (D-15)
docs/              this plan
```

## Reference

`CURRENT_STATE.md` in the repo root is a full read-only audit of the codebase as of
2026-08-13. It is accurate and cites file:line. Consult it before grepping — it has
probably already answered your question. It is a snapshot, not a live document; where
it conflicts with the code you are looking at, the code wins.
