# Current Socket Architecture

> What exists now — the "before" picture. Audit completed 2026-06-04.

## Overview

Socket connection is a singleton created in `Front-End/src/socket.ts` using `socket.io-client` with `autoConnect: false`. Listeners and emitters are scattered across pages, a central store file, hooks, and contexts. There are two separate voice chat implementations (`VoiceConext.tsx` and `Rtc.tsx`) with different event naming conventions. Two legacy files are fully commented out (preserved as reference).

## Server Side

| File                          | Purpose                       |
| ----------------------------- | ----------------------------- |
| *(server audit not yet done)* | *(server audit not yet done)* |

### Pain Points
- Event handlers scattered across files
- No middleware / privilege checks
- Error handling inconsistent
- No separation between game logic and transport

## Client Side

### Connection Setup

| File | Purpose |
|------|---------|
| `Front-End/src/socket.ts` | Creates and exports singleton `io()` with `autoConnect: false`, reconnect 10 attempts, 1s-5s backoff |
| `Front-End/.env` | `VITE_BACKEND_URL=http://localhost:3000` |
| `Front-End/src/config.ts` | Exports `API_URL` from env var (shared with REST calls) |
| `Front-End/package.json` | `socket.io-client: ^4.8.3` dependency |

### Central Store (Hub)

| File | Purpose |
|------|---------|
| `Front-End/src/store/sockets.ts` | **138 lines — the core.** 12 `socket.on()` listeners + 18 `socket.emit()` wrappers exported as `gameActions`. Uses `initialized` flag to register listeners once. `updateGameSnapShot` hydrates Zustand store. |

### Pages (Scattered Listeners & Emitters)

| File | Lines of Socket Code | Listens To | Emits |
|------|---------------------|------------|-------|
| `pages/WaitingRoom.tsx` | ~95/599 | `playerKicked`, `playerJoined`, `playerLeft`, `playerListUpdate`, `playerReady`, `hostChanged`, `gameStarted`, `roleReveal`, `playerPings` | `pingMeasure`, `reportPing`, `joinGame`, `startGame`, `settingsUpdate`, `leaveGame`, `playerReady`, `kickPlayer`, `changeName` |
| `pages/NightPhase.tsx` | ~83/628 | `nightRoleProgress`, `cloneInsomniacResult`, `cloneOracleResult`, `groundCards`, `roleActionQueue`, `roleTimer`, `actionResult`, `discussionStarted` | `performAction` |
| `pages/RoleReveal.tsx` | ~53/351 | `playerRoleConfirmed`, `roleReveal`, `roleActionQueue`, `groundCards`, `nightStarted` | `confirmRoleReveal` |
| `pages/Vote.tsx` | ~26/228 | `voteConfirmed`, `gameEnded` | `vote`, `forceVotes` |
| `pages/JoinPage.tsx` | ~25/295 | — | `joinGame`, `rejoinGame` |
| `pages/Discussion.tsx` | ~13/246 | `votingStarted` | `skipToVote` |
| `pages/Results.tsx` | ~14/218 | `gameRestarted` | `restartGame` |
| `pages/HomePage.tsx` | ~5/381 | — | `joinGame` |
| `pages/Rtc.tsx` | ~48/126 | `voice:new-peer`, `voice:offer`, `voice:answer`, `voice:ice`, `voice:leave` | `voice:join`, `voice:offer`, `voice:answer`, `voice:ice` |

### Hooks & Contexts

| File | Lines of Socket Code | Listens To | Emits |
|------|---------------------|------------|-------|
| `hooks/useSocketRejoin.ts` | ~50/105 | `connect` (reconnect) | `rejoinGame`, fallback `joinGame` |
| `contexts/VoiceConext.tsx` | ~60/304 | `voiceNewPeer`, `voiceOffer`, `voiceAnswer`, `voiceIce`, `voiceLeave` | `voiceJoin`, `voiceLeave`, `voiceOffer`, `voiceAnswer`, `voiceIce` |
| `App.tsx` | ~4/41 | Calls `useSockets()` + `useSocketRejoin()` at root | — |

### Commented Out (Dead Code)

| File | Lines | Notes |
|------|-------|-------|
| `utils/reconnect.ts` | 27 lines, all commented | Legacy reconnection utility — used `socket.connected`, `socket.connect()`, emitted `rejoinGame` |
| `contexts/GameContext.tsx` | ~90/294 lines commented | Legacy `GameProvider` — `socket.on("disconnect"/"connect")`, rejoin with phase-based navigation |

### Pain Points
- **Scattered listeners** — 11 different files register `socket.on()`. Hard to trace what listens to what.
- **Inconsistent naming** — `voice-*` (hyphenated, `Rtc.tsx`) vs `voice*` (camelCase, `VoiceConext.tsx`). Same feature, two conventions.
- **Two voice implementations** — `VoiceConext.tsx` (likely active) + `Rtc.tsx` (legacy?). Which is canonical?
- **Dead code preserved** — 117+ lines of commented-out socket code in 2 files. Cleanup opportunity.
- **No tests** — zero socket test files found.
- **Store mixed with listeners** — `store/sockets.ts` does both state management AND listener registration. Not separated.

## Current Event List
See [[Ideas/Socket Event Catalog]] for the full list with statuses.

---

## Audit Log
- ✅ Listed every file that touches sockets (18 total, 16 active + 2 commented)
- ✅ Counted lines of socket-related code
- ✅ Identified dead code that can be removed
- 🟡 Note race conditions / bugs (needs code review pass)
