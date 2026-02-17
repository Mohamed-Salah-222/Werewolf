import { createContext } from "react";

export interface GameSession {
  gameCode: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
}

export interface RejoinResponse {
  success: boolean;
  playerId?: string;
  playerName?: string;
  phase?: string;
  roleInfo?: {
    roleName: string;
    roleTeam: string;
    roleDescription: string;
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
  lastActionResult?: { message?: string } | null;
  error?: string;
}

export interface GameContextType {
  session: GameSession | null;
  setSession: (session: GameSession) => void;
  endSession: () => void;
}

export const GameContext = createContext<GameContextType | null>(null);
