"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const constants_1 = require("../config/constants");
// import { Result, RequestType } from '../types/result.types';
const roles_1 = require("./roles");
const Player_1 = require("./Player");
const events_1 = require("events");
class Game extends events_1.EventEmitter {
    constructor(logger) {
        super();
        this.logger = logger;
        this.players = [];
        this.groundRoles = [];
        this.votes = [];
        this.timer = constants_1.DEFAULT_TIMER;
        this.phase = constants_1.Phase.Waiting;
        this.numberOfGroundRoles = constants_1.NUMBER_OF_GROUND_ROLES;
        this.player = [];
        this.confirmedPlayerRoleReveal = [];
        this.confirmedPlayerPerformActions = [];
        this.minimumPlayers = constants_1.MIN_PLAYERS;
        this.maxPlayers = constants_1.MAX_PLAYERS;
        this.availableRoles = [];
        this.code = this.generateCode();
        const roleDistribution = (0, constants_1.getRoleDistribution)(this.minimumPlayers);
        this.numberOfWerewolf = roleDistribution[constants_1.ROLE_NAMES.WEREWOLF];
        this.numberOfMasons = roleDistribution[constants_1.ROLE_NAMES.MASON];
        this.availableRoles = this.createRoles();
        this.logger.info(`available roles: ${this.availableRoles.map((r) => r.name)}`);
        this.logger.info('Game created');
    }
    playerJoin(name) {
        this.logger.info(`playerJoin ${name}`);
        if (this.players.find((p) => p.name === name)) {
            throw new Error(`A player with this name (${name}) already joined please chose another name`);
        }
        if (this.players.length >= this.maxPlayers) {
            throw new Error(`Game is full, max players is ${this.maxPlayers}`);
        }
        this.players.push(new Player_1.Player(name));
        this.emit('playerJoin', name);
    }
    start() {
        if (this.players.length < this.minimumPlayers) {
            throw new Error(`Need at least ${this.minimumPlayers} players to start`);
        }
        this.assignRandomRoles();
        this.groundRoles = this.availableRoles.slice(0, this.numberOfGroundRoles);
        this.phase = constants_1.Phase.Role;
        this.emit('gameStarted');
    }
    confirmPlayerRoleReveal(playerId) {
        if (this.confirmedPlayerRoleReveal.includes(playerId)) {
            throw new Error(`Player ${playerId} has already confirmed their role`);
        }
        if (this.players.find((p) => p.id === playerId) === undefined) {
            throw new Error(`Player with id ${playerId} not found`);
        }
        this.confirmedPlayerRoleReveal.push(playerId);
        // TODO: omit event to the player
        this.emit('playerRoleRevealConfirmed', playerId);
    }
    startNight() {
        this.phase = constants_1.Phase.Night;
        this.emit('nightStarted');
    }
    playerPerformAction(playerId) {
        this.confirmedPlayerPerformActions.push(playerId);
        if (this.confirmedPlayerPerformActions.length === this.players.length) {
            const nextAction = this.nextAction();
            this.emit('nextAction', nextAction);
        }
    }
    get nextAction() {
        const player = this.players.find((p) => p.id === this.confirmedPlayerPerformActions[0]);
        return player.getOriginalRole().performAction();
    }
    finish() {
        this.logger.info('Game Ended');
        this.phase = constants_1.Phase.EndGame;
        const votes = this.getVoteResults();
        votes.forEach((value, key) => {
            this.logger.log(`Voter: ${key} voted: ${value}`);
        });
        this.emit('gameEnded', this.calculateResults(votes));
    }
    startPerformActions() {
        this.phase = constants_1.Phase.Night;
        this.emit('perfomActionsStarted');
    }
    startDay() {
        this.phase = constants_1.Phase.Discussion;
        let totalSeconds = this.timer * 60;
        totalSeconds = 3;
        this.emit('dayStarted');
        // find a good soultion for syncing the timer
        return new Promise(null);
        // return new Promise((resolve) => {
        //   const interval = setInterval(() => {
        //     this.emit('timerTick', totalSeconds);
        //     if (totalSeconds <= 0) {
        //       this.currentTimerSec = 0;
        //       this.emit('timerFinished');
        //       clearInterval(interval);
        //       resolve();
        //     }
        //     totalSeconds--;
        //   }, 1000);
        // });
    }
    startVoting() {
        this.phase = constants_1.Phase.Vote;
        this.emit('votingStarted');
        this.logger.log('Game state is now voting');
    }
    playerVote(player, vote) {
        this.votes.push({ voter: player, vote: vote });
        if (this.votes.length === this.players.length) {
            this.finish();
        }
    }
    getVoteResults() {
        let votes = this.votes;
        let mapVotes = new Map();
        for (let i = 0; i < votes.length; i++) {
            let vote = votes[i];
            if (mapVotes.has(vote.vote)) {
                mapVotes.set(vote.vote, mapVotes.get(vote.vote) + 1);
            }
            else {
                mapVotes.set(vote.vote, 1);
            }
            vote.voter = this.getPlayerById(vote.voter).name;
            vote.vote = this.getPlayerById(vote.vote).name;
        }
        this.votes = votes;
        return mapVotes;
    }
    calculateResults(mapVotes) {
        let prev = 0;
        let voted = '';
        // need to check for draw
        let check = 0;
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
        if (check === mapVotes.size) {
            this.winners = constants_1.Team.Villains;
            return this.winners;
        }
        let votedPlayerRole = this.getPlayerById(voted).getRole();
        if (votedPlayerRole.name === 'minion') {
            this.winners = constants_1.Team.Villains;
        }
        if (votedPlayerRole.name === constants_1.Team.Joker) {
            this.winners = constants_1.Team.Joker;
        }
        if (votedPlayerRole.team === constants_1.Team.Villains) {
            this.winners = constants_1.Team.Heroes;
        }
        else {
            this.winners = constants_1.Team.Villains;
        }
        this.emit('winnersCalculated', this.winners);
        return this.winners;
    }
    restart() {
        this.emit('gameRestarted');
        this.logger.info('Game restarted');
        this.phase = constants_1.Phase.Waiting;
    }
    assignRandomRoles() {
        let availableRoles = this.availableRoles;
        this.logger.info(`available roles: ${availableRoles.map((r) => r.name)}`);
        if (availableRoles.length < this.players.length + this.numberOfGroundRoles) {
            this.addRoles();
        }
        for (let i = 0; i < this.players.length; i++) {
            const randomIndex = Math.floor(Math.random() * availableRoles.length);
            const role = availableRoles[randomIndex];
            this.players[i].AddRole(role);
            availableRoles.splice(randomIndex, 1);
        }
    }
    addRoles() {
        const roleNames = ['Clone', 'Insomniac', "Werewolf", 'Joker'];
        for (let i = 0; i < this.players.length; i++) {
            const randomIndex = Math.floor(Math.random() * roleNames.length + 8);
            const role = new roles_1.RoleClasses[roleNames[randomIndex].toLowerCase()]();
            this.availableRoles.push(role);
        }
    }
    generateCode() {
        return this.code = Math.random().toString(36).substring(2, 8);
    }
    getPlayerById(id) {
        const player = this.players.find((p) => p.id === id);
        if (player !== undefined) {
            return player;
        }
        this.logger.log(`Player with id ${id} not found`);
        throw new Error(`Player with id ${id} not found`);
    }
    createRoles() {
        let roles = [];
        const roleNames = ['Werewolf', 'Mason', 'Seer', 'Drunk', 'Troublemaker', 'Robber', 'Minion'];
        for (let i = 0; i < roleNames.length; i++) {
            let role;
            if (roleNames[i] === 'Mason') {
                continue;
            }
            if (roleNames[i] === 'Werewolf') {
                for (let j = 0; j < this.numberOfWerewolf; j++) {
                    role = new roles_1.RoleClasses[roleNames[0].toLowerCase()]();
                    roles.push(role);
                    if (j < this.numberOfMasons) {
                        role = new roles_1.RoleClasses[roleNames[1].toLowerCase()]();
                        roles.push(role);
                    }
                }
                continue;
            }
            role = new roles_1.RoleClasses[roleNames[i].toLowerCase()]();
            roles.push(role);
        }
        return roles;
    }
}
exports.Game = Game;
