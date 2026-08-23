export type PlayerId = string;

export const TimerOption = {
  Short: 4,
  Medium: 6,
  Long: 8,
  VeryLong: 10,
} as const;
export type TimerOption = (typeof TimerOption)[keyof typeof TimerOption];

export const DEFAULT_TIMER: TimerOption = TimerOption.Medium;

export const Phase = {
  Waiting: "waiting",
  Role: "role",
  Night: "night",
  Discussion: "discussion",
  Vote: "vote",
  EndGame: "endGame",
} as const;
export type Phase = (typeof Phase)[keyof typeof Phase];

export const Team = {
  Villain: "villain",
  Village: "village",
  Neutral: "neutral",
} as const;
export type Team = (typeof Team)[keyof typeof Team];

export type Vote = {
  voter: PlayerId;
  vote: PlayerId;
};

export type Settings = {
  timer: TimerOption;
};

export interface PlayerPrivateData {
  currentRole: string | null;
  originalRole: string | null;
  roleTeam: string | null;
  roleDescription: string | null;
  hasConfirmedRole: boolean;
  hasPerformedAction: boolean;
  hasVoted: boolean;
  votedForId: PlayerId | null;
  lastActionResult: Record<string, unknown> | null;
}

export interface UpdateGamePayload {
  code: string;
  phase: string;
  hostId: PlayerId;
  players: Array<{
    id: PlayerId;
    name: string;
    isReady: boolean;
    hasConfirmedRole: boolean;
    hasVoted: boolean;
    isHost: boolean;
    ping: number;
    isConnected: boolean;
  }>;
  groundCards: Array<{ id: string; label: string }>;
  roleQueue: Array<{ roleName: string; seconds: number }>;
  currentActiveRole: string | null;
  currentActiveRoleIndex: number | null;
  currentActiveRoleStartedAt: number | null;
  nightTimeRemaining: number;
  timer: {
    timerSeconds: number | null;
    currentTimerSec: number | null;
    startedAt: number | null;
  };
  winners: string | null;
  isDraw: boolean;
  eliminatedPlayerId: PlayerId | null;
  resultsVotes: Array<{ voter: string; vote: string }> | null;
  resultsPlayerRoles: Array<{ playerId: string; name: string; role: string }> | null;
  actionHistory: Array<{ playerId: string; role: string; playerName: string; description: string }> | null;
  playerPrivateData: PlayerPrivateData | null;
  yourPlayerId: PlayerId | null;
  roleRevealEndsAt: number | null;
}
