import { PlayerId } from "./game.types";
import { Settings } from "./game.types";

// Client -> Server events (what frontend sends)
export interface ClientToServerEvents {
  joinGame: (data: JoinGameData, callback: (response: JoinGameResponse) => void) => void;
  leaveGame: (data: { gameCode: string; playerId: PlayerId }) => void;
  startGame: (data: { gameCode: string; playerId: PlayerId }) => void;
  confirmRoleReveal: (data: { gameCode: string; playerId: PlayerId }) => void;
  performAction: (data: { gameCode: string; playerId: PlayerId; action: any }) => void;
  vote: (data: { gameCode: string; playerId: PlayerId; votedPlayerId: PlayerId }) => void;
  restartGame: (data: { gameCode: string; playerId: PlayerId }) => void;
  skipToVote: (data: { gameCode: string; playerId: PlayerId }) => void;
  playerReady: (data: { gameCode: string; playerId: PlayerId; ready: boolean }) => void;
  kickPlayer: (data: { gameCode: string; hostId: PlayerId; kickedPlayerId: PlayerId }) => void;
  voiceJoin: (data: { gameCode: string; playerId: PlayerId }) => void;
  voiceOffer: (data: { to: PlayerId; offer: any }) => void;
  voiceAnswer: (data: { to: PlayerId; answer: any }) => void;
  voiceIce: (data: { to: PlayerId; candidate: any }) => void;
  voiceLeave: (data: { playerId: PlayerId }) => void;
  settingsUpdate: (data: { gameCode: string; playerId: PlayerId; settings: Settings }) => void;
  rejoinGame: (data: RejoinGameData, callback: (response: RejoinGameResponse) => void) => void;
  pingMeasure: (data: { gameCode: string; playerId: string }, callback: () => void) => void;
  reportPing: (data: { gameCode: string; playerId: string; ping: number }) => void;
  forceVotes: (data: { gameCode: string; playerId: string }, callback?: (response: { success: boolean; error?: string }) => void) => void;
  changeName: (data: { gameCode: string; playerId: string; newName: string }, callback: (response: { success: boolean; error?: string }) => void) => void;
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
  playerReady: (data: { playerId: PlayerId; ready: boolean }) => void;
  playerKicked: (data: { kickedPlayerId: PlayerId }) => void;
  voiceNewPeer: (data: { playerId: PlayerId }) => void;
  voiceOffer: (data: { from: PlayerId; offer: any }) => void;
  voiceAnswer: (data: { from: PlayerId; answer: any }) => void;
  voiceIce: (data: { from: PlayerId; candidate: any }) => void;
  voiceLeave: (data: { playerId: PlayerId }) => void;
  voiceExistingPeers: (data: { players: PlayerId[] }) => void;
  playerRoleConfirmed: (data: { playerId: PlayerId }) => void;
  nightRoleProgress: (data: { roleName: string; seconds: number }) => void;
  roleTimer: (data: { roleName: string; seconds: number }) => void;
  cloneInsomniacResult: (data: any) => void;
  hostChanged: (data: { newHostId: string }) => void;
  playerPings: (data: Record<string, number>) => void;
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

interface GameEndedData {
  winners: string;
  isDraw: boolean;
  eliminatedPlayerId: string | null;
  votes: Array<{ voter: string; vote: string }>;
  playerRoles: Array<{ playerId: string; name: string; role: string }>;
  actionHistory: Array<{ role: string; playerName: string; description: string }>;
}

export interface RejoinGameData {
  gameCode: string;
  playerId: string;
  playerName: string;
}

export interface RejoinGameResponse {
  success: boolean;
  playerId?: string;
  playerName?: string;
  phase?: string;
  roleInfo?: {
    roleName: string;
    roleTeam: string;
    roleDescription?: string;
    currentRoleName: string;
  } | null;
  groundCardsInfo?: Array<{ id: string; label: string }> | null;
  hasPerformedAction?: boolean;
  hasConfirmedRole?: boolean;
  hasVoted?: boolean;
  players?: Array<{ id: string; name: string }>;
  timerSeconds?: number;
  currentTimerSec?: number;
  startedAt?: number;
  currentActiveRole?: string;
  lastActionResult?: any;
  error?: string;
}
