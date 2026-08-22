# NIGHT BRIEF — إعادة صناعة الذئب على مصرية

You are running autonomously overnight. Nobody will answer you. Never ask questions, never wait for input.

## Goal
Remake this Werewolf game as a fully **Egyptian** experience:
- All user-facing text in **Egyptian Arabic (اللهجة المصرية)** — landing, dialogs, roles, phases, errors, toasts, endings.
- Full RTL layout everywhere user-facing.
- Reimagine roles and characters through **Egyptian culture, folklore, and street life** (e.g. العفاريت instead of werewolves, الرمّال instead of seer، البواب، الحكيم، الصياد…). You own the creative direction — go wild, but keep it coherent and playable.
- Write an engaging Arabic **story (حكاية)** framing the game in an Egyptian village/neighborhood, shown on the landing/intro.
- Keep the existing architecture working: React/Vite Front-End + Node/socket Back-End + packages/shared. Do not break create/join/socket flows.

## Hard rules
1. Work only inside this repo, on branch `egyptian-arabic` (already checked out). Never push. Never touch `refactor/main`.
2. After every milestone: `npm run build` inside `Front-End` must pass before you commit.
3. Take screenshots of every meaningful milestone: `node scripts/shoot.mjs name=/route [--mobile-only|--desktop-only]` → saves into `screenshots/`. It starts/stops its own dev server — just run it from repo root.
4. Update `backlog.md` religiously — it is your ONLY memory between cycles. Mark done items `[x]`, add new tasks as you discover them, prepend `BACKLOG_EMPTY` alone on line 1 when everything is finished.
5. Commit each completed milestone: small, focused, clear messages in English or Arabic.
6. If blocked, write the blocker in `backlog.md`, pick another task. Never stall.
7. Do not edit `night-loop.sh`, this file's contract, or anything outside this repo.

## Definition of done (overall)
A player can open the app, read the Egyptian story, create/join a game, see Egyptianized roles with Arabic names and flavor text, play all phases in مصري, and get an Egyptian-style ending — with zero English leakage in UI copy.

When truly done: reply with exactly `BACKLOG_EMPTY`.
