# Privilege Model

> Who can do what on sockets?

## Roles

| Role | Description |
|------|-------------|
| `unauthenticated` | Not logged in — only `create_room` maybe |
| `authenticated` | Logged in, not in a game |
| `player` | In an active game |
| `host` | Created the room / started the game |
| `admin` | Platform-level admin (future) |

## Permission Matrix

| Event | unauthenticated | authenticated | player | host | admin |
|-------|:-:|:-:|:-:|:-:|:-:|
| `create_room` | ❌ | ✅ | ✅ | — | ✅ |
| `join_game` | ❌ | ✅ | ❌ | — | ✅ |
| `start_game` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `vote` | ❌ | ❌ | ✅ | ❌ | ❌ |
| `kick_player` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `spectate` | ✅ | ✅ | ❌ | ❌ | ✅ |

> `—` = role not applicable

## Open Questions
- How to enforce on the server? Middleware chain?
- Should privilege be checked at the handler level or at a routing level?
- See [[Unknowns & Questions]] for more.

## Related
- [[Socket Event Catalog]]
- [[Reference/Target Socket Architecture]]
