import { Player } from "../Player";
import { Role } from "../roles";
import { PlayerId } from "../../types/game.types";

/**
 * Callback interface so NightPhaseManager can talk back to Game
 * without importing Game directly (avoids circular dependency).
 */
export interface NightPhaseHost {
  players: Player[];
  groundRoles: Role[];
  confirmedPlayerPerformActions: PlayerId[];
  currentGameRolesMap: Map<string, number>;
  currentActiveRole: string;
  nightTimeRemaining: number;
  roleQueue: string[];

  newEmit(event: string, data?: any): void;
  startDay(): void;
  nextAction(): string | undefined;
  getPlayerById(id: string): Player;
}

export class NightPhaseManager {
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

  constructor(private host: NightPhaseHost) {}

  getRoleTimers(): Map<string, number> {
    return this.roleTimers;
  }

  get roleQueueWithTimer(): { roleName: string; seconds: number }[] {
    const rolesInGame = this.host.roleQueue;
    return rolesInGame.map((roleName) => {
      const seconds = this.roleTimers.get(roleName);
      if (!seconds) {
        throw new Error(`Role ${roleName} has no timer`);
      }
      return { roleName, seconds };
    });
  }

  startNight(): void {
    console.log("🌙 Night phase started");

    let mainTimerSeconds = 0;
    this.host.roleQueue.forEach((role) => {
      mainTimerSeconds += this.roleTimers.get(role) || 10;
    });
    mainTimerSeconds += 5;

    this.host.nightTimeRemaining = mainTimerSeconds;
    console.log(`⏱️ Main night timer: ${mainTimerSeconds}s`);

    this.nightMainTimer = setTimeout(() => {
      console.log("⏱️ Main night timer expired — forcing day phase");
      this.forceEndNight();
    }, mainTimerSeconds * 1000);

    setTimeout(() => {
      this.advanceToNextRole();
    }, 1000);
  }

  forceEndNight(): void {
    if (this.roleSlotTimer) {
      clearTimeout(this.roleSlotTimer);
      this.roleSlotTimer = null;
    }
    if (this.nightMainTimer) {
      clearTimeout(this.nightMainTimer);
      this.nightMainTimer = null;
    }
    this.host.currentActiveRole = "";

    this.host.players.forEach((player) => {
      if (!this.host.confirmedPlayerPerformActions.includes(player.id)) {
        console.log(`⏱️ Auto-performing action for ${player.name} (${player.getOriginalRole().name})`);
        this.autoPerformAction(player);
        this.host.confirmedPlayerPerformActions.push(player.id);
      }
    });

    this.host.startDay();
  }

  advanceToNextRole(): void {
    if (this.roleSlotTimer) {
      clearTimeout(this.roleSlotTimer);
      this.roleSlotTimer = null;
    }

    let nextRole = this.host.nextAction();

    if (!nextRole) {
      console.log("✅ All role slots completed");
      if (this.nightMainTimer) {
        clearTimeout(this.nightMainTimer);
        this.nightMainTimer = null;
      }
      this.host.currentActiveRole = "";

      this.host.players.forEach((player) => {
        if (!this.host.confirmedPlayerPerformActions.includes(player.id)) {
          console.log(`⏱️ Auto-performing action for ${player.name}`);
          this.autoPerformAction(player);
          this.host.confirmedPlayerPerformActions.push(player.id);
        }
      });

      this.host.startDay();
      return;
    }

    const timerSeconds = this.roleTimers.get(nextRole) || 10;
    const playersWithRole = this.host.players.filter((p) => p.getOriginalRole().name.toLowerCase() === nextRole.toLowerCase());

    this.host.currentActiveRole = nextRole;

    // Handle Clone→Insomniac: when Insomniac slot fires, auto-perform for clones who copied Insomniac
    if (nextRole.toLowerCase() === "insomniac") {
      this.handleCloneInsomniac();
    }

    // Start server timer FIRST — before emitting to clients
    this.roleSlotTimer = setTimeout(() => {
      if (playersWithRole.length > 0) {
        playersWithRole.forEach((player) => {
          if (!this.host.confirmedPlayerPerformActions.includes(player.id)) {
            console.log(`⏱️ Timer expired — auto-performing for ${player.name} (${nextRole})`);
            const result = this.autoPerformAction(player);
            this.host.confirmedPlayerPerformActions.push(player.id);

            const remaining = (this.host.currentGameRolesMap.get(player.getOriginalRole().name) || 1) - 1;
            this.host.currentGameRolesMap.set(player.getOriginalRole().name, remaining);

            this.host.newEmit("autoActionResult", { playerId: player.id, result });
          }
        });
      }

      this.advanceToNextRole();
    }, timerSeconds * 1000);

    // THEN emit to clients — bar animation starts after server countdown has begun
    this.host.newEmit("nightRoleProgress", { roleName: nextRole, seconds: timerSeconds });

    if (playersWithRole.length > 0) {
      console.log(`📢 Role slot: ${nextRole} (${playersWithRole.length} players) — ${timerSeconds}s`);
      this.host.newEmit("roleActionQueue", nextRole);
    } else {
      console.log(`⏭️ Role slot: ${nextRole} — no players, waiting ${timerSeconds}s`);
    }

    this.host.newEmit("roleTimer", { roleName: nextRole, seconds: timerSeconds });
  }

  autoPerformAction(player: Player): any {
    const roleName = player.getOriginalRole().name.toLowerCase();
    const otherPlayers = this.host.players.filter((p) => p.id !== player.id);

    try {
      let action: any;
      let result: any;

      switch (roleName) {
        case "werewolf":
          action = { type: "werewolf" };
          result = player.performOriginalAction(this.host as any, action);
          break;
        case "minion":
          action = { type: "minion" };
          result = player.performOriginalAction(this.host as any, action);
          break;
        case "mason":
          action = { type: "mason" };
          result = player.performOriginalAction(this.host as any, action);
          break;
        case "insomniac":
          action = { type: "insomniac" };
          result = player.performOriginalAction(this.host as any, action);
          break;
        case "seer": {
          if (Math.random() > 0.5 && otherPlayers.length > 0) {
            const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
            action = { type: "seer_player_role", targetPlayer: { id: target.id } };
          } else if (this.host.groundRoles.length >= 2) {
            action = {
              type: "seer_ground_roles",
              groundRole1: { id: this.host.groundRoles[0].id },
              groundRole2: { id: this.host.groundRoles[1].id },
            };
          } else {
            action = { type: "seer_player_role", targetPlayer: { id: otherPlayers[0].id } };
          }
          result = player.performOriginalAction(this.host as any, action);
          break;
        }
        case "robber": {
          const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
          action = { type: "robber", targetPlayer: { id: target.id } };
          result = player.performOriginalAction(this.host as any, action);
          break;
        }
        case "troublemaker": {
          const shuffled = otherPlayers.sort(() => Math.random() - 0.5);
          action = { type: "troublemaker", player1: { id: shuffled[0].id }, player2: { id: shuffled[1].id } };
          result = player.performOriginalAction(this.host as any, action);
          break;
        }
        case "clone": {
          const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
          action = { type: "clone", targetPlayer: { id: target.id } };
          result = player.performOriginalAction(this.host as any, action);

          // If clone copied an active role, auto-perform the second action too
          if (result.needsSecondAction) {
            const clonedRoleName = result.clonedRole.toLowerCase();
            let secondAction: any = null;
            const cloneOtherPlayers = this.host.players.filter((p) => p.id !== player.id);

            switch (clonedRoleName) {
              case "seer": {
                if (Math.random() > 0.5 && cloneOtherPlayers.length > 0) {
                  const seerTarget = cloneOtherPlayers[Math.floor(Math.random() * cloneOtherPlayers.length)];
                  secondAction = { type: "seer_player_role", targetPlayer: { id: seerTarget.id } };
                } else if (this.host.groundRoles.length >= 2) {
                  secondAction = {
                    type: "seer_ground_roles",
                    groundRole1: { id: this.host.groundRoles[0].id },
                    groundRole2: { id: this.host.groundRoles[1].id },
                  };
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
                const groundIdx = Math.floor(Math.random() * this.host.groundRoles.length);
                secondAction = { type: "drunk", targetRoleId: this.host.groundRoles[groundIdx].id };
                break;
              }
            }

            if (secondAction) {
              try {
                const clonedRole = player.getRole();
                const secondResult = clonedRole.performAction()(this.host as any, player, secondAction);
                result = { ...result, secondActionResult: secondResult, message: secondResult.message || result.message };
              } catch (error: any) {
                console.error(`Error auto-performing clone second action:`, error.message);
              }
            }
          }
          break;
        }
        case "drunk": {
          const groundIndex = Math.floor(Math.random() * this.host.groundRoles.length);
          action = { type: "drunk", targetRoleId: this.host.groundRoles[groundIndex].id };
          result = player.performOriginalAction(this.host as any, action);
          break;
        }
        case "joker": {
          const groundIndex = Math.floor(Math.random() * this.host.groundRoles.length);
          action = { type: "joker", targetRoleId: this.host.groundRoles[groundIndex].id };
          result = player.performOriginalAction(this.host as any, action);
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

  clearTimers(): void {
    if (this.roleSlotTimer) {
      clearTimeout(this.roleSlotTimer);
      this.roleSlotTimer = null;
    }
    if (this.nightMainTimer) {
      clearTimeout(this.nightMainTimer);
      this.nightMainTimer = null;
    }
  }

  private handleCloneInsomniac(): void {
    const cloneInsomniacs = this.host.players.filter((p) => {
      return (p as any)._wasClone === true && p.getOriginalRole().name.toLowerCase() === "insomniac" && this.host.confirmedPlayerPerformActions.includes(p.id);
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

        (player as any).lastActionResult = {
          ...(player as any).lastActionResult,
          insomniacResult: result,
          message: result.message,
        };

        this.host.newEmit("cloneInsomniacResult", { playerId: player.id, result });
      } catch (error: any) {
        console.error(`Error performing Clone-Insomniac check for ${player.name}:`, error.message);
      }
    });
  }
}
