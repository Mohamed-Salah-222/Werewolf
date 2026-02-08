// Main game class - THE BRAIN
// Extends EventEmitter (so it can emit events like 'gameStarted', 'votingStarted')
// Properties: players[], groundRoles[], phase, code, votes[], timer, winners
// Methods: 
//   - playerJoin(name)
//   - start() → assigns roles, moves to RoleReveal phase
//   - startNight() → moves to Night phase, triggers role actions
//   - playerPerformAction(player, action)
//   - startDiscussion() → starts timer
//   - startVoting()
//   - playerVote(player, vote)
//   - finish() → calculates winners
// Used by: Manager, socketHandlers
// Emits events that socketHandlers listens to

import { getRoleDistribution, DEFAULT_TIMER, Phase, Team, TimerOption, ROLE_NAMES, NUMBER_OF_GROUND_ROLES } from '../config/constants';
import { Result, RequestType } from '../types/result.types';

import { Role, Werewolf } from './roles';
import { Player } from './Player';
import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
export class Game extends EventEmitter {
  players: Player[] = [];
  groundRoles: Role[] = [];
  code: string;
  votes: number[] = [];
  winners: Player[] = [];
  timer: TimerOption = DEFAULT_TIMER;
  phase: Phase = Phase.Waiting;
  numberOfGroundRoles: number = NUMBER_OF_GROUND_ROLES;
  numberOfWerewolf: number;
  numberOfMasons: number;
  private __availableRoles: Role[] = [];

  get availableRoles(): Role[] {
    return this.__availableRoles;
  }
  set availableRoles(roles: Role[]) {
    this.__availableRoles = roles;
  }
  constructor(
    private logger: Logger
  ) {
    super();
    this.code = this.generateCode();

    this.availableRoles = getRolesFromDB(this.numberOfWerewolf, this.numberOfMasons); // will be removed from constructor later


    this.logger.info(`available roles: ${this.availableRoles.map((r) => r.name)}`);
    this.logger.info('Game created');
  }


  start(): Result {
    try {
      this.phase = Phase.Role;
      this.assignRandomRoles();
      this.groundRoles = this.availableRoles.slice(0, this.numberOfGroundRoles);
      return {
        ok: true,
        request: RequestType.gameStarted,
        result: 'Game started',
      };
    } catch (error) {
      return {
        ok: false,
        request: RequestType.gameStarted,
        result: error.message,
      };
    }
  }
  private assignRandomRoles(): void {
    let availableRoles = this.availableRoles;
    this.logger.info(`available roles: ${availableRoles.map((r) => r.name)}`);
    if (availableRoles.length < this.players.length + 3) {
      throw new Error('There is not enough roles to assign to all players');
    }
    for (let i = 0; i < this.players.length; i++) {
      const randomIndex = Math.floor(Math.random() * availableRoles.length);
      const role = availableRoles[randomIndex];
      this.players[i].AddRole(role);
      availableRoles.splice(randomIndex, 1);
    }
  }
  private distributeRoles(): void {
    const roleDistribution = getRoleDistribution(this.players.length);
    this.numberOfWerewolf = roleDistribution[ROLE_NAMES.WEREWOLF];
    this.numberOfMasons = roleDistribution[ROLE_NAMES.MASON];
  }
  private generateCode(): string {
    return this.code = Math.random().toString(36).substring(2, 10);
  }
}
function getRolesFromDB(werewolfCount: number, masonCount: number): Role[] {
  const roles: Role[] = [];
  return roles;
}
