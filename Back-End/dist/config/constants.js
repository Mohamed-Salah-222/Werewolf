"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_MESSAGES = exports.SOCKET_EVENTS = exports.VALIDATION = exports.getRoleDistribution = exports.ROLE_ACTION_ORDER = exports.ROLE_NAMES = exports.Team = exports.Phase = exports.DEFAULT_TIMER = exports.TimerOption = exports.NUMBER_OF_GROUND_ROLES = exports.MIN_PLAYERS = exports.MAX_PLAYERS = void 0;
// GAME LIMITS
exports.MAX_PLAYERS = 10;
exports.MIN_PLAYERS = 6;
exports.NUMBER_OF_GROUND_ROLES = 3;
// TIMER OPTIONS (in minutes)
var TimerOption;
(function (TimerOption) {
    TimerOption[TimerOption["Short"] = 4] = "Short";
    TimerOption[TimerOption["Medium"] = 6] = "Medium";
    TimerOption[TimerOption["Long"] = 8] = "Long";
    TimerOption[TimerOption["VeryLong"] = 10] = "VeryLong";
})(TimerOption || (exports.TimerOption = TimerOption = {}));
exports.DEFAULT_TIMER = TimerOption.Medium;
// GAME PHASES
var Phase;
(function (Phase) {
    Phase["Waiting"] = "waiting";
    Phase["Role"] = "role";
    Phase["Night"] = "night";
    Phase["Discussion"] = "discussion";
    Phase["Vote"] = "vote";
    Phase["EndGame"] = "endGame";
})(Phase || (exports.Phase = Phase = {}));
// TEAMS
var Team;
(function (Team) {
    Team["Villains"] = "werewolves";
    Team["Heroes"] = "villagers";
    Team["Joker"] = "joker";
})(Team || (exports.Team = Team = {}));
// ROLE NAMES
exports.ROLE_NAMES = {
    WEREWOLF: "Werewolf",
    MINION: "Minion",
    SEER: "Seer",
    MASON: "Mason",
    ROBBER: "Robber",
    TROUBLEMAKER: "Troublemaker",
    CLONE: "Clone",
    DRUNK: "Drunk",
    INSOMNIAC: "Insomniac",
    JOKER: "Joker",
};
// ROLE ACTION ORDER
// Roles perform actions in this exact order during Night phase
exports.ROLE_ACTION_ORDER = [
    exports.ROLE_NAMES.WEREWOLF,
    exports.ROLE_NAMES.MINION,
    exports.ROLE_NAMES.CLONE,
    exports.ROLE_NAMES.SEER,
    exports.ROLE_NAMES.MASON,
    exports.ROLE_NAMES.ROBBER,
    exports.ROLE_NAMES.TROUBLEMAKER,
    exports.ROLE_NAMES.DRUNK,
    exports.ROLE_NAMES.INSOMNIAC,
];
// ROLE DISTRIBUTION
// Werewolf count increases to 3 if player count is high
const getRoleDistribution = (playerCount) => {
    let werewolfCount = 2;
    if (playerCount && playerCount >= 9) {
        werewolfCount = 3;
    }
    return {
        [exports.ROLE_NAMES.WEREWOLF]: werewolfCount,
        [exports.ROLE_NAMES.MINION]: 1,
        [exports.ROLE_NAMES.SEER]: 1,
        [exports.ROLE_NAMES.MASON]: 2,
        [exports.ROLE_NAMES.ROBBER]: 1,
        [exports.ROLE_NAMES.TROUBLEMAKER]: 1,
        [exports.ROLE_NAMES.CLONE]: 1,
        [exports.ROLE_NAMES.DRUNK]: 1,
        [exports.ROLE_NAMES.INSOMNIAC]: 1,
        [exports.ROLE_NAMES.JOKER]: 1,
    };
};
exports.getRoleDistribution = getRoleDistribution;
// VALIDATION
exports.VALIDATION = {
    PLAYER_NAME_MIN_LENGTH: 2,
    PLAYER_NAME_MAX_LENGTH: 20,
    GAME_CODE_LENGTH: 6,
};
// SOCKET EVENTS 
exports.SOCKET_EVENTS = {
    // Client -> Server
    CLIENT: {
        JOIN_GAME: "joinGame",
        LEAVE_GAME: "leaveGame",
        START_GAME: "startGame",
        PLAYER_READY: "playerReady",
        PERFORM_ACTION: "performAction",
        VOTE: "vote",
        RESTART_GAME: "restartGame",
    },
    // Server -> Client
    SERVER: {
        PLAYER_JOINED: "playerJoined",
        PLAYER_LEFT: "playerLeft",
        PLAYER_LIST_UPDATE: "playerListUpdate",
        GAME_STARTED: "gameStarted",
        ROLE_REVEAL: "roleReveal",
        NIGHT_STARTED: "nightStarted",
        YOUR_TURN: "yourTurn",
        WAIT_FOR_TURN: "waitForTurn",
        ACTION_RESULT: "actionResult",
        DISCUSSION_STARTED: "discussionStarted",
        TIMER_TICK: "timerTick",
        VOTING_STARTED: "votingStarted",
        VOTE_CONFIRMED: "voteConfirmed",
        GAME_ENDED: "gameEnded",
        ERROR: "error",
    },
};
// ERROR MESSAGES
exports.ERROR_MESSAGES = {
    GAME_NOT_FOUND: "Game not found",
    GAME_ALREADY_STARTED: "Game has already started",
    GAME_FULL: "Game is full",
    INVALID_PLAYER_NAME: "Invalid player name",
    PLAYER_NOT_FOUND: "Player not found",
    DUPLICATE_PLAYER_NAME: "A player with this name already exists",
    NOT_ENOUGH_PLAYERS: `Need at least ${exports.MIN_PLAYERS} players to start`,
    INVALID_ACTION: "Invalid action for this role",
    NOT_YOUR_TURN: "It is not your turn",
    INVALID_PHASE: "Action not allowed in this phase",
    UNKNOWN_ERROR: "An unexpected error occurred. Please try again or contact support if the issue persists.",
};
// Game configuration constants
// Number of players , Timers , etc 
