import { Role } from "./Role";
import { Team, CLONE_ACTIVE_ROLES as ACTIVE_ROLES } from "../../config/constants";
import { Game } from "../Game";
import { Player } from "../Player";

export interface CloneAction {
  type: "clone";
  targetPlayer: Player;
}

export const createCloneAction = (targetPlayer: Player): CloneAction => ({
  type: "clone",
  targetPlayer,
});

// Roles where the clone needs to make a second choice


export class Clone implements Role {
  public id: string;
  public name: string = "Clone";
  public team: Team = Team.Heroes;
  public description: string = "Copies another player's role and performs their action immediately";

  constructor() {
    this.id = Math.random().toString(36).substring(2, 10);
  }

  public performAction(): Function {
    try {
      return function (game: Game, player: Player, action: CloneAction) {
        if (action.type !== "clone") {
          throw new Error(`Invalid action for Clone. Expected 'clone', received '${action.type}'.`);
        }

        if (!action.targetPlayer) {
          throw new Error("Clone action requires a target player");
        }

        if (action.targetPlayer.id === player.id) {
          throw new Error("Clone cannot target themselves");
        }


        const targetPlayer = game.getPlayerById(action.targetPlayer.id);


        const clonedRole = targetPlayer.getRole();
        const clonedRoleName = clonedRole.name.toLowerCase();

        // Set the clone's role to the copied role
        player.setRole(clonedRole);
        // why do we do this ?
        // (player as any).originalRole = clonedRole;

        // Determine if the clone needs a second action
        const needsSecondAction = ACTIVE_ROLES.includes(clonedRoleName);

        // For passive roles, auto-perform the action and return the result
        let autoResult: any = null;
        if (!needsSecondAction) {
          try {
            switch (clonedRoleName) {
              case "werewolf": {
                // Just learn you're a werewolf — no extra info
                autoResult = {
                  message: `You cloned ${targetPlayer.name} and became a Werewolf. You are now on the Villain team.`,
                };
                break;
              }
              case "minion": {
                // Just learn you're a minion — no extra info
                autoResult = {
                  message: `You cloned ${targetPlayer.name} and became a Minion. You are now on the Villain team.`,
                };
                break;
              }
              case "mason": {
                // Perform mason action — see other masons
                const otherMasons = game.players.filter((p) => p.getOriginalRole().name.toLowerCase() === "mason" && p.id !== player.id);
                autoResult = {
                  masons: otherMasons.map((m) => ({ id: m.id, name: m.name })),
                  message: otherMasons.length > 0 ? `You cloned ${targetPlayer.name} and became a Mason. Fellow Mason(s): ${otherMasons.map((m) => m.name).join(", ")}` : `You cloned ${targetPlayer.name} and became a Mason. You are the only Mason.`,
                };
                break;
              }
              case "insomniac": {
                // Clone becomes insomniac — will check role during Insomniac's slot
                autoResult = {
                  message: `You cloned ${targetPlayer.name} and became an Insomniac. You will check your role at the end of the night.`,
                };
                break;
              }
              case "joker": {
                autoResult = {
                  message: `You cloned ${targetPlayer.name} and became a Joker. You win if you get voted out!`,
                };
                break;
              }
              default: {
                autoResult = {
                  message: `You cloned ${targetPlayer.name} and became a ${clonedRole.name}.`,
                };
                break;
              }
            }
          } catch (error: any) {
            console.error(`Error auto-performing cloned action:`, error.message);
            autoResult = { message: `You became a ${clonedRole.name}` };
          }
        }

        // Build ground cards info for active roles that need it (Seer, Drunk)
        let groundCards: any = null;
        if (needsSecondAction && (clonedRoleName === "seer" || clonedRoleName === "drunk")) {
          groundCards = game.groundRoles.map((r, index) => ({
            id: r.id,
            label: `Ground Card ${index + 1}`,
          }));
        }

        // Build player list for active roles that need it (Seer, Robber, Troublemaker)
        let otherPlayers: any = null;
        if (needsSecondAction && (clonedRoleName === "seer" || clonedRoleName === "robber" || clonedRoleName === "troublemaker")) {
          otherPlayers = game.players.filter((p) => p.id !== player.id).map((p) => ({ id: p.id, name: p.name }));
        }

        return {
          clonedRole: clonedRole.name,
          clonedRoleTeam: clonedRole.team,
          needsSecondAction,
          autoResult,
          // Data for the second action UI
          groundCards,
          otherPlayers,
          message: needsSecondAction ? `You cloned ${targetPlayer.name} and became a ${clonedRole.name}. Now perform their action!` : autoResult?.message || `You became a ${clonedRole.name}`,
        };
      };
    } catch (error: any) {
      console.error(`Error performing Clone action:`, error.message);
      return () => null;
    }
  }
}
