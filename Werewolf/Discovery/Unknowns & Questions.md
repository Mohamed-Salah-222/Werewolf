# Unknowns & Questions

> Things we don't know yet. Capture as we explore. This is the most important document in the vault right now.

## Scope Unknowns

### 🔴 What is the full extent of frontend changes?
- [x] Identify every file that references old socket code — **done, 16 active + 2 commented files found**
- [ ] Determine if state store replaces all local state or just socket-related state
- [ ] Map each old socket call to its new store equivalent

### 🔴 What socket events do we actually need?
- [x] Audit all current events and their consumers — **done, 53 active events cataloged**
- [ ] Categorize: game logic vs. UI-only vs. admin
- [ ] Identify events that can be merged or removed

### 🔴 How many files need to change?
- [x] Client socket files — **16 active files found (see [[Reference/Current Socket Architecture]])**
- [ ] Server socket files
- [ ] Component files with socket listeners — **9 page files found**
- [ ] Test files — **zero socket tests exist**

## Design Questions

### 🟡 Privilege Model
- [ ] Should we use middleware or decorators?
- [ ] What about spectator role?
- [ ] Should privilege be checked per-event or per-role at connection time?

### 🟡 Event Schema
- [ ] TypeScript types — shared between client and server?
- [ ] Validation — Zod? io-ts? Manual?
- [ ] Error response shape — what does a failed event look like?

### 🟡 State Store
- [x] What existing state management does the frontend use? — **Zustand (`store/sockets.ts` hydrates game store)**
- [ ] Should we piggyback on existing or introduce new?

## Audit Discoveries

### 🟡 Two voice chat implementations
- `contexts/VoiceConext.tsx` — active, uses `voice*` camelCase events
- `pages/Rtc.tsx` — legacy?, uses `voice:*` hyphenated events
- Which is canonical? Should the other be removed?

### 🟡 Inconsistent event naming
- Voice events: `voice*` vs `voice:*` — needs standardization
- Confirm what convention game events use (all camelCase currently)

### 🟡 Dead code cleanup
- `utils/reconnect.ts` — 27 lines, fully commented
- `contexts/GameContext.tsx` — ~90 lines socket code, fully commented
- Worth keeping as reference? Or delete?

### 🟡 pingMeasure/reportPing
- Volatile utility events, not game logic
- Should they stay in the socket refactor or be handled separately?

## Process Questions

### 🟡 Testing
- [ ] What test framework + tooling already exists?
- [ ] Can we test socket handlers without a full server? (unit vs. integration)
- [ ] How do we test privilege scenarios?

---

## When you answer something, move it to [[Decision Log]].
