// src/store/gameStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface GameStore {
  // Session
  gameCode: string | null;
  playerId: string | null;
  playerName: string | null;
  isHost: boolean;

  // Game phase
  phase: "home" | "waiting" | "role" | "night" | "discussion" | "vote" | "results";

  // Role info
  roleName: string | null;
  roleTeam: string | null;
  roleDescription: string | null;
  hasConfirmedRole: boolean;

  // Night phase
  roleQueue: Array<{ roleName: string; seconds: number }>;
  groundCards: Array<{ id: string; label: string }>;
  hasPerformedAction: boolean;
  lastActionResult: Record<string, unknown> | null;
  initialActiveRole: string | null;

  // Discussion
  timerSeconds: number | null;
  currentTimerSec: number | null;
  startedAt: number | null;

  // Vote
  hasVoted: boolean;
  votedForId: string | null;

  // Results
  winners: string | null;
  isDraw: boolean;
  eliminatedPlayerId: string | null;
  votes: Array<{ voter: string; vote: string }>;
  playerRoles: Array<{ playerId: string; name: string; role: string }>;
  actionHistory: Array<{ role: string; playerName: string; description: string }>;

  // Players list
  players: Array<{ id: string; name: string }>;

  // Actions
  setSession: (data: { gameCode: string; playerId: string; playerName: string; isHost: boolean }) => void;
  setIsHost: (isHost: boolean) => void;
  setPhase: (phase: GameStore["phase"]) => void;
  setRoleInfo: (data: { roleName: string; roleTeam: string; roleDescription?: string }) => void;
  setHasConfirmedRole: (value: boolean) => void;
  setNightData: (data: Partial<Pick<GameStore, "roleQueue" | "groundCards" | "initialActiveRole" | "hasPerformedAction" | "lastActionResult">>) => void;
  setGroundCards: (cards: Array<{ id: string; label: string }>) => void;
  setHasPerformedAction: (value: boolean) => void;
  setLastActionResult: (result: Record<string, unknown> | null) => void;
  setInitialActiveRole: (role: string | null) => void;
  setDiscussionData: (data: { timerSeconds: number; currentTimerSec: number; startedAt: number }) => void;
  setHasVoted: (value: boolean) => void;
  setVotedForId: (id: string | null) => void;
  setResultsData: (data: { winners: string; isDraw: boolean; eliminatedPlayerId: string | null; votes: Array<{ voter: string; vote: string }>; playerRoles: Array<{ playerId: string; name: string; role: string }>; actionHistory: Array<{ role: string; playerName: string; description: string }> }) => void;
  setPlayers: (players: Array<{ id: string; name: string }>) => void;
  reset: () => void;
}

const initialState = {
  gameCode: null,
  playerId: null,
  playerName: null,
  isHost: false,
  phase: "home" as const,
  roleName: null,
  roleTeam: null,
  roleDescription: null,
  hasConfirmedRole: false,
  roleQueue: [],
  groundCards: [],
  hasPerformedAction: false,
  lastActionResult: null,
  initialActiveRole: null,
  timerSeconds: null,
  currentTimerSec: null,
  startedAt: null,
  hasVoted: false,
  votedForId: null,
  winners: null,
  isDraw: false,
  eliminatedPlayerId: null,
  votes: [],
  playerRoles: [],
  actionHistory: [],
  players: [],
};

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      ...initialState,

      setSession: (data) =>
        set({
          gameCode: data.gameCode,
          playerId: data.playerId,
          playerName: data.playerName,
          isHost: data.isHost,
        }),

      setIsHost: (isHost) => set({ isHost }),

      setPhase: (phase) => set({ phase }),

      setRoleInfo: (data) =>
        set({
          roleName: data.roleName,
          roleTeam: data.roleTeam,
          roleDescription: data.roleDescription || null,
        }),

      setHasConfirmedRole: (value) => set({ hasConfirmedRole: value }),

      setNightData: (data) => set((state) => ({ ...state, ...data })),

      setGroundCards: (cards) => set({ groundCards: cards }),

      setHasPerformedAction: (value) => set({ hasPerformedAction: value }),

      setLastActionResult: (result) => set({ lastActionResult: result }),

      setInitialActiveRole: (role) => set({ initialActiveRole: role }),

      setDiscussionData: (data) =>
        set({
          timerSeconds: data.timerSeconds,
          currentTimerSec: data.currentTimerSec,
          startedAt: data.startedAt,
        }),

      setHasVoted: (value) => set({ hasVoted: value }),

      setVotedForId: (id) => set({ votedForId: id }),

      setResultsData: (data) =>
        set({
          winners: data.winners,
          isDraw: data.isDraw,
          eliminatedPlayerId: data.eliminatedPlayerId,
          votes: data.votes,
          playerRoles: data.playerRoles,
          actionHistory: data.actionHistory,
        }),

      setPlayers: (players) => set({ players }),

      reset: () => set(initialState),
    }),
    {
      name: "werewolf_game",
    },
  ),
);
