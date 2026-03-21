import { Phase, Team, TimerOption, getRoleDistribution, DEFAULT_TIMER, ROLE_NAMES, NUMBER_OF_GROUND_ROLES, MIN_PLAYERS, MAX_PLAYERS } from "../config/constants";

import { Role, RoleClasses } from "./roles";
import { Player } from "./Player";
import { EventEmitter } from "events";
import { Logger } from "../utils/Logger";
import { PlayerId, Settings } from "../types/game.types";
import { Vote } from "../types/game.types";

export class Game extends EventEmitter {
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
  actionHistory: Array<{ role: string; playerName: string; description: string }> = [];
  private availableRoles: Role[] = [];

  constructor(private logger: Logger) {
    super();
    this.code = this.generateCode();

    const roleDistribution = getRoleDistribution(this.minimumPlayers);
    this.numberOfWerewolf = roleDistribution[ROLE_NAMES.WEREWOLF];
    this.numberOfMasons = roleDistribution[ROLE_NAMES.MASON];

    this.availableRoles = this.createRoles();
    this.roleQueue = this.createRoleQueue();

    this.logger.info(`available roles: ${this.availableRoles.map((r) => r.name)}`);
    this.logger.info("Game created");
  }

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

  private buildActiveRoleQueue(): string[] {
    const roleOrder = [ROLE_NAMES.WEREWOLF, ROLE_NAMES.MINION, ROLE_NAMES.CLONE, ROLE_NAMES.SEER, ROLE_NAMES.MASON, ROLE_NAMES.ROBBER, ROLE_NAMES.TROUBLEMAKER, ROLE_NAMES.DRUNK, ROLE_NAMES.INSOMNIAC, ROLE_NAMES.JOKER];

    const rolesInGame = new Set<string>();
    this.players.forEach((p) => rolesInGame.add(p.getOriginalRole().name));
    this.groundRoles.forEach((r) => rolesInGame.add(r.name));

    const activeQueue = roleOrder.filter((roleName) => rolesInGame.has(roleName));

    console.log(`🎭 Roles in game: ${Array.from(rolesInGame).join(", ")}`);
    console.log(`📋 Active role queue: ${activeQueue.join(", ")}`);

    let totalTime = 0;
    activeQueue.forEach((role) => {
      totalTime += this.roleTimers.get(role) || 10;
    });
    console.log(`⏱️ Total night duration: ${totalTime}s`);

    return activeQueue;
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

  start(): void {
    if (this.players.length < this.minimumPlayers) {
      throw new Error(`Need at least ${this.minimumPlayers} players to start`);
    }

    if (!this.allPlayersReady) {
      throw new Error("Not all players are ready");
    }

    this.currentGameRolesMap = new Map<string, number>();
    this.assignRandomRoles();

    for (let i = this.availableRoles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.availableRoles[i], this.availableRoles[j]] = [this.availableRoles[j], this.availableRoles[i]];
    }
    this.groundRoles = this.availableRoles.slice(0, this.numberOfGroundRoles);

    this.roleQueue = this.buildActiveRoleQueue();

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

  startNight(): void {
    this.phase = Phase.Night;
    this.newEmit("nightStarted");
    console.log("🌙 Night phase started");

    let mainTimerSeconds = 0;
    this.roleQueue.forEach((role) => {
      mainTimerSeconds += this.roleTimers.get(role) || 10;
    });
    mainTimerSeconds += 5;

    this.nightTimeRemaining = mainTimerSeconds;
    console.log(`⏱️ Main night timer: ${mainTimerSeconds}s`);

    this.nightMainTimer = setTimeout(() => {
      console.log("⏱️ Main night timer expired — forcing day phase");
      this.forceEndNight();
    }, mainTimerSeconds * 1000);

    setTimeout(() => {
      this.advanceToNextRole();
    }, 1000);
  }

  private forceEndNight(): void {
    if (this.roleSlotTimer) {
      clearTimeout(this.roleSlotTimer);
      this.roleSlotTimer = null;
    }
    if (this.nightMainTimer) {
      clearTimeout(this.nightMainTimer);
      this.nightMainTimer = null;
    }
    this.currentActiveRole = "";

    this.players.forEach((player) => {
      if (!this.confirmedPlayerPerformActions.includes(player.id)) {
        console.log(`⏱️ Auto-performing action for ${player.name} (${player.getOriginalRole().name})`);
        this.autoPerformAction(player);
        this.confirmedPlayerPerformActions.push(player.id);
      }
    });

    this.startDay();
  }

  private autoPerformAction(player: Player): any {
    const roleName = player.getOriginalRole().name.toLowerCase();
    const otherPlayers = this.players.filter((p) => p.id !== player.id);

    try {
      let action: any;
      let result: any;

      switch (roleName) {
        case "werewolf":
          action = { type: "werewolf" };
          result = player.performOriginalAction(this, action);
          break;
        case "minion":
          action = { type: "minion" };
          result = player.performOriginalAction(this, action);
          break;
        case "mason":
          action = { type: "mason" };
          result = player.performOriginalAction(this, action);
          break;
        case "insomniac":
          action = { type: "insomniac" };
          result = player.performOriginalAction(this, action);
          break;
        case "seer": {
          if (Math.random() > 0.5 && otherPlayers.length > 0) {
            const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
            action = { type: "seer_player_role", targetPlayer: { id: target.id } };
          } else if (this.groundRoles.length >= 2) {
            action = { type: "seer_ground_roles", groundRole1: { id: this.groundRoles[0].id }, groundRole2: { id: this.groundRoles[1].id } };
          } else {
            action = { type: "seer_player_role", targetPlayer: { id: otherPlayers[0].id } };
          }
          result = player.performOriginalAction(this, action);
          break;
        }
        case "robber": {
          const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
          action = { type: "robber", targetPlayer: { id: target.id } };
          result = player.performOriginalAction(this, action);
          break;
        }
        case "troublemaker": {
          const shuffled = otherPlayers.sort(() => Math.random() - 0.5);
          action = { type: "troublemaker", player1: { id: shuffled[0].id }, player2: { id: shuffled[1].id } };
          result = player.performOriginalAction(this, action);
          break;
        }
        case "clone": {
          const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
          action = { type: "clone", targetPlayer: { id: target.id } };
          result = player.performOriginalAction(this, action);

          // If clone copied an active role, auto-perform the second action too
          if (result.needsSecondAction) {
            const clonedRoleName = result.clonedRole.toLowerCase();
            let secondAction: any = null;
            const cloneOtherPlayers = this.players.filter((p) => p.id !== player.id);

            switch (clonedRoleName) {
              case "seer": {
                if (Math.random() > 0.5 && cloneOtherPlayers.length > 0) {
                  const seerTarget = cloneOtherPlayers[Math.floor(Math.random() * cloneOtherPlayers.length)];
                  secondAction = { type: "seer_player_role", targetPlayer: { id: seerTarget.id } };
                } else if (this.groundRoles.length >= 2) {
                  secondAction = { type: "seer_ground_roles", groundRole1: { id: this.groundRoles[0].id }, groundRole2: { id: this.groundRoles[1].id } };
                } else {
                  secondAction = { type: "seer_player_role", targetPlayer: { id: cloneOtherPlayers[0].id } };
                }
                break;
              }
              case "robber": {
                const robTarget = cloneOtherPlayers[Math.floor(Math.random() * cloneOtherPlayers.length)];
                secondAction = { type: "robber", targetPlayer: { id: robTarget.id } };
                break;
              }
              case "troublemaker": {
                const shuffled = cloneOtherPlayers.sort(() => Math.random() - 0.5);
                secondAction = { type: "troublemaker", player1: { id: shuffled[0].id }, player2: { id: shuffled[1].id } };
                break;
              }
              case "drunk": {
                const groundIdx = Math.floor(Math.random() * this.groundRoles.length);
                secondAction = { type: "drunk", targetRoleId: this.groundRoles[groundIdx].id };
                break;
              }
            }

            if (secondAction) {
              try {
                const clonedRole = player.getRole();
                const secondResult = clonedRole.performAction()(this, player, secondAction);
                result = { ...result, secondActionResult: secondResult, message: secondResult.message || result.message };
              } catch (error: any) {
                console.error(`Error auto-performing clone second action:`, error.message);
              }
            }
          }
          break;
        }
        case "drunk": {
          const groundIndex = Math.floor(Math.random() * this.groundRoles.length);
          action = { type: "drunk", targetRoleId: this.groundRoles[groundIndex].id };
          result = player.performOriginalAction(this, action);
          break;
        }
        case "joker": {
          const groundIndex = Math.floor(Math.random() * this.groundRoles.length);
          action = { type: "joker", targetRoleId: this.groundRoles[groundIndex].id };
          result = player.performOriginalAction(this, action);
          break;
        }
        default:
          result = { message: "No action performed" };
      }

      (player as any).lastActionResult = result;
      console.log(`⏱️ Auto-action result for ${player.name}:`, result);
      return result;
    } catch (error: any) {
      console.error(`Error auto-performing action for ${player.name}:`, error.message);
      (player as any).lastActionResult = { message: "Action was auto-performed" };
      return { message: "Action was auto-performed" };
    }
  }

  private advanceToNextRole(): void {
    if (this.roleSlotTimer) {
      clearTimeout(this.roleSlotTimer);
      this.roleSlotTimer = null;
    }

    let nextRole = this.nextAction();

    if (!nextRole) {
      console.log("✅ All role slots completed");
      if (this.nightMainTimer) {
        clearTimeout(this.nightMainTimer);
        this.nightMainTimer = null;
      }
      this.currentActiveRole = "";

      this.players.forEach((player) => {
        if (!this.confirmedPlayerPerformActions.includes(player.id)) {
          console.log(`⏱️ Auto-performing action for ${player.name}`);
          this.autoPerformAction(player);
          this.confirmedPlayerPerformActions.push(player.id);
        }
      });

      this.startDay();
      return;
    }

    const timerSeconds = this.roleTimers.get(nextRole) || 10;

    // Find players who should act for this role slot (by original role)
    const playersWithRole = this.players.filter((p) => p.getOriginalRole().name.toLowerCase() === nextRole.toLowerCase());

    this.currentActiveRole = nextRole;
    this.newEmit("nightRoleProgress", { roleName: nextRole, seconds: timerSeconds });

    if (playersWithRole.length > 0) {
      console.log(`📢 Role slot: ${nextRole} (${playersWithRole.length} players) — ${timerSeconds}s`);
      this.newEmit("roleActionQueue", nextRole);
    } else {
      console.log(`⏭️ Role slot: ${nextRole} — no players, waiting ${timerSeconds}s`);
    }

    this.newEmit("roleTimer", { roleName: nextRole, seconds: timerSeconds });

    // Handle Clone→Insomniac: when Insomniac slot fires, auto-perform for clones who copied Insomniac
    if (nextRole.toLowerCase() === "insomniac") {
      const cloneInsomniacs = this.players.filter((p) => {
        return (p as any)._wasClone === true && p.getOriginalRole().name.toLowerCase() === "insomniac" && this.confirmedPlayerPerformActions.includes(p.id);
      });

      cloneInsomniacs.forEach((player) => {
        console.log(`🧬💤 Clone-Insomniac ${player.name} checking role during Insomniac slot`);
        try {
          const currentRole = player.getRole();
          const hasChanged = currentRole.name.toLowerCase() !== "insomniac";
          const result = {
            originalRole: "Insomniac",
            currentRole: currentRole.name,
            hasChanged,
            message: hasChanged ? `Your role changed from Insomniac to ${currentRole.name}!` : "Your role is still Insomniac — no one swapped you.",
          };

          // Update the stored result
          (player as any).lastActionResult = {
            ...(player as any).lastActionResult,
            insomniacResult: result,
            message: result.message,
          };

          // Emit to the specific player
          this.newEmit("cloneInsomniacResult", { playerId: player.id, result });
        } catch (error: any) {
          console.error(`Error performing Clone-Insomniac check for ${player.name}:`, error.message);
        }
      });
    }

    this.roleSlotTimer = setTimeout(() => {
      if (playersWithRole.length > 0) {
        playersWithRole.forEach((player) => {
          if (!this.confirmedPlayerPerformActions.includes(player.id)) {
            console.log(`⏱️ Timer expired — auto-performing for ${player.name} (${nextRole})`);
            const result = this.autoPerformAction(player);
            this.confirmedPlayerPerformActions.push(player.id);

            const remaining = (this.currentGameRolesMap.get(player.getOriginalRole().name) || 1) - 1;
            this.currentGameRolesMap.set(player.getOriginalRole().name, remaining);

            this.newEmit("autoActionResult", { playerId: player.id, result });
          }
        });
      }

      this.advanceToNextRole();
    }, timerSeconds * 1000);
  }

  private roleTimers: Map<string, number> = new Map([
    ["Werewolf", 10],
    ["Minion", 10],
    ["Clone", 20],
    ["Seer", 20],
    ["Mason", 10],
    ["Robber", 20],
    ["Troublemaker", 20],
    ["Drunk", 10],
    ["Insomniac", 10],
    ["Joker", 10],
  ]);
  private nightMainTimer: ReturnType<typeof setTimeout> | null = null;
  private roleSlotTimer: ReturnType<typeof setTimeout> | null = null;

  get roleQueueWithTimer(): { roleName: string; seconds: number }[] {
    const rolesInGame = this.roleQueue;
    const roleTimers = this.roleTimers;

    const roleQueueWithTimer = rolesInGame.map((roleName, _) => {
      const seconds = roleTimers.get(roleName);
      if (!seconds) {
        throw new Error(`Role ${roleName} has no timer`);
      }
      return {
        roleName,
        seconds,
      };
    });

    return roleQueueWithTimer;
  }

  public nightTimeRemaining: number = 0;

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

  finish(): void {
    this.logger.info("Game Ended");
    this.phase = Phase.EndGame;

    // Build action history from player results
    const roleOrder = ["Werewolf", "Minion", "Clone", "Seer", "Mason", "Robber", "Troublemaker", "Drunk", "Insomniac", "Joker"];
    this.actionHistory = [];

    for (const roleName of roleOrder) {
      const playersWithRole = this.players.filter((p) => p.getOriginalRole().name === roleName);

      for (const player of playersWithRole) {
        const result = (player as any).lastActionResult;
        if (!result) continue;

        this.actionHistory.push({
          role: roleName,
          playerName: player.name,
          description: result.message || "Performed their action",
        });
      }
    }
    const votes = this.getVoteResults();
    votes.forEach((value, key) => {
      if (key === "noWerewolf") {
        this.logger.log(`No Werewolf has been voted: ${value} times`);
      } else {
        const player1 = this.getPlayerById(key);
        this.logger.log(`Voter: ${player1.name} has been voted: ${value} times`);
      }
    });
    this.endedAt = Date.now();
    const result = this.calculateResults(votes);
    this.newEmit("gameEnded", result);
    this.logger.info(`number of events: ${this.numberOfEvents}`);
  }

  startPerformActions(): void {
    this.phase = Phase.Night;
    this.newEmit("perfomActionsStarted");
  }

  startDay() {
    this.phase = Phase.Discussion;

    this.startedAt = Date.now();
    this.currentTimerSec = this.timer * 60;

    this.newEmit("dayStarted", {
      timer: this.timer,
      currentTimerSec: this.currentTimerSec,
      startedAt: this.startedAt,
    });

    const tick = () => {
      this.currentTimerSec--;

      if (this.currentTimerSec <= 0) {
        this.currentTimerSec = 0;
        this.newEmit("timerFinished");
        this.startVoting();
        return;
      }

      this.timerInterval = setTimeout(tick, 1000);
    };

    this.timerInterval = setTimeout(tick, 1000);
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

  getVoteResults(): Map<string, number> {
    let votes = this.votes;
    let mapVotes = new Map<string, number>();

    for (let i = 0; i < votes.length; i++) {
      let vote = votes[i];
      if (mapVotes.has(vote.vote)) {
        mapVotes.set(vote.vote, mapVotes.get(vote.vote) + 1);
      } else {
        mapVotes.set(vote.vote, 1);
      }
    }

    this.prettyVotes = votes;
    return mapVotes;
  }

  calculateResults(mapVotes: Map<PlayerId, number>): { winners: string; isDraw: boolean; eliminatedPlayerId: string | null } {
    const maxVotes = Math.max(...Array.from(mapVotes.values()));
    const topVoted = Array.from(mapVotes.entries()).filter(([_, count]) => count === maxVotes);

    // Draw — no elimination
    if (topVoted.length > 1) {
      // Check if ALL tied players are werewolves → villagers win
      const tiedPlayerIds = topVoted.map(([id]) => id).filter((id) => id !== "noWerewolf");
      const allWerewolves =
        tiedPlayerIds.length > 0 &&
        tiedPlayerIds.every((id) => {
          const player = this.getPlayerById(id);
          return player.getRole().name === "Werewolf";
        });

      if (allWerewolves) {
        this.winners = Team.Heroes;
      } else {
        // Check if a Joker is among the tied
        const jokerTied = tiedPlayerIds.some((id) => {
          const player = this.getPlayerById(id);
          return player.getRole().team === Team.Joker;
        });

        if (jokerTied) {
          this.winners = Team.Joker;
        } else {
          this.winners = Team.Villains;
        }
      }

      return { winners: this.winners, isDraw: true, eliminatedPlayerId: null };
    }

    // Single top-voted target
    const voted = topVoted[0][0];

    if (voted === "noWerewolf") {
      for (const player of this.players) {
        if (player.getRole().name === "Werewolf") {
          this.winners = Team.Villains;
          return { winners: this.winners, isDraw: false, eliminatedPlayerId: null };
        }
      }
      this.winners = Team.Heroes;
      return { winners: this.winners, isDraw: false, eliminatedPlayerId: null };
    }

    const votedPlayerRole = this.getPlayerById(voted).getRole();

    if (votedPlayerRole.team === Team.Joker) {
      this.winners = Team.Joker;
    } else if (votedPlayerRole.name === "Minion") {
      this.winners = Team.Villains;
    } else if (votedPlayerRole.team === Team.Villains) {
      this.winners = Team.Heroes;
    } else {
      this.winners = Team.Villains;
    }

    return { winners: this.winners, isDraw: false, eliminatedPlayerId: voted };
  }

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

    this.availableRoles = this.createRoles();
    this.roleQueue = this.createRoleQueue();
    this.currentActiveRole = "";

    this.endedAt = null;

    this.actionHistory = [];

    this.logger.info(`available roles: ${this.availableRoles.map((r) => r.name)}`);
    this.logger.info("Game restarted");
  }

  getPlayerById(id: string): Player {
    const player = this.players.find((p) => p.id === id);
    if (player !== undefined) {
      return player;
    }

    this.logger.log(`Player with id ${id} not found`);
    throw new Error(`Player with id ${id} not found`);
  }

  destroy(): void {
    clearInterval(this.timerInterval);
    this.removeAllListeners?.();
    this.players = [];
  }

  private assignRandomRoles(): void {
    let availableRoles = this.availableRoles;

    this.logger.info(`available roles: ${availableRoles.map((r) => r.name)}`);

    if (availableRoles.length < this.players.length + this.numberOfGroundRoles) {
      this.addRoles();
      this.logger.warn("added roles");
    }

    for (let i = 0; i < this.players.length; i++) {
      const randomIndex = Math.floor(Math.random() * availableRoles.length);
      const role = availableRoles[randomIndex];
      this.players[i].AddRole(role);

      const current = this.currentGameRolesMap.get(role.name) ?? 0;
      this.currentGameRolesMap.set(role.name, current + 1);
      availableRoles.splice(randomIndex, 1);
    }
    this.currentGameRolesMap.forEach((value, key) => {
      this.logger.info(`key: ${key}, value: ${value}`);
    });
  }

  private addRoles() {
    const extraRolesInOrder = ["Clone", "Insomniac", "Joker", "Werewolf"];
    const needed = this.players.length + this.numberOfGroundRoles - this.availableRoles.length;

    for (let i = 0; i < needed && i < extraRolesInOrder.length; i++) {
      const role = new RoleClasses[extraRolesInOrder[i].toLowerCase()]();
      this.availableRoles.push(role);
    }
  }

  private generateCode(): string {
    return (this.code = Math.random().toString(36).substring(2, 8));
  }

  private createRoleQueue(): string[] {
    const roleOrder = [ROLE_NAMES.WEREWOLF, ROLE_NAMES.MINION, ROLE_NAMES.CLONE, ROLE_NAMES.SEER, ROLE_NAMES.MASON, ROLE_NAMES.ROBBER, ROLE_NAMES.TROUBLEMAKER, ROLE_NAMES.DRUNK, ROLE_NAMES.INSOMNIAC, ROLE_NAMES.JOKER];

    this.logger.info(`role order template: ${roleOrder.join(", ")}`);
    console.log(`role order template: ${roleOrder.join(", ")}`);

    return roleOrder;
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

  private createRoles() {
    let roles: Role[] = [];
    const roleNames = ["Werewolf", "Mason", "Seer", "Drunk", "Troublemaker", "Robber", "Minion"];
    for (let i = 0; i < roleNames.length; i++) {
      let role: Role;
      if (roleNames[i] === "Mason") {
        continue;
      }
      if (roleNames[i] === "Werewolf") {
        for (let j = 0; j < this.numberOfWerewolf; j++) {
          role = new RoleClasses[roleNames[0].toLowerCase()]();
          roles.push(role);
          if (j < this.numberOfMasons) {
            role = new RoleClasses[roleNames[1].toLowerCase()]();
            roles.push(role);
          }
        }
        continue;
      }
      role = new RoleClasses[roleNames[i].toLowerCase()]();
      roles.push(role);
    }
    return roles;
  }

  newEmit(event: string, data?: any) {
    this.numberOfEvents++;
    this.emit(event, data);
  }
}
