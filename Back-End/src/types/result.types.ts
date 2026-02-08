// TypeScript types/interfaces for game-related data
// Properties: player, action, result
// Used by: Manager, socketHandlers
// Emits events that socketHandlers listens to
// Used by: Manager, socketHandlers

export type Result = {
  ok: boolean;
  request: RequestType;
  result: string;
};


export enum RequestType { playerJoin, playerLeave, playerListUpdate, gameStarted, roleReveal, nightStarted, yourTurn, waitforTurn, actionResult, discussionStarted, timerTick, votingStarted, voteConfirmed, gameEnded, error }
