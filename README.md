# 🐺 Werewolf — One Night Ultimate Werewolf Online

A real-time, multiplayer browser implementation of **One Night Ultimate Werewolf**, the social deduction board game. 6–10 players join a lobby via a game code, receive secret roles, perform hidden night actions, discuss, and vote to eliminate a suspect — all in real time.

## Features

- **10 unique roles** — Werewolf, Minion, Clone, Seer, Mason, Robber, Troublemaker, Drunk, Insomniac, Joker — each with interactive night action UIs
- **Real-time multiplayer** — Socket.IO for instant state sync, room-scoped broadcasts, and typed event contracts
- **Session reconnection** — Drop connection mid-game? Rejoin from any phase with full state recovery
- **Voice chat** — WebRTC peer-to-peer audio with echo cancellation and noise suppression
- **Timed night phase** — Per-role action slots with auto-action fallback for AFK players
- **Configurable discussion timer** — 4/6/8/10 minute options, host can skip to vote
- **Mobile responsive** — Breakpoints at 768px, 480px, 360px with reduced-motion support
- **Gothic dark theme** — Custom card art, CSS 3D card flips, glow animations, circular player layouts

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript, Vite, React Router v6 |
| Backend | Node.js + TypeScript, Express, Socket.IO |
| Voice | WebRTC (mesh topology, STUN via Google public servers) |
| State | In-memory server-side, localStorage client sessions |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Backend

```bash
cd backend
npm install
npm run dev
```

Server starts on `http://localhost:3000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite dev server starts on `http://localhost:5173`.

### Environment Variables

**Frontend** — Create `.env`:
```
VITE_BACKEND_URL=http://localhost:3000
```

**Backend** — Create `.env`:
```
PORT=3000
NODE_ENV=development
```

## How to Play

1. **Create a game** — One player creates a lobby and shares the 6-character code
2. **Join** — Other players enter the code and their name (6–10 players needed)
3. **Ready up** — All players must be ready before the host can start
4. **Role reveal** — Tap your card to see your secret role, confirm when ready
5. **Night phase** — Roles wake up in order and perform actions (peek, swap, steal)
6. **Discussion** — Talk, accuse, bluff — figure out who the werewolves are
7. **Vote** — Everyone votes to eliminate one player (or vote "No Werewolf")
8. **Results** — See who won, all roles revealed, vote breakdown, and night action timeline

### Win Conditions

- 🟢 **Village** wins if a Werewolf is eliminated
- 🔴 **Werewolves** win if they all survive
- 🟡 **Joker** wins alone if voted out

## Project Structure

```
backend/
├── server.ts              # Entry point: HTTP + Socket.IO + Manager init
├── app.ts                 # Express app: middleware, routes, health check
├── entities/
│   ├── Game.ts            # Core game engine (EventEmitter, state machine)
│   ├── Manager.ts         # Singleton managing all Game instances
│   ├── Player.ts          # Player entity with role management
│   └── roles/             # 10 role classes implementing Role interface
├── socket/
│   ├── socketHandlers.ts  # Socket.IO event handlers (join, action, vote...)
│   └── gameEventListeners.ts  # Game events → Socket.IO broadcasts
├── controllers/
│   └── gameController.ts  # REST endpoints for game CRUD
├── routes/
│   └── gameRoutes.ts      # Express router
├── config/
│   └── constants.ts       # Game limits, phases, role config, validation
├── types/                 # TypeScript interfaces
└── utils/
    └── Logger.ts          # File + console logger

frontend/
├── src/
│   ├── App.tsx            # Router + Context providers
│   ├── pages/             # 7 game phase pages
│   ├── components/
│   │   └── roles/         # 10 role action components + progress tracker
│   ├── contexts/          # GameContext (session), VoiceContext (WebRTC)
│   ├── hooks/             # useGame, useLeaveWarning
│   ├── utils/             # Session persistence, reconnect logic
│   ├── characters.ts      # All character data, card images, styles
│   └── socket.ts          # Socket.IO client instance
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/games/create` | Create a new game |
| GET | `/api/games/` | List all active games |
| GET | `/api/games/:code/check` | Check if a game exists and is joinable |
| GET | `/api/games/:code` | Get full game state |
| DELETE | `/api/games/:code` | Delete a game (waiting phase only) |
| GET | `/health` | Health check |

## Known Limitations

- **No authentication** — Player identity is a random ID, not verified
- **No database** — Game state is in-memory only, lost on server restart
- **No TURN server** — Voice chat fails behind symmetric NATs
- **CORS wildcard** — Should be restricted to frontend domain in production
- **No rate limiting** — Socket events and REST endpoints are unthrottled
- **Draw detection bug** — Vote ties aren't always correctly identified

