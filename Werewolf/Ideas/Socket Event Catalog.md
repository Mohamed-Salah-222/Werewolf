# Socket Event Catalog

> All socket events — current + planned. Mark with status.
> Audit based on frontend code. Server events need their own audit pass.

## Legend
- ✅ Current — exists now
- 🔄 Needs refactor — exists but needs rewiring
- 🆕 Planned — doesn't exist yet
- 🗑️ To remove — exists now, should be removed

---

## Client → Server Events (Emitters)

### Game Events

| Event | Status | Used In | Description |
|-------|--------|---------|-------------|
| `joinGame` | ✅ | `HomePage`, `JoinPage`, `WaitingRoom`, `useSocketRejoin` (fallback) | Join a game by code |
| `rejoinGame` | ✅ | `JoinPage`, `useSocketRejoin` | Rejoin after disconnect/refresh |
| `leaveGame` | ✅ | `WaitingRoom` | Leave current game |
| `playerReady` | ✅ | `WaitingRoom` | Toggle ready status |
| `kickPlayer` | ✅ | `WaitingRoom` | Host kicks a player |
| `changeName` | ✅ | `WaitingRoom` | Change display name |
| `settingsUpdate` | ✅ | `WaitingRoom` | Update game settings |
| `startGame` | ✅ | `WaitingRoom` | Host starts the game |
| `confirmRoleReveal` | ✅ | `RoleReveal` | Player confirms they saw their role |
| `performAction` | ✅ | `NightPhase` | Perform night action (role-specific payload) |
| `vote` | ✅ | `Vote` | Cast a vote against a player |
| `skipToVote` | ✅ | `Discussion` | Host skips remaining discussion time |
| `forceVotes` | ✅ | `Vote` | Host forces remaining votes to end voting |
| `restartGame` | ✅ | `Results` | Host starts a new round |
| `pingMeasure` | ✅ | `WaitingRoom` | Volatile ping measurement |
| `reportPing` | ✅ | `WaitingRoom` | Report measured ping to server |

### Voice Events

| Event | Status | Used In | Description |
|-------|--------|---------|-------------|
| `voiceJoin` ✅ | `VoiceConext` | Join voice channel |
| `voiceLeave` | ✅ | `VoiceConext` | Leave voice channel |
| `voiceOffer` | ✅ | `VoiceConext` | WebRTC offer |
| `voiceAnswer` | ✅ | `VoiceConext` | WebRTC answer |
| `voiceIce` | ✅ | `VoiceConext` | WebRTC ICE candidate |
| `voice:join` | 🗑️ | `Rtc` | Legacy voice join (different convention) |
| `voice:offer` | 🗑️ | `Rtc` | Legacy WebRTC offer |
| `voice:answer` | 🗑️ | `Rtc` | Legacy WebRTC answer |
| `voice:ice` | 🗑️ | `Rtc` | Legacy WebRTC ICE candidate |

> Note: `voice-*` (Rtc.tsx) vs `voice*` (VoiceConext.tsx) — two implementations, different naming. Decide which is canonical in [[Decision Log]].

---

## Server → Client Events (Listeners)

### Connection Events

| Event | Status | Listened In | Description |
|-------|--------|-------------|-------------|
| `connect` | ✅ | `useSocketRejoin`, `store/sockets` | Socket connected — triggers rejoin logic |
| `disconnect` | ✅ | `store/sockets` | Socket disconnected |

### Game Events

| Event | Status | Listened In | Description |
|-------|--------|-------------|-------------|
| `playerJoined` | ✅ | `WaitingRoom`, `store/sockets` | Notification of new player |
| `playerLeft` | ✅ | `WaitingRoom`, `store/sockets` | Notification of player leaving |
| `playerListUpdate` | ✅ | `WaitingRoom`, `store/sockets` | Full player list refresh |
| `playerReady` | ✅ | `WaitingRoom`, `store/sockets` | Player ready status changed |
| `playerKicked` | ✅ | `WaitingRoom` | Current player was kicked |
| `playerPings` | ✅ | `WaitingRoom` | Ping results from all players |
| `hostChanged` | ✅ | `WaitingRoom`, `store/sockets` | Host transferred to another player |
| `gameStarted` | ✅ | `WaitingRoom`, `store/sockets` | Game has begun |
| `roleReveal` | ✅ | `WaitingRoom`, `store/sockets` | Role assignment data |
| `playerRoleConfirmed` | ✅ | `RoleReveal` | Another player confirmed their role |
| `roleActionQueue` | ✅ | `RoleReveal`, `NightPhase` | Queue of night actions for this player |
| `groundCards` | ✅ | `RoleReveal`, `NightPhase` | Ground/center cards (certain roles) |
| `nightStarted` | ✅ | `RoleReveal` | Transition to night phase |
| `nightRoleProgress` | ✅ | `NightPhase` | Timer/progress for current role's action |
| `cloneInsomniacResult` | ✅ | `NightPhase` | Clone role saw insomniac's result |
| `cloneOracleResult` | ✅ | `NightPhase` | Clone role saw oracle's result |
| `roleTimer` | ✅ | `NightPhase` | Timer for current action window |
| `actionResult` | ✅ | `NightPhase` | Result of performed night action |
| `discussionStarted` | ✅ | `NightPhase` | Transition to discussion phase |
| `votingStarted` | ✅ | `Discussion` | Transition to voting phase |
| `voteConfirmed` | ✅ | `Vote`, `store/sockets` | Someone cast a vote |
| `voteUpdate` | ✅ | `store/sockets` | Vote tally update |
| `updateGameSnapShot` | ✅ | `store/sockets` | Full game state snapshot (hydrates Zustand store) |
| `gameEnded` | ✅ | `Vote` | Game over — winners, votes, roles |
| `gameRestarted` | ✅ | `Results` | New round started |

### Voice Events

| Event | Status | Listened In | Description |
|-------|--------|-------------|-------------|
| `voiceNewPeer` | ✅ | `VoiceConext` | New peer joined voice |
| `voiceOffer` | ✅ | `VoiceConext` | Incoming WebRTC offer |
| `voiceAnswer` | ✅ | `VoiceConext` | Incoming WebRTC answer |
| `voiceIce` | ✅ | `VoiceConext` | Incoming ICE candidate |
| `voiceLeave` | ✅ | `VoiceConext` | Peer left voice |
| `voice:new-peer` | 🗑️ | `Rtc` | Legacy peer join |
| `voice:offer` | 🗑️ | `Rtc` | Legacy offer |
| `voice:answer` | 🗑️ | `Rtc` | Legacy answer |
| `voice:ice` | 🗑️ | `Rtc` | Legacy ICE |
| `voice:leave` | 🗑️ | `Rtc` | Legacy leave |

---

## Summary

| Category | Active Events | Legacy/Dead Events |
|----------|:------------:|:------------------:|
| Client → Server (game) | 16 | 0 |
| Client → Server (voice) | 5 | 4 |
| Server → Client (connection) | 2 | 0 |
| Server → Client (game) | 25 | 0 |
| Server → Client (voice) | 5 | 5 |
| **Total** | **53** | **9** |

---

## Notes & Open Questions
- `voice-*` (Rtc.tsx) vs `voice*` (VoiceConext.tsx) — two voice impls with different naming. Decide which to keep.
- `performAction` payload is role-dependent — needs typed unions per role
- Should `pingMeasure`/`reportPing` be removed from the refactor? They're volatile/utility, not game logic.
- No chat events exist yet — `chat_message` / `chat_broadcast` need design.
- See [[Discovery/Unknowns & Questions]] for open items.
