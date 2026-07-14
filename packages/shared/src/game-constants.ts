export const MAX_PLAYERS = 12;
export const MIN_PLAYERS = 6;
export const NUMBER_OF_GROUND_ROLES = 3;

export const CLONE_ACTIVE_ROLES = ["seer", "robber", "troublemaker", "warlock"];

export const ROLE_NAMES = {
  WEREWOLF: "Werewolf",
  MINION: "Minion",
  CLONE: "Clone",
  SEER: "Seer",
  MASON: "Mason",
  ROBBER: "Robber",
  TROUBLEMAKER: "Troublemaker",
  DRUNK: "Drunk",
  INSOMNIAC: "Insomniac",
  JOKER: "Joker",
  WARLOCK: "Warlock",
  ORACLE: "Oracle",
} as const;

export const VALIDATION = {
  PLAYER_NAME_MIN_LENGTH: 2,
  PLAYER_NAME_MAX_LENGTH: 20,
  GAME_CODE_LENGTH: 6,
};

export const ERROR_MESSAGES = {
  GAME_NOT_FOUND: "Game not found",
  GAME_ALREADY_STARTED: "Game has already started",
  HOST_ONLY: "Only the host can perform this action",
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
