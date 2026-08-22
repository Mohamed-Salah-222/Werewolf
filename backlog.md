# Backlog — الليلة دي كلها بتاعتك

- [x] Audit current state: walk every route/page/component, list which UI strings are still English vs Arabic; write the inventory as a checklist section below.
- [ ] `Front-End/index.html`: `lang="ar"`, Arabic `<title>` (e.g. «الذئب — حكاية قرية مصرية»), keep/verify Arabic webfont (Alyamama) actually loads and is applied.
- [ ] Landing page: full Egyptian Arabic copy + RTL polish + the حكاية (story) section written in Egyptian dialect framing an Egyptian village setting.
- [ ] Role system: map every role to an Egyptianized identity (name in مصري, description, flavor line) in `packages/shared` + Front-End display; e.g. العفاريت / الرمّال / البواب / الحكيم — you decide final roster.
- [ ] Character roster: Egyptian names/personalities for characters, reuse existing art assets, Arabic labels on cards/thumbnails.
- [ ] Create-game & Join-game dialogs: Egyptian Arabic labels, placeholders, validation/error messages.
- [ ] How-to-Play modal: fully Egyptian Arabic, RTL, same info preserved.
- [ ] In-game phases: night/day/discussion/vote screens — all copy in مصري with flavor.
- [ ] Win/lose endings: Egyptian-style storytelling lines for each outcome/team.
- [ ] Final QA: `npm run build` passes, lint passes, screenshot every screen into `screenshots/`, update this file, commit.

---

## 📋 Audit Inventory (cycle 1) — كل اللي لسه إنجليزي

Baseline screenshot: `screenshots/01-audit-before-home-desktop.png`. Current state = **100% English UI**, zero Arabic strings, LTR everywhere.

### Global / shell
- [ ] `index.html`: `lang="en"`, `<title>Werewolf</title>` — flip to `lang="ar" dir="rtl"` + Arabic title.
- [ ] Fonts: Alyamama IS linked in `index.html` line 11 but **never used in any CSS** — `index.css:33` sets system fonts only. Must add Arabic font-family stack + verify rendering.
- [ ] No `dir="rtl"` anywhere; all page CSS assumes LTR (carousel arrows, progress bars, arrows ▲▼, `scrollBy({left:±200})`).
- [ ] **Server→UI leak**: Back-End sends English strings rendered verbatim in FE: kick/host-transfer notices (`Game.ts:187,242`), all role result messages (`Back-End/src/entities/roles/*`), auto-perform messages (`NightPhaseManager.ts:315,326,407,439`), action-history descriptions shown in Results sequence. Needs translation strategy (translate in BE or map by code in FE).

### Route: `/` HomePage.tsx + characters.ts
- [ ] Title `WEREWOLF`; buttons CREATE GAME / JOIN GAME / HOW TO PLAY (`HomePage.tsx:173-201`)
- [ ] Team labels WEREWOLF TEAM / NEUTRAL / VILLAGE TEAM (`teamLabel`, also HowToPlay)
- [ ] COMING SOON placeholder, ABILITY label, aria-labels Scroll left/right
- [ ] Create modal: title, placeholder "Enter your name", CANCEL/CREATING.../CREATE; errors "Name must be at least 2 characters", "Failed to create game", "Could not connect to server"
- [ ] Join modal: "Game Code"/"Enter your name" placeholders, CANCEL/JOINING.../JOIN, "Game code must be 6 characters"
- [ ] `characters.ts`: all 12 roster entries (name/title/description/ability) fully English → Egyptianization (task 4/5)
- [ ] `allCards[].name` (Werewolf…Oracle) shown in CardModal titles + NightRoleProgress labels

### Route: `/join/:code` JoinPage.tsx
- [ ] INVALID LINK / "This game link isn't valid." / GO HOME
- [ ] JOINING GAME... / "Setting up your disguise"
- [ ] GAME IN PROGRESS / "This game has already started. You can't join mid-game."
- [ ] COULDN'T JOIN + dynamic errorMsg

### Route: `/waiting/:code` WaitingRoom.tsx (+ ShareButton)
- [ ] WAITING ROOM, GAME CODE, TAP TO COPY / COPIED!
- [ ] PLAYERS n/12, NEED n MORE / START GAME / n NOT READY, ✓ READY / READY, LEAVE
- [ ] Kick modal: KICK PLAYER, "Remove X from the game?", CANCEL/KICK
- [ ] Rename modal: CHANGE NAME, errors "Name must be at least 2 characters"/"20 characters or less", CANCEL/SAVE
- [ ] Settings modal: SETTINGS, DISCUSSION TIMER, "Minutes per discussion round", timer option labels (keys Short/Medium/Long/VeryLong from shared `TimerOption`) → need Arabic labels
- [ ] Signal tooltip "Measuring..." / Signal: Poor/Fair/Good/Great; aria-labels
- [ ] ShareButton: INVITE FRIENDS / LINK COPIED!, share text "Join my Werewolf game! Code: X", title "Werewolf Game"

### Route: `/role-reveal/:code` RoleReveal.tsx
- [ ] ASSIGNING ROLES / "The fates are being decided..."
- [ ] Status bar "Players", "Tap to reveal your role", "Tap card again to hide it", "Waiting for other players (ns)"
- [ ] I'M READY, LEAVE, alt texts ("Card back")
- [ ] Slackers modal: 💀 BRAIN DEAD / "Still loading their last brain cell" / DISMISS
- [ ] Phase-info modal: ROLE REVEAL flavor + 5 items (REVEAL YOUR ROLE / HIDE YOUR CARD / CONFIRM READY / PLAYER COUNTER / KEEP IT SECRET), GOT IT

### Route: `/night/:code` NightPhase.tsx + roles/*
- [ ] Splash LET THE NIGHT BEGIN; header NIGHT PHASE; role label (uppercase English); UNKNOWN
- [ ] Phase-info modal: flavor "The village sleeps…" + 5 items (YOUR ACTION / PLAYER CIRCLE / ACTIVE ROLE TRACKER / ROLE DETAILS / TIMER), GOT IT
- [ ] WerewolfAction: YOU, LONE WOLF, THE PACK, YOUR PACK modal, CLOSE, "You peeked at this ground card", "You found your pack"
- [ ] SeerAction: PICK ONE MORE, WAITING FOR YOUR TURN..., "n/2 ground cards selected", "Choose a player's card or two ground cards", REVEALING..., "You saw X's role", "You peeked at the ground", "Ground Card n"
- [ ] MinionAction / MasonAction: modal names Werewolf/Minion/Mason; "No brothers found"; BROTHERHOOD
- [ ] RobberAction: "Tap a player's card to steal their role", REACHING OUT..., STEALING..., SWAPPING..., STOLEN, "You are now the X", "Role stolen"
- [ ] TroublemakerAction / DrunkAction / WarlockAction: PICK TWO PLAYERS / A GROUND CARD CALLS / PICK A PLAYER TO HEX, SWAPPING..., SWAPPED/CURSED
- [ ] InsomniacAction: CHECKING..., WAITING TO WAKE...
- [ ] JokerAction: THE JOKE PICKS A CARD, PEEKING..., "Ground card"
- [ ] OracleAction: AWAITING VISION..., RECEIVING VISION..., THE SPIRITS WHISPER..., "A vision has been revealed", "The spirits were silent"
- [ ] CloneAction: "You cloned this role", PICK A PLAYER TO CLONE, CLONING..., CLONED - X, "Tap a player to copy their role", Becoming X...
- [ ] Shared bits: YOU labels across circle layouts; ActionComplete (ACTION COMPLETE / "Your night action is done." / "Waiting for other players..." + server message); WaitingForTurn (THE NIGHT STIRS / "Someone is performing their action..." / "Please wait for your turn"); CardModal CLOSE; NightRoleProgress role-name labels

### Route: `/discussion/:code` Discussion.tsx
- [ ] DISCUSSION title; SHOW/HIDE NIGHT RECAP; YOUR ROLE; WHAT HAPPENED (message = server English)
- [ ] "Time's up! Moving to vote...", SKIP TO VOTE / SKIPPING..., LEAVE
- [ ] Phase-info modal: flavor + TALK IT OUT / NIGHT RECAP / TIMER items, GOT IT

### Route: `/vote/:code` Vote.tsx
- [ ] VOTE SEALED overlay; THE VOTE; "Who do you think is the Werewolf?"
- [ ] "n/m voted"; VOTED badge; "No Werewolf" + hint "All werewolves are on the ground"
- [ ] CONFIRM VOTE; YOUR VERDICT; "Waiting for other players"; "You"
- [ ] Host: FORCE VOTES (n missing) / FORCING...; confirm modal text + WAIT/FORCE IT

### Route: `/results/:code` Results.tsx
- [ ] Winner banner: "Werewolves Win"/"Village Wins"/"Joker Wins"; "You won"/"You lost"
- [ ] Draw block: VOTE RESULT / Draw / "No one was eliminated"
- [ ] No-werewolf block: VILLAGE DECISION / "No Werewolf" / "The village believes all werewolves are on the ground"
- [ ] ELIMINATED label + raw English role string next to name
- [ ] SHOW/HIDE NIGHT SEQUENCE (descriptions = server English) and SHOW/HIDE VOTE DETAILS
- [ ] PLAY AGAIN / RESTARTING... / BACK TO HOME

### Done during this cycle (discovered blockers, fixed)
- [x] Fix broken baseline build (`npm run build` in Front-End failed before any work):
  - `packages/shared/src/game-types.ts`: replaced `enum TimerOption/Phase/Team` with erasable-safe `const` objects + union types (TS5.9 `erasableSyntaxOnly` forbids enums). Back-End recompiled clean against it.
  - `Front-End/src/store/sockets.ts`: `io<T,C>()` → non-generic `io()` (socket.io-client v4 top-level factory takes no type args).
  - `gameStore.hydrate()`: cast server phase string to store phase union.
  - Removed unused locals in `NightPhase.tsx` / `Vote.tsx`.
  - Deleted dead voice-chat files (`VoiceConext.tsx`, `VoiceChat.*`) that imported the long-gone `../socket` module; feature was fully commented out.

### Follow-ups discovered (new tasks)
- [ ] RTL sweep: after Arabic copy lands, fix directional CSS (carousel scroll direction/arrows, timeline dots, vote arrows ▲▼, `text-align`, letter-spacing on Arabic text — remove `letterSpacing` for Arabic, breaks ligatures).
- [ ] Decide & implement translation strategy for server-sent strings (role results, kick/host messages, action history): prefer sending stable codes from BE and mapping to مصري copy in FE, so BE stays locale-free.
- [ ] Arabic typography pass: apply Alyamama via CSS var stack, adjust sizes/line-height for Arabic legibility, verify webfont loads offline (self-host fallback if Google Fonts blocked).
- [ ] `aria-label`s and `alt` texts need Arabic too (screen-reader parity), plus `<html lang>` correctness for fonts/IME.
