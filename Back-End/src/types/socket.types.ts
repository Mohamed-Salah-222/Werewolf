import { PlayerId } from "./game.types";

// Client -> Server events (what frontend sends)
export interface ClientToServerEvents {
  joinGame: (data: JoinGameData, callback: (response: JoinGameResponse) => void) => void;
  leaveGame: (data: { gameCode: string; playerId: PlayerId }) => void;
  startGame: (data: { gameCode: string; playerId: PlayerId }) => void;
  confirmRoleReveal: (data: { gameCode: string; playerId: PlayerId }) => void;
  performAction: (data: { gameCode: string; playerId: PlayerId; action: any }) => void;
  vote: (data: { gameCode: string; playerId: PlayerId; votedPlayerId: PlayerId }) => void;
  restartGame: (data: { gameCode: string; playerId: PlayerId }) => void;
  skipToVote: (data: { gameCode: string, playerId: PlayerId }) => void;
  playerReady: (data: { gameCode: string; playerId: PlayerId }) => void;
}

// Server -> Client events (what backend sends)
export interface ServerToClientEvents {
  playerJoined: (data: PlayerJoinedData) => void;
  playerLeft: (data: PlayerLeftData) => void;
  playerListUpdate: (data: PlayerListUpdateData) => void;
  gameStarted: (data: GameStartedData) => void;
  roleReveal: (data: RoleRevealData) => void;
  nightStarted: (roleQueueTimer: { roleName: string; seconds: number }[]) => void;
  roleActionQueue: (roleName: string) => void;
  nextAction: (roleName: string) => void;
  yourTurn: (data: YourTurnData) => void;
  waitForTurn: () => void;
  actionResult: (data: ActionResultData) => void;
  discussionStarted: (data: DiscussionStartedData) => void;
  timerTick: (data: { seconds: number }) => void;
  votingStarted: () => void;
  voteConfirmed: (data: { playerId: PlayerId }) => void;
  gameEnded: (data: GameEndedData) => void;
  error: (data: { message: string }) => void;
  groundCards: (data: { cards: Array<{ id: string; label: string }> }) => void;
  gameRestarted: () => void;
  playerReady: (data: { playerId: PlayerId, ready: boolean }) => void;
}

// Data structures
export interface JoinGameData {
  gameCode: string;
  playerName: string;
}

export interface JoinGameResponse {
  success: boolean;
  playerId?: PlayerId;
  playerName?: string;
  message?: string;
  error?: string;
}

export interface PlayerJoinedData {
  playerId: PlayerId;
  playerName: string;
  playerCount: number;
}

export interface PlayerLeftData {
  playerId: PlayerId;
  playerName: string;
  playerCount: number;
}

export interface PlayerListUpdateData {
  players: Array<{
    id: PlayerId;
    name: string;
  }>;
}

export interface GameStartedData {
  phase: string;
}

export interface RoleRevealData {
  playerId: PlayerId;
  roleName: string;
  roleTeam: string;
  roleDescription?: string;
}

export interface YourTurnData {
  action: string;
  options?: any;
}

export interface ActionResultData {
  success: boolean;
  message: string;
  data?: any;
}

export interface DiscussionStartedData {
  timerSeconds: number;
  currentTimerSec: number;
  startedAt: number;
}

export interface GameEndedData {
  winners: string;
  votes: Array<{ voter: string; vote: string }>;
  playerRoles: Array<{ playerId: PlayerId; name: string; role: string }>;
}
