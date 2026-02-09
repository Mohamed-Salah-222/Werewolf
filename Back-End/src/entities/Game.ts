// Main game class - THE BRAIN
// Extends EventEmitter (so it can emit events like 'gameStarted', 'votingStarted')
// Properties: players[], groundRoles[], phase, code, votes[], timer, winners
// Methods: 
//   - playerJoin(name)
//   - start() → assigns roles, moves to RoleReveal phase
//   - startNight() → moves to Night phase, triggers role actions
//   - playerPerformAction(player, action)
//   - startDay() → starts timer
//   - startVoting()
//   - playerVote(player, vote)
//   - finish() → calculates winners
// Used by: Manager, socketHandlers
// Emits events that socketHandlers listens to

import { Phase, Team, TimerOption, getRoleDistribution, DEFAULT_TIMER, ROLE_NAMES, NUMBER_OF_GROUND_ROLES, MIN_PLAYERS, MAX_PLAYERS } from '../config/constants';
// import { Result, RequestType } from '../types/result.types';

import { Role, RoleClasses } from './roles';
import { Player } from './Player';
import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { PlayerId } from '../types/game.types';
import { Vote } from '../types/game.types';

export class Game extends EventEmitter {
  players: Player[] = [];
  groundRoles: Role[] = [];
  code: string;
  votes: Vote[] = [];
  winners: Team;
  timer: TimerOption = DEFAULT_TIMER;
  phase: Phase = Phase.Waiting;
  numberOfGroundRoles: number = NUMBER_OF_GROUND_ROLES;
  numberOfWerewolf: number;
  numberOfMasons: number;
  player: Player[] = [];
  numberOfEvents: number = 0;
  confirmedPlayerRoleReveal: PlayerId[] = [];
  confirmedPlayerPerformActions: PlayerId[] = [];
  minimumPlayers: number = MIN_PLAYERS;
  maxPlayers: number = MAX_PLAYERS;
  roleQueue: string[] = [];
  currentGameRolesMap: Map<string, number> = new Map();
  private availableRoles: Role[] = [];

  constructor(
    private logger: Logger
  ) {
    super();
    this.code = this.generateCode();

    const roleDistribution = getRoleDistribution(this.minimumPlayers);
    this.numberOfWerewolf = roleDistribution[ROLE_NAMES.WEREWOLF];
    this.numberOfMasons = roleDistribution[ROLE_NAMES.MASON];

    this.availableRoles = this.createRoles();
    this.roleQueue = this.createRoleQueue();

    this.logger.info(`available roles: ${this.availableRoles.map((r) => r.name)}`);
    this.logger.info('Game created');
  }

  playerJoin(name: string): void {
    this.logger.info(`playerJoin ${name}`);
    if (this.players.find((p) => p.name === name)) {
      throw new Error(`A player with this name (${name}) already joined please chose another name`);
    }
    if (this.players.length >= this.maxPlayers) {
      throw new Error(`Game is full, max players is ${this.maxPlayers}`);
    }
    this.players.push(new Player(name));
    this.newEmit('playerJoin', name);
  }

  start(): void {
    if (this.players.length < this.minimumPlayers) {
      throw new Error(`Need at least ${this.minimumPlayers} players to start`);
    }

    this.assignRandomRoles();
    this.groundRoles = this.availableRoles.slice(0, this.numberOfGroundRoles);
    this.phase = Phase.Role;
    this.newEmit('gameStarted');
  }

  confirmPlayerRoleReveal(playerId: PlayerId): void {
    if (this.confirmedPlayerRoleReveal.includes(playerId)) {
      throw new Error(`Player ${playerId} has already confirmed their role`);
    }
    if (this.players.find((p) => p.id === playerId) === undefined) {
      throw new Error(`Player with id ${playerId} not found`);
    }
    this.confirmedPlayerRoleReveal.push(playerId);
    // TODO: omit event to the player
    this.newEmit('playerRoleRevealConfirmed', playerId);
  }

  startNight(): void {
    this.phase = Phase.Night;
    this.newEmit('nightStarted');
    setTimeout(() => {
      this.newEmit('roleActionQueue', this.nextAction());
    }, 1000);
  }


  canAdvanceRoleAction(roleName: string): boolean {
    const roleAction = this.roleQueue.find((role) => role === roleName);
    if (roleAction === undefined) {
      return true;
    }
    return this.currentGameRolesMap.get(roleName) < this.numberOfGroundRoles;
  }

  playerPerformAction(playerId: PlayerId): void {
    if (this.confirmedPlayerPerformActions.includes(playerId)) {
      throw new Error(`Player ${playerId} has already confirmed their role`);
    }
    if (this.canAdvanceRoleAction(this.getPlayerById(playerId).getRole().name) === false) {
      return;
    }

    this.confirmedPlayerPerformActions.push(playerId);
    const nextRoleAction = this.nextAction();
    this.newEmit('nextAction', nextRoleAction);
    if (this.confirmedPlayerPerformActions.length === this.players.length) {
      this.newEmit('dayStarted');
    }
  }

  // get the next role action in the role queue
  nextAction(): any {
    const nextRoleAction = this.roleQueue.shift();
    if (nextRoleAction === undefined) {
      this.newEmit('dayStarted');
    }
    this.logger.info(`next action: ${nextRoleAction}`);
    return nextRoleAction;
  }

  finish(): void {
    this.logger.info('Game Ended');
    this.phase = Phase.EndGame;
    const votes = this.getVoteResults();
    votes.forEach((value, key) => {
      const player1 = this.getPlayerById(key);
      this.logger.log(`Voter: ${player1.name} has been voted: ${value} times`);

    });
    this.newEmit('gameEnded', this.calculateResults(votes));
    this.logger.info(`number of events: ${this.numberOfEvents}`);
  }

  startPerformActions(): void {
    this.phase = Phase.Night;
    this.newEmit('perfomActionsStarted');
  }

  startDay(): Promise<void> {
    this.phase = Phase.Discussion;
    let totalSeconds = this.timer * 60;
    totalSeconds = 3;
    this.newEmit('dayStarted');
    // find a good soultion for syncing the timer
    return new Promise(null);
    // return new Promise((resolve) => {
    //   const interval = setInterval(() => {
    //     this.newEmit('timerTick', totalSeconds);
    //     if (totalSeconds <= 0) {
    //       this.currentTimerSec = 0;
    //       this.newEmit('timerFinished');
    //       clearInterval(interval);
    //       resolve();
    //     }
    //     totalSeconds--;
    //   }, 1000);
    // });
  }

  startVoting(): void {
    this.phase = Phase.Vote;
    this.newEmit('votingStarted');
    this.logger.log('Game state is now voting');
  }

  playerVote(player: PlayerId, vote: PlayerId): void {
    this.votes.push({ voter: player, vote: vote });
    this.logger.log(`Voter: ${this.getPlayerById(player).name} has voted for ${this.getPlayerById(vote).name} and his role is ${this.getPlayerById(vote).getRole().name}`);
    if (this.votes.length === this.players.length) {
      this.finish();
    }
  }

  getVoteResults(): Map<string, number> {
    let votes = this.votes;
    let mapVotes = new Map();

    for (let i = 0; i < votes.length; i++) {
      let vote = votes[i];
      if (mapVotes.has(vote.vote)) {
        mapVotes.set(vote.vote, mapVotes.get(vote.vote) + 1);
      } else {
        mapVotes.set(vote.vote, 1);
      }
      vote.voter = this.getPlayerById(vote.voter).name;
      vote.vote = this.getPlayerById(vote.vote).name;
    }

    this.votes = votes;
    return mapVotes;
  }

  calculateResults(mapVotes: Map<string, number>): string {
    let prev = 0;
    let voted = '';
    // need to check for draw
    let check = 0;
    // what does this even do ?
    mapVotes.forEach((value, key) => {
      if (prev === value) {
        prev = value;
        check++;
      }

      if (prev < value) {
        prev = value;
        voted = key;
      }
    });
    // why do i do this ? 
    if (check === mapVotes.size) {
      this.winners = Team.Villains;

      return this.winners;
    }

    let votedPlayerRole = this.getPlayerById(voted).getRole();
    if (votedPlayerRole.name === "Minion" || votedPlayerRole.name === "minion") {
      this.winners = Team.Villains;
    }
    if (votedPlayerRole.name === Team.Joker) {
      this.winners = Team.Joker;
    }

    if (votedPlayerRole.team === Team.Villains) {
      this.winners = Team.Heroes;
    } else {
      this.winners = Team.Villains;
    }
    this.newEmit('winnersCalculated', this.winners);
    this.logger.info(`winners: ${this.winners}`);
    return this.winners;
  }

  restart(): void {
    this.newEmit('gameRestarted');
    this.logger.info('Game restarted');
    this.phase = Phase.Waiting;
  }

  private assignRandomRoles(): void {
    let availableRoles = this.availableRoles;

    this.logger.info(`available roles: ${availableRoles.map((r) => r.name)}`);

    if (availableRoles.length < this.players.length + this.numberOfGroundRoles) {
      this.addRoles();
    }

    for (let i = 0; i < this.players.length; i++) {
      const randomIndex = Math.floor(Math.random() * availableRoles.length);
      const role = availableRoles[randomIndex];
      this.players[i].AddRole(role);
      const current = this.currentGameRolesMap.get(role.name) ?? 0;
      this.currentGameRolesMap.set(role.name, current + 1);
      availableRoles.splice(randomIndex, 1);
    }
  }

  private addRoles() {
    const roleNames = ['Clone', 'Insomniac', "Werewolf", 'Joker'];
    for (let i = 0; i < this.players.length; i++) {
      const randomIndex = Math.floor(Math.random() * roleNames.length + 8);
      const role = new RoleClasses[roleNames[randomIndex].toLowerCase()]();
      this.availableRoles.push(role);
    }
  }

  private generateCode(): string {
    return this.code = Math.random().toString(36).substring(2, 8);
  }

  getPlayerById(id: string): Player {
    const player = this.players.find((p) => p.id === id);
    if (player !== undefined) {
      return player;
    }

    this.logger.log(`Player with id ${id} not found`);
    throw new Error(`Player with id ${id} not found`);
  }


  private createRoleQueue(): string[] {
    const roleQueue = Object.values(ROLE_NAMES);

    this.logger.info(`role queue: ${roleQueue.join(', ')}`);
    console.log(`role queue: ${roleQueue.join(', ')}`);

    this.logger.info(`role queue: ${roleQueue.join(', ')}`);
    return roleQueue;
  }
  private createRoles() {
    let roles: Role[] = [];
    const roleNames = ['Werewolf', 'Mason', 'Seer', 'Drunk', 'Troublemaker', 'Robber', 'Minion'];
    for (let i = 0; i < roleNames.length; i++) {
      let role: Role;
      if (roleNames[i] === 'Mason') {
        continue;
      }
      if (roleNames[i] === 'Werewolf') {
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
