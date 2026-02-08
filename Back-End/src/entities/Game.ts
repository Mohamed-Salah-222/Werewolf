// Main game class - THE BRAIN
// Extends EventEmitter (so it can emit events like 'gameStarted', 'votingStarted')
// Properties: players[], groundRoles[], phase, code, votes[], timer, winners
// Methods: 
//   - playerJoin(name)
//   - start() → assigns roles, moves to RoleReveal phase
//   - startNight() → moves to Night phase, triggers role actions
//   - playerPerformAction(player, action)
//   - startDiscussion() → starts timer
//   - startVoting()
//   - playerVote(player, vote)
//   - finish() → calculates winners
// Used by: Manager, socketHandlers
// Emits events that socketHandlers listens to

import { EventEmitter } from 'events';
export class Game extends EventEmitter { }
