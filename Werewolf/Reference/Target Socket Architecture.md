# Target Socket Architecture

> The "after" picture — what we're building toward.

## Design Goals
- **Single entry point** for socket setup on both client and server
- **Handler-per-event** pattern — each event is a clearly named function
- **Middleware chain** for auth, privileges, validation, logging
- **State store** on the client — components never touch `io` directly
- **Full test coverage** for all event handlers

## Server Architecture (Proposed)

```
socket/
├── index.ts           # Setup, middleware, routing
├── middleware/
│   ├── auth.ts        # Verify user identity
│   ├── privileges.ts  # Check role-based permissions
│   └── validate.ts    # Validate event payload schema
├── handlers/
│   ├── game.ts        # join, leave, start, vote
│   ├── room.ts        # create_room, list_rooms
│   └── chat.ts        # send_message, etc.
├── events.ts          # Event name constants
└── types.ts           # Event payload TypeScript types
```

## Client Architecture (Proposed)

```
socket/
├── client.ts          # Connect, disconnect, reconnect
├── events.ts          # Event name constants (shared?)
└── dispatch.ts        # Map socket events → store actions
```

## Event Flow

```
Client Action
  → socket.emit("vote", { target: "player_123" })
  → Server middleware: auth → privileges → validate
  → Server handler: game.vote()
  → Server emits "game_state" update
  → Client listener receives event
  → Client dispatches to state store
  → React components re-render from store
```

## Related
- [[Phases]] — execution phases to get here
- [[Ideas/Socket Event Catalog]]
- [[Ideas/Privilege Model]]
