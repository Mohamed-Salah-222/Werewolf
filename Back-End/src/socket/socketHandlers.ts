// THE REAL-TIME BRAIN - handles all Socket.io events
// Listens to client events:
//   - 'joinGame' → calls manager.joinGame(), emits 'playerJoined' to room
//   - 'startGame' → calls game.start(), listens to game events, emits to clients
//   - 'playerPerformAction' → validates action, calls player.performAction(), emits result
//   - 'playerVote' → calls game.playerVote(), emits vote confirmation
//   - 'disconnect' → removes player from game
// Listens to Game events (EventEmitter):
//   - game.on('gameStarted') → io.to(gameCode).emit('gameStarted', gameData)
//   - game.on('votingStarted') → io.to(gameCode).emit('votingStarted')
// Used by: server.ts (passes io instance to this file)
// This is the BRIDGE between Game logic and clients