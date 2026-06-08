import { Player } from "../Player";
import { Game } from "../game/Game";


/**
 * Callback interface so NightPhaseManager can talk back to Game
 * without importing Game directly (avoids circular dependency).
 */

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
    ["Warlock", 20],
    ["Insomniac", 10],
    ["Joker", 10],
    ["Oracle", 10],
  ]);

  private nightMainTimer: ReturnType<typeof setTimeout> | null = null;
  private roleSlotTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private host: Game) { }

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
    this.host.currentActiveRoleStartedAt = null;

    this.host.players.forEach((player) => {
      if (!this.host.confirmedPlayerPerformActions.includes(player.id)) {
        console.log(`Auto-performing action for ${player.name} (${player.getOriginalRole().name})`);
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

    const nextRole = this.host.nextAction();

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
    this.host.currentActiveRoleStartedAt = Date.now();

    // Handle Clone→Insomniac: when Insomniac slot fires, check clones who copied Insomniac
    if (nextRole.toLowerCase() === "insomniac") {
      this.handleCloneInsomniac();
    }

    // Handle Clone→Oracle: when Oracle slot fires, run Oracle action for clones who copied Oracle
    if (nextRole.toLowerCase() === "oracle") {
      this.handleCloneOracle();
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

            this.host.emit();
          }
        });
      }

      this.advanceToNextRole();
    }, timerSeconds * 1000);

    // THEN emit to clients
    this.host.emit();

    if (playersWithRole.length > 0) {
      console.log(`📢 Role slot: ${nextRole} (${playersWithRole.length} players) — ${timerSeconds}s`);

      this.host.emit();
    } else {
      console.log(`⏭️ Role slot: ${nextRole} — no players, waiting ${timerSeconds}s`);
    }

    this.host.emit();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  autoPerformAction(player: Player): any {
    const roleName = player.getOriginalRole().name.toLowerCase();
    const otherPlayers = this.host.players.filter((p) => p.id !== player.id);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let action: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any;

      switch (roleName) {
        // ── Passive roles (no target needed) ──
        case "werewolf":
          action = { type: "werewolf" };
          result = player.performOriginalAction(this.host as never, action);
          break;

        case "minion":
          action = { type: "minion" };
          result = player.performOriginalAction(this.host as never, action);
          break;

        case "mason":
          action = { type: "mason" };
          result = player.performOriginalAction(this.host as never, action);
          break;

        case "insomniac":
          action = { type: "insomniac" };
          result = player.performOriginalAction(this.host as never, action);
          break;

        case "oracle":
          action = { type: "oracle" };
          result = player.performOriginalAction(this.host as never, action);
          break;

        // ── Seer (two modes) ──
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
          result = player.performOriginalAction(this.host as never, action);
          break;
        }

        // ── Single target roles ──
        case "robber": {
          const robTarget = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
          action = { type: "robber", targetPlayer: { id: robTarget.id } };
          result = player.performOriginalAction(this.host as never, action);
          break;
        }

        case "warlock": {
          const warlockTarget = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
          action = { type: "warlock", targetPlayer: { id: warlockTarget.id } };
          result = player.performOriginalAction(this.host as never, action);
          break;
        }

        // ── Two target role ──
        case "troublemaker": {
          const shuffled = otherPlayers.sort(() => Math.random() - 0.5);
          action = { type: "troublemaker", player1: { id: shuffled[0].id }, player2: { id: shuffled[1].id } };
          result = player.performOriginalAction(this.host as never, action);
          break;
        }

        // ── Ground card roles ──
        case "drunk": {
          const drunkIdx = Math.floor(Math.random() * this.host.groundRoles.length);
          action = { type: "drunk", targetRoleId: this.host.groundRoles[drunkIdx].id };
          result = player.performOriginalAction(this.host as never, action);
          break;
        }

        case "joker": {
          const jokerIdx = Math.floor(Math.random() * this.host.groundRoles.length);
          action = { type: "joker", targetRoleId: this.host.groundRoles[jokerIdx].id };
          result = player.performOriginalAction(this.host as never, action);
          break;
        }

        // ── Clone (two-phase) ──
        case "clone": {
          const cloneTarget = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
          action = { type: "clone", targetPlayer: { id: cloneTarget.id } };
          result = player.performOriginalAction(this.host as never, action);

          if (result.needsSecondAction) {
            const secondAction = this.buildCloneSecondAction(result.clonedRole.toLowerCase(), player);

            if (secondAction) {
              try {
                const clonedRole = player.getRole();
                const secondResult = clonedRole.performAction()(this.host as never, player, secondAction);
                result = { ...result, secondActionResult: secondResult, message: secondResult.message || result.message };
              } catch (error: unknown) {
                const msg = error instanceof Error ? error.message : "Unknown error";
                console.error(`Error auto-performing clone second action:`, msg);
              }
            }
          }
          break;
        }

        default:
          result = { message: "No action performed" };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (player as any).lastActionResult = result;
      console.log(`⏱️ Auto-action result for ${player.name}:`, result);
      return result;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error(`Error auto-performing action for ${player.name}:`, msg);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  /**
   * Builds the auto-action for a Clone's second phase based on what role they copied.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildCloneSecondAction(clonedRoleName: string, player: Player): any {
    const cloneOtherPlayers = this.host.players.filter((p) => p.id !== player.id);

    switch (clonedRoleName) {
      case "seer": {
        if (Math.random() > 0.5 && cloneOtherPlayers.length > 0) {
          const seerTarget = cloneOtherPlayers[Math.floor(Math.random() * cloneOtherPlayers.length)];
          return { type: "seer_player_role", targetPlayer: { id: seerTarget.id } };
        } else if (this.host.groundRoles.length >= 2) {
          return {
            type: "seer_ground_roles",
            groundRole1: { id: this.host.groundRoles[0].id },
            groundRole2: { id: this.host.groundRoles[1].id },
          };
        } else {
          return { type: "seer_player_role", targetPlayer: { id: cloneOtherPlayers[0].id } };
        }
      }

      case "robber": {
        const robTarget = cloneOtherPlayers[Math.floor(Math.random() * cloneOtherPlayers.length)];
        return { type: "robber", targetPlayer: { id: robTarget.id } };
      }

      case "troublemaker": {
        const shuffled = cloneOtherPlayers.sort(() => Math.random() - 0.5);
        return { type: "troublemaker", player1: { id: shuffled[0].id }, player2: { id: shuffled[1].id } };
      }

      case "drunk": {
        const groundIdx = Math.floor(Math.random() * this.host.groundRoles.length);
        return { type: "drunk", targetRoleId: this.host.groundRoles[groundIdx].id };
      }

      case "warlock": {
        const warlockTarget = cloneOtherPlayers[Math.floor(Math.random() * cloneOtherPlayers.length)];
        return { type: "warlock", targetPlayer: { id: warlockTarget.id } };
      }

      default:
        return null;
    }
  }

  private handleCloneInsomniac(): void {
    const cloneInsomniacs = this.host.players.filter((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (player as any).lastActionResult = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(player as any).lastActionResult,
          insomniacResult: result,
          message: result.message,
        };


        this.host.emit();
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error performing Clone-Insomniac check for ${player.name}:`, msg);
      }
    });
  }

  private handleCloneOracle(): void {
    console.log(
      `🔮 handleCloneOracle called. Players:`,
      this.host.players.map((p) => ({
        name: p.name,
        wasClone: (p as any)._wasClone,
        role: p.getRole().name,
        originalRole: p.getOriginalRole().name,
        confirmed: this.host.confirmedPlayerPerformActions.includes(p.id),
      })),
    );

    const cloneOracles = this.host.players.filter((p) => {
      return (p as any)._wasClone === true && p.getRole().name.toLowerCase() === "oracle" && this.host.confirmedPlayerPerformActions.includes(p.id);
    });

    cloneOracles.forEach((player) => {
      console.log(`🧬🔮 Clone-Oracle ${player.name} receiving vision during Oracle slot`);
      try {
        // Run the Oracle action to get a vision
        const oracleRole = player.getRole();
        const action = { type: "oracle" };
        const result = oracleRole.performAction()(this.host as never, player, action);

        // Update the player's lastActionResult with the oracle vision
        (player as any).lastActionResult = {
          ...(player as any).lastActionResult,
          oracleResult: result,
          message: result.message,
        };

        this.host.emit()
        // this.host.emit("cloneOracleResult", { playerId: player.id, result });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error performing Clone-Oracle vision for ${player.name}:`, msg);
      }
    });
  }
}
