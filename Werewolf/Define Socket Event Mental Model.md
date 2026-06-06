# Define Socket Event Mental Model

> What counts as a socket event — and what doesn't.

## Core Principle
**Sockets are for real-time game communication only.**
Everything else (auth, data fetching, history) should use REST/HTTP.

## What Should Be a Socket Event

| Criteria | Examples |
|----------|----------|
| Needs real-time push to other players | `vote`, `chat_message`, `phase_change` |
| Game state mutation | `join_game`, `start_game`, `end_turn` |
| Server→Client state broadcasts | `game_state`, `player_joined`, `phase_change` |

## What Should NOT Be a Socket Event

| Criteria            | Examples                                                       |
| ------------------- | -------------------------------------------------------------- |
| One-time data fetch | Loading game history, player profiles                          |
| Auth / login        | Use HTTP endpoints                                             |
| Admin operations    | Ban player, view logs (could be HTTP or separate admin socket) |

## Event Shape (Proposed)

```typescript
// Client → Server
interface ClientEvent {
  event: string;      // e.g. "vote"
  payload: unknown;   // event-specific data
  timestamp: number;  // client timestamp
}

// Server → Client
interface ServerEvent {
  event: string;
  payload: unknown;
  timestamp: number;
}
```

## Related
- [[Ideas/Socket Event Catalog]]
- [[Ideas/Privilege Model]]
- [[Discovery/Unknowns & Questions]]
