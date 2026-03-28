import { Phase, Team, TimerOption, DEFAULT_TIMER, ROLE_NAMES, NUMBER_OF_GROUND_ROLES, MIN_PLAYERS, MAX_PLAYERS } from "../../config/constants";

import { Role } from "../roles";
import { Player } from "../Player";
import { EventEmitter } from "events";
import { Logger } from "../../utils/Logger";
import { PlayerId, Settings, Vote } from "../../types/game.types";

import { NightPhaseManager, NightPhaseHost } from "./NightPhaseManager";
import { VoteResolver } from "./Voteresolver";
import { RoleAssigner } from "./Roleassigner";

export class Game extends EventEmitter implements NightPhaseHost {
  players: Player[] = [];
  readyPlayers: Map<PlayerId, boolean> = new Map();
  startedAt: number | null = null;
  allPlayersReady: boolean = false;
  groundRoles: Role[] = [];
  prettyVotes: Vote[] = [];
  code: string;
  votes: Vote[] = [];
  winners: Team;
  timer: TimerOption = DEFAULT_TIMER;
  timerInterval: NodeJS.Timeout;
  phase: Phase = Phase.Waiting;
  numberOfGroundRoles: number = NUMBER_OF_GROUND_ROLES;
  numberOfWerewolf: number;
  numberOfMasons: number;
  numberOfEvents: number = 0;
  confirmedPlayerRoleReveal: PlayerId[] = [];
  confirmedPlayerPerformActions: PlayerId[] = [];
  minimumPlayers: number = MIN_PLAYERS;
  maxPlayers: number = MAX_PLAYERS;
  roleQueue: string[] = [];
  currentGameRolesMap: Map<string, number> = new Map();
  currentTimerSec: number;
  host: PlayerId;
  currentActiveRole: string = "";
  endedAt: number | null = null;
  lastActivityAt: number = Date.now();
  actionHistory: Array<{ role: string; playerName: string; description: string }> = [];
  gamePings: Record<string, number> = {};
  gamePingTimestamps: Record<string, number> = {};
  public nightTimeRemaining: number = 0;

  private availableRoles: Role[] = [];
  private nightManager: NightPhaseManager;
  private voteResolver: VoteResolver;
  private roleAssigner: RoleAssigner;

  constructor(private logger: Logger) {
    super();
    this.code = this.generateCode();

    this.roleAssigner = new RoleAssigner(logger);
    this.voteResolver = new VoteResolver(logger);
    this.nightManager = new NightPhaseManager(this);

    this.availableRoles = this.roleAssigner.createRoles();
    this.roleQueue = this.roleAssigner.createRoleQueue();

    this.numberOfWerewolf = 0; // Set by RoleAssigner internally
    this.numberOfMasons = 0;

    this.logger.info(`available roles: ${this.availableRoles.map((r) => r.name)}`);
    this.logger.info("Game created");
  }

  // ── Player Management ─────────────────────────────────────────────

  playerJoin(name: string): void {
    if (this.phase !== Phase.Waiting) {
      throw new Error("Cannot join a game that has already started");
    }
    this.logger.info(`playerJoin ${name}`);
    if (this.players.find((p) => p.name === name)) {
      throw new Error(`A player with this name (${name}) already joined please chose another name`);
    }
    if (this.players.length >= this.maxPlayers) {
      throw new Error(`Game is full, max players is ${this.maxPlayers}`);
    }
    const player = new Player(name);
    this.players.push(player);
    this.readyPlayers.set(player.id, false);

    if (this.players.length === 1) {
      this.host = this.players[0].id;
    }
    this.newEmit("playerJoin", name);
  }

  playerReady(playerId: PlayerId): boolean {
    let ready = false;
    const toggle = this.readyPlayers.get(playerId);
    if (toggle === undefined) {
      ready = true;
      this.readyPlayers.set(playerId, ready);
    } else {
      ready = !toggle;
      this.readyPlayers.set(playerId, ready);
    }
    if (this.arePlayersReady()) {
      this.allPlayersReady = true;
    }
    return ready;
  }

  updateSettings(settings: Settings): void {
    this.timer = settings.timer;
  }

  getPlayerById(id: string): Player {
    const player = this.players.find((p) => p.id === id);
    if (player !== undefined) {
      return player;
    }

    this.logger.log(`Player with id ${id} not found`);
    throw new Error(`Player with id ${id} not found`);
  }

  // ── Game Lifecycle ────────────────────────────────────────────────

  start(): void {
    if (this.players.length < this.minimumPlayers) {
      throw new Error(`Need at least ${this.minimumPlayers} players to start`);
    }

    if (!this.allPlayersReady) {
      throw new Error("Not all players are ready");
    }

    this.currentGameRolesMap = new Map<string, number>();
    this.roleAssigner.assignRandomRoles(this.players, this.availableRoles, this.currentGameRolesMap);

    for (let i = this.availableRoles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.availableRoles[i], this.availableRoles[j]] = [this.availableRoles[j], this.availableRoles[i]];
    }
    this.groundRoles = this.availableRoles.slice(0, this.numberOfGroundRoles);

    this.roleQueue = this.roleAssigner.buildActiveRoleQueue(this.players, this.groundRoles, this.nightManager.getRoleTimers());

    this.phase = Phase.Role;
    this.newEmit("gameStarted");
  }

  confirmPlayerRoleReveal(playerId: PlayerId): void {
    if (this.confirmedPlayerRoleReveal.includes(playerId)) {
      throw new Error(`Player ${playerId} has already confirmed their role`);
    }
    if (this.players.find((p) => p.id === playerId) === undefined) {
      throw new Error(`Player with id ${playerId} not found`);
    }
    this.confirmedPlayerRoleReveal.push(playerId);

    this.newEmit("playerRoleRevealConfirmed", playerId);
  }

  // ── Night Phase (delegated to NightPhaseManager) ──────────────────

  startNight(): void {
    this.phase = Phase.Night;
    this.newEmit("nightStarted");
    this.nightManager.startNight();
  }

  playerPerformAction(playerId: PlayerId): void {
    if (this.confirmedPlayerPerformActions.includes(playerId)) {
      throw new Error(`Player ${playerId} has already performed their action`);
    }
    const player = this.getPlayerById(playerId);
    const roleName = player.getOriginalRole().name;
    this.confirmedPlayerPerformActions.push(playerId);

    const remaining = (this.currentGameRolesMap.get(roleName) || 1) - 1;
    this.currentGameRolesMap.set(roleName, remaining);

    console.log(`✅ ${player.name} (${roleName}) performed action. Remaining for ${roleName}: ${remaining}`);
  }

  nextAction(): any {
    const nextRoleAction = this.roleQueue.shift();
    if (nextRoleAction === undefined) {
      return;
    }
    const rolePlayersOrg = this.players.filter((p) => p.getOriginalRole().name === nextRoleAction);
    const rolePlayers = this.players.filter((p) => p.getRole().name === nextRoleAction);
    this.logger.info(`next action: ${nextRoleAction}, role players ${rolePlayers.map((p) => p.name)}, original role players ${rolePlayersOrg.map((p) => p.name)}`);
    return nextRoleAction;
  }

  startPerformActions(): void {
    this.phase = Phase.Night;
    this.newEmit("perfomActionsStarted");
  }

  get roleQueueWithTimer(): { roleName: string; seconds: number }[] {
    return this.nightManager.roleQueueWithTimer;
  }

  // ── Day / Discussion ──────────────────────────────────────────────

  startDay() {
    this.phase = Phase.Discussion;
    this.startedAt = Date.now();
    const totalSeconds = this.timer * 60;
    this.currentTimerSec = totalSeconds;

    this.newEmit("dayStarted", {
      timer: this.timer,
      currentTimerSec: this.currentTimerSec,
      startedAt: this.startedAt,
    });

    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startedAt!) / 1000);
      this.currentTimerSec = totalSeconds - elapsed;

      if (this.currentTimerSec <= 0) {
        this.currentTimerSec = 0;
        clearInterval(this.timerInterval);
        this.newEmit("timerFinished");
        this.startVoting();
      }
    }, 1000);
  }

  skipToVote(playerId: PlayerId): void {
    if (playerId !== this.host) {
      throw new Error("Only the host can skip to vote");
    }
    if (this.phase !== Phase.Discussion) {
      throw new Error("Cannot skip to vote when not in discussion phase");
    }
    this.startVoting();
  }

  // ── Voting (delegated to VoteResolver for calculation) ────────────

  startVoting(): void {
    if (this.phase === Phase.Vote) return;
    this.phase = Phase.Vote;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.logger.log("Game state is now voting");
    this.newEmit("votingStarted");
  }

  playerVote(player: PlayerId, vote: PlayerId): void {
    if (this.votes.find((v) => v.voter === player)) {
      throw new Error("Player has already voted");
    }
    this.votes.push({ voter: player, vote: vote });
    if (vote === "noWerewolf") {
      this.logger.log(`Voter: ${this.getPlayerById(player).name} has voted for No Werewolf`);
    } else {
      this.logger.log(`Voter: ${this.getPlayerById(player).name} has voted for ${this.getPlayerById(vote).name} and his role is ${this.getPlayerById(vote).getRole().name}`);
    }
    if (this.votes.length === this.players.length) {
      this.finish();
    }
  }

  forceVotes(hostId: PlayerId): void {
    if (hostId !== this.host) {
      throw new Error("Only the host can force votes");
    }
    if (this.phase !== Phase.Vote) {
      throw new Error("Can only force votes during voting phase");
    }

    const playersWhoVoted = new Set(this.votes.map((v) => v.voter));
    const playersWhoHaventVoted = this.players.filter((p) => !playersWhoVoted.has(p.id));

    if (playersWhoHaventVoted.length === 0) return;

    for (const player of playersWhoHaventVoted) {
      const otherPlayers = this.players.filter((p) => p.id !== player.id);
      const options = [...otherPlayers.map((p) => p.id), "noWerewolf"];
      const randomVote = options[Math.floor(Math.random() * options.length)];

      this.votes.push({ voter: player.id, vote: randomVote });
      this.logger.log(`Force vote: ${player.name} randomly voted for ${randomVote === "noWerewolf" ? "No Werewolf" : this.getPlayerById(randomVote).name}`);
      this.newEmit("voteConfirmed", { playerId: player.id });
    }

    this.finish();
  }

  finish(): void {
    this.logger.info("Game Ended");
    this.phase = Phase.EndGame;

    this.actionHistory = this.voteResolver.buildActionHistory(this.players);

    const votes = this.voteResolver.getVoteResults(this.votes);
    this.prettyVotes = this.votes;

    votes.forEach((value, key) => {
      if (key === "noWerewolf") {
        this.logger.log(`No Werewolf has been voted: ${value} times`);
      } else {
        const player1 = this.getPlayerById(key);
        this.logger.log(`Voter: ${player1.name} has been voted: ${value} times`);
      }
    });

    this.endedAt = Date.now();
    const result = this.voteResolver.calculateResults(votes, this.players);
    this.winners = result.winningTeam;
    this.newEmit("gameEnded", { winners: result.winners, isDraw: result.isDraw, eliminatedPlayerId: result.eliminatedPlayerId });
    this.logger.info(`number of events: ${this.numberOfEvents}`);
  }

  // ── Restart / Destroy ─────────────────────────────────────────────

  restart(): void {
    for (const player of this.players) {
      player.reset();
    }

    this.startedAt = null;
    this.allPlayersReady = false;
    this.groundRoles = [];
    this.prettyVotes = [];

    for (const playerId of this.readyPlayers.keys()) {
      this.readyPlayers.set(playerId, false);
    }

    this.votes = [];
    this.winners = null;
    this.phase = Phase.Waiting;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.confirmedPlayerRoleReveal = [];
    this.confirmedPlayerPerformActions = [];
    this.currentTimerSec = 0;

    this.availableRoles = this.roleAssigner.createRoles();
    this.roleQueue = this.roleAssigner.createRoleQueue();
    this.currentActiveRole = "";
    this.lastActivityAt = Date.now();

    this.endedAt = null;

    this.actionHistory = [];
    this.gamePings = {};
    this.gamePingTimestamps = {};

    this.nightManager.clearTimers();

    this.logger.info(`available roles: ${this.availableRoles.map((r) => r.name)}`);
    this.logger.info("Game restarted");
  }

  destroy(): void {
    clearInterval(this.timerInterval);
    this.nightManager.clearTimers();
    this.removeAllListeners?.();
    this.players = [];
  }

  // ── Internal Helpers ──────────────────────────────────────────────

  private generateCode(): string {
    return (this.code = Math.random().toString(36).substring(2, 8));
  }

  private arePlayersReady(): boolean {
    if (this.readyPlayers.size !== this.players.length) {
      return false;
    }
    for (const player of this.players) {
      const ready = this.readyPlayers.get(player.id);
      if (ready === undefined || ready === false) {
        return false;
      }
      if (!ready) {
        return false;
      }
    }
    return true;
  }

  newEmit(event: string, data?: any) {
    this.numberOfEvents++;
    this.lastActivityAt = Date.now();
    this.emit(event, data);
  }
}
