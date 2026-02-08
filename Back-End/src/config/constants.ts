// GAME LIMITS
export const MAX_PLAYERS = 12;
export const MIN_PLAYERS = 6;
export const NUMBER_OF_GROUND_CARDS = 3;

// TIMER OPTIONS (in minutes)
export enum TimerOption {
  Short = 4,
  Medium = 6,
  Long = 8,
  VeryLong = 10,
}

export const DEFAULT_TIMER = TimerOption.Medium;

// GAME PHASES
export enum Phase {
  Waiting = "waiting",
  Role = "role",
  Night = "night",
  Discussion = "discussion",
  Vote = "vote",
  EndGame = "endGame",
}

// TEAMS
export enum Team {
  WereWolf = "werewolf", 
  Villagers = "villagers", 
  Joker = "joker", 
}

// ROLE NAMES
export const ROLE_NAMES = {
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
} as const;

// ROLE ACTION ORDER
// Roles perform actions in this exact order during Night phase
export const ROLE_ACTION_ORDER = [
  ROLE_NAMES.WEREWOLF,
  ROLE_NAMES.MINION,
  ROLE_NAMES.CLONE,
  ROLE_NAMES.SEER,
  ROLE_NAMES.MASON,
  ROLE_NAMES.ROBBER,
  ROLE_NAMES.TROUBLEMAKER,
  ROLE_NAMES.DRUNK,
  ROLE_NAMES.INSOMNIAC, 
];

// ROLE DISTRIBUTION
// Werewolf count increases to 3 if player count is high
export const getRoleDistribution = (playerCount: number) => {
  const werewolfCount = playerCount >= 9 ? 3 : 2;

  return {
    [ROLE_NAMES.WEREWOLF]: werewolfCount,
    [ROLE_NAMES.MINION]: 1,
    [ROLE_NAMES.SEER]: 1,
    [ROLE_NAMES.MASON]: 2, 
    [ROLE_NAMES.ROBBER]: 1,
    [ROLE_NAMES.TROUBLEMAKER]: 1,
    [ROLE_NAMES.CLONE]: 1,
    [ROLE_NAMES.DRUNK]: 1,
    [ROLE_NAMES.INSOMNIAC]: 1,
    [ROLE_NAMES.JOKER]: 1,
  };
};

// VALIDATION
export const VALIDATION = {
  PLAYER_NAME_MIN_LENGTH: 2,
  PLAYER_NAME_MAX_LENGTH: 20,
  GAME_CODE_LENGTH: 6,
};

// SOCKET EVENTS 
export const SOCKET_EVENTS = {
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
export const ERROR_MESSAGES = {
  GAME_NOT_FOUND: "Game not found",
  GAME_ALREADY_STARTED: "Game has already started",
  GAME_FULL: "Game is full",
  INVALID_PLAYER_NAME: "Invalid player name",
  PLAYER_NOT_FOUND: "Player not found",
  DUPLICATE_PLAYER_NAME: "A player with this name already exists",
  NOT_ENOUGH_PLAYERS: `Need at least ${MIN_PLAYERS} players to start`,
  INVALID_ACTION: "Invalid action for this role",
  NOT_YOUR_TURN: "It is not your turn",
  INVALID_PHASE: "Action not allowed in this phase",
  UNKNOWN_ERROR: "An unexpected error occurred. Please try again or contact support if the issue persists.",
};
