"use strict";
// TypeScript types/interfaces for game-related data
// Properties: player, action, result
// Used by: Manager, socketHandlers
// Emits events that socketHandlers listens to
// Used by: Manager, socketHandlers
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestType = void 0;
var RequestType;
(function (RequestType) {
    RequestType[RequestType["playerJoin"] = 0] = "playerJoin";
    RequestType[RequestType["playerLeave"] = 1] = "playerLeave";
    RequestType[RequestType["playerListUpdate"] = 2] = "playerListUpdate";
    RequestType[RequestType["gameStarted"] = 3] = "gameStarted";
    RequestType[RequestType["roleReveal"] = 4] = "roleReveal";
    RequestType[RequestType["nightStarted"] = 5] = "nightStarted";
    RequestType[RequestType["yourTurn"] = 6] = "yourTurn";
    RequestType[RequestType["waitforTurn"] = 7] = "waitforTurn";
    RequestType[RequestType["actionResult"] = 8] = "actionResult";
    RequestType[RequestType["discussionStarted"] = 9] = "discussionStarted";
    RequestType[RequestType["timerTick"] = 10] = "timerTick";
    RequestType[RequestType["votingStarted"] = 11] = "votingStarted";
    RequestType[RequestType["voteConfirmed"] = 12] = "voteConfirmed";
    RequestType[RequestType["gameEnded"] = 13] = "gameEnded";
    RequestType[RequestType["error"] = 14] = "error";
})(RequestType || (exports.RequestType = RequestType = {}));
