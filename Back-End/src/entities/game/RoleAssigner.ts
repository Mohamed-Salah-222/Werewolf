import { ROLE_NAMES, NUMBER_OF_GROUND_ROLES, getRoleDistribution, MIN_PLAYERS } from "../../config/constants";
import { Role, RoleClasses } from "../roles";
import { Player } from "../Player";
import { Logger } from "../../utils/Logger";

export class RoleAssigner {
  private numberOfWerewolf: number;
  private numberOfMasons: number;
  private numberOfGroundRoles: number = NUMBER_OF_GROUND_ROLES;

  constructor(private logger: Logger) {
    const roleDistribution = getRoleDistribution(MIN_PLAYERS);
    this.numberOfWerewolf = roleDistribution[ROLE_NAMES.WEREWOLF];
    this.numberOfMasons = roleDistribution[ROLE_NAMES.MASON];
  }

  createRoles(): Role[] {
    let roles: Role[] = [];
    const roleNames = ["Werewolf", "Mason", "Seer", "Drunk", "Troublemaker", "Robber", "Minion", "Warlock", "Oracle"];
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

  addRoles(availableRoles: Role[], playerCount: number): void {
    const extraRolesInOrder = ["Clone", "Insomniac", "Joker", "Werewolf"];
    const needed = playerCount + this.numberOfGroundRoles - availableRoles.length;

    for (let i = 0; i < needed && i < extraRolesInOrder.length; i++) {
      const role = new RoleClasses[extraRolesInOrder[i].toLowerCase()]();
      availableRoles.push(role);
    }
  }

  assignRandomRoles(players: Player[], availableRoles: Role[], currentGameRolesMap: Map<string, number>): void {
    this.logger.info(`available roles: ${availableRoles.map((r) => r.name)}`);

    if (availableRoles.length < players.length + this.numberOfGroundRoles) {
      this.addRoles(availableRoles, players.length);
      this.logger.warn("added roles");
    }

    for (let i = 0; i < players.length; i++) {
      const randomIndex = Math.floor(Math.random() * availableRoles.length);
      const role = availableRoles[randomIndex];
      players[i].AddRole(role);

      const current = currentGameRolesMap.get(role.name) ?? 0;
      currentGameRolesMap.set(role.name, current + 1);
      availableRoles.splice(randomIndex, 1);
    }
    currentGameRolesMap.forEach((value, key) => {
      this.logger.info(`key: ${key}, value: ${value}`);
    });
  }

  createRoleQueue(): string[] {
    const roleOrder = [ROLE_NAMES.WEREWOLF, ROLE_NAMES.MINION, ROLE_NAMES.CLONE, ROLE_NAMES.SEER, ROLE_NAMES.MASON, ROLE_NAMES.ROBBER, ROLE_NAMES.TROUBLEMAKER, ROLE_NAMES.DRUNK, ROLE_NAMES.WARLOCK, ROLE_NAMES.INSOMNIAC, ROLE_NAMES.JOKER, ROLE_NAMES.ORACLE];
    this.logger.info(`role order template: ${roleOrder.join(", ")}`);
    console.log(`role order template: ${roleOrder.join(", ")}`);

    return roleOrder;
  }

  buildActiveRoleQueue(players: Player[], groundRoles: Role[], roleTimers: Map<string, number>): string[] {
    const roleOrder = [ROLE_NAMES.WEREWOLF, ROLE_NAMES.MINION, ROLE_NAMES.CLONE, ROLE_NAMES.SEER, ROLE_NAMES.MASON, ROLE_NAMES.ROBBER, ROLE_NAMES.TROUBLEMAKER, ROLE_NAMES.DRUNK, ROLE_NAMES.WARLOCK, ROLE_NAMES.INSOMNIAC, ROLE_NAMES.JOKER, ROLE_NAMES.ORACLE];
    const rolesInGame = new Set<string>();
    players.forEach((p) => rolesInGame.add(p.getOriginalRole().name));
    groundRoles.forEach((r) => rolesInGame.add(r.name));

    const activeQueue = roleOrder.filter((roleName) => rolesInGame.has(roleName));

    console.log(`🎭 Roles in game: ${Array.from(rolesInGame).join(", ")}`);
    console.log(`📋 Active role queue: ${activeQueue.join(", ")}`);

    let totalTime = 0;
    activeQueue.forEach((role) => {
      totalTime += roleTimers.get(role) || 10;
    });
    console.log(`⏱️ Total night duration: ${totalTime}s`);

    return activeQueue;
  }
}
