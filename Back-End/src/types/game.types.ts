// TypeScript types/interfaces for game-related data
import { Player } from '../entities/Player';
import { Game } from '../entities/game';
import { TimerOption } from '../config/constants';

export type performActionReturn = (game: Game, player: Player) => any;

export type Vote = {
  // ids playerids
  voter: PlayerId;
  vote: PlayerId;
};
export type PlayerId = string;

export type Settings = {
  timer: TimerOption;
}

export interface PlayerPrivateData {
  currentRole: string | null
  originalRole: string | null
  roleTeam: string | null
  roleDescription: string | null
  hasConfirmedRole: boolean
  hasPerformedAction: boolean
  hasVoted: boolean
  votedForId: PlayerId | null
  lastActionResult: Record<string, unknown> | null
}

export interface UpdateGamePayload {
  code: string
  phase: string
  hostId: PlayerId
  players: Array<{
    id: PlayerId
    name: string
    isReady: boolean
    hasConfirmedRole: boolean
    hasVoted: boolean
    isHost: boolean
    ping: number
  }>
  groundCards: Array<{ id: string; label: string }>
  roleQueue: Array<{ roleName: string; seconds: number }>
  currentActiveRole: string | null
  nightTimeRemaining: number
  timer: {
    timerSeconds: number | null
    currentTimerSec: number | null
    startedAt: number | null
  }
  winners: string | null
  isDraw: boolean
  eliminatedPlayerId: PlayerId | null
  resultsVotes: Array<{ voter: string; vote: string }> | null
  resultsPlayerRoles: Array<{ playerId: string; name: string; role: string }> | null
  actionHistory: Array<{ role: string; playerName: string; description: string }> | null

  playerPrivateData: PlayerPrivateData | null
  yourPlayerId: PlayerId | null
}
