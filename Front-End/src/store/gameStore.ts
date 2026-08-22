// src/store/gameStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UpdateGamePayload } from "@werewolf/shared";

type StorePhase = GameStore["phase"];

const STORE_PHASES: readonly string[] = ["home", "waiting", "role", "night", "discussion", "vote", "results"];

/**
 * The server types `phase` as a bare `string` (game-types.ts:50) and uses the wire
 * name `endGame` where the store says `results`. Narrow rather than widen: an
 * unrecognised phase falls back to the current one, because GlobalPhaseRouter
 * switches on this field and an unknown value renders a blank screen.
 */
function toStorePhase(phase: string, fallback: StorePhase): StorePhase {
  if (phase === "endGame") return "results";
  return STORE_PHASES.includes(phase) ? (phase as StorePhase) : fallback;
}

export interface PlayerInfo {
  id: string;
  name: string;
  isReady: boolean;
  isHost: boolean;
  hasConfirmedRole: boolean;
  hasVoted: boolean;
  ping: number;
  isConnected: boolean;
}

export interface GameStore {
  hydrate: (snapshot: UpdateGamePayload) => void;
  // Session
  gameCode: string | null;
  playerId: string | null;
  playerName: string | null;
  isHost: boolean;

  // Game phase
  phase: "home" | "waiting" | "role" | "night" | "discussion" | "vote" | "results";

  // Role info
  roleName: string | null;
  originalRoleName: string | null;
  currentRoleName: string | null;
  roleTeam: string | null;
  roleDescription: string | null;
  hasConfirmedRole: boolean;

  // Role reveal
  roleRevealEndsAt: number | null;

  // Night phase
  roleQueue: Array<{ roleName: string; seconds: number }>;
  groundCards: Array<{ id: string; label: string }>; hasPerformedAction: boolean;
  lastActionResult: Record<string, unknown> | null;
  initialActiveRole: string | null;
  currentActiveRoleStartedAt: number | null;

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
  players: PlayerInfo[];

  // Actions
  setSession: (data: { gameCode: string; playerId: string; playerName: string; isHost: boolean }) => void;
  setIsHost: (isHost: boolean) => void;
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
  setPlayers: (players: PlayerInfo[]) => void;
  reset: () => void;
}

const initialState = {
  gameCode: null,
  playerId: null,
  playerName: null,
  isHost: false,
  phase: "home" as const,
  roleName: null,
  originalRoleName: null,
  currentRoleName: null,
  roleTeam: null,
  roleDescription: null,
  hasConfirmedRole: false,
  roleRevealEndsAt: null,
  roleQueue: [],
  groundCards: [],
  hasPerformedAction: false,
  lastActionResult: null,
  initialActiveRole: null,
  currentActiveRoleStartedAt: null,
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
      hydrate: (snapshot) =>
        set((state) => {
          const priv = snapshot.playerPrivateData;
          const me = snapshot.players?.find((p) => p.id === snapshot.yourPlayerId);
          return {
            players: snapshot.players ?? [],
            gameCode: snapshot.code,
            playerName: me?.name ?? state.playerName,
            isHost: me?.isHost ?? state.isHost,

            phase: toStorePhase(snapshot.phase, state.phase),

            roleName: priv?.currentRole ?? priv?.originalRole ?? null,
            originalRoleName: priv?.originalRole ?? null,
            currentRoleName: priv?.currentRole ?? null,
            roleTeam: priv?.roleTeam ?? null,
            roleDescription: priv?.roleDescription ?? null,

            hasConfirmedRole: priv?.hasConfirmedRole ?? false,

            roleRevealEndsAt: snapshot.roleRevealEndsAt ?? null,

            roleQueue: snapshot.roleQueue ?? [],
            groundCards: snapshot.groundCards ?? [],

            hasPerformedAction: priv?.hasPerformedAction ?? false,
            lastActionResult: priv?.lastActionResult ?? null,
            initialActiveRole: snapshot.currentActiveRole,
            currentActiveRoleStartedAt: snapshot.currentActiveRoleStartedAt,

            timerSeconds: snapshot.timer?.timerSeconds ?? null,
            currentTimerSec: snapshot.timer?.currentTimerSec ?? null,
            startedAt: snapshot.timer?.startedAt ?? null,

            hasVoted: priv?.hasVoted ?? false,
            votedForId: priv?.votedForId ?? null,

            winners: snapshot.winners ?? null,
            isDraw: snapshot.isDraw ?? false,
            eliminatedPlayerId: snapshot.eliminatedPlayerId ?? null,

            votes: snapshot.resultsVotes ?? [],
            playerRoles: snapshot.resultsPlayerRoles ?? [],
            actionHistory: snapshot.actionHistory ?? [],
          };
        }),
    }),
    {
      name: "werewolf_game",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
