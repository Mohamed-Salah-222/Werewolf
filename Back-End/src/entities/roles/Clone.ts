import { Role } from "./Role";
import { Team } from "@werewolf/shared";
import { Game } from "../game";
import { Player } from "../Player";
import { roleIdOf } from "./roleId";

const CLONE_FOLLOW_UP_ROLES = ["seer", "robber", "troublemaker", "warlock"];
const CLONE_AUTO_ACTION_ROLES = ["drunk", "joker"];
const CLONE_DELAYED_WAKE_ROLES = ["mason", "insomniac", "oracle"];

export interface CloneAction {
  type: "clone";
  targetPlayer: Player;
}

export const createCloneAction = (targetPlayer: Player): CloneAction => ({
  type: "clone",
  targetPlayer,
});

export class Clone implements Role {
  public id: string;
  public name: string = "الشبيه";
  public team: Team = Team.Village;
  public description: string = "ياخد دور لاعب تاني ويعمل حركته على طول";

  constructor() {
    this.id = Math.random().toString(36).substring(2, 10);
  }

  public performAction(): Function {
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
      const clonedRole = targetPlayer.getOriginalRole();
      const clonedRoleName = roleIdOf(clonedRole.name);

      player.setRole(clonedRole);
      (player as any)._wasClone = true;
      (player as any)._clonedRoleName = clonedRoleName;
      (player as any)._clonedRole = clonedRole;

      const needsSecondAction = CLONE_FOLLOW_UP_ROLES.includes(clonedRoleName);
      let autoResult: any = null;

      if (CLONE_AUTO_ACTION_ROLES.includes(clonedRoleName)) {
        autoResult = clonedRole.performAction()(game, player, { type: clonedRoleName });
      } else if (!needsSecondAction) {
        switch (clonedRoleName) {
          case "werewolf":
            autoResult = {
              message: `استنسخت ${targetPlayer.name} وبقيت عفريت… انت في فريق الشر دلوقتي.`,
            };
            break;

          case "minion":
            autoResult = {
              message: `استنسخت ${targetPlayer.name} وبقيت التابع… انت في فريق الشر دلوقتي.`,
            };
            break;

          case "mason":
            autoResult = {
              message: `استنسخت ${targetPlayer.name} وبقيت بنّاي… هتصحى مع البنايين.`,
            };
            break;

          case "insomniac":
            autoResult = {
              message: `استنسخت ${targetPlayer.name} وبقيت الساهر… هتشيك على دورك آخر الليل.`,
            };
            break;

          case "oracle":
            autoResult = {
              message: `استنسخت ${targetPlayer.name} وبقيت الكاهن… هتيجيك رؤية آخر الليل.`,
            };
            break;

          default:
            autoResult = {
              message: `You cloned ${targetPlayer.name} and became a ${clonedRole.name}.`,
            };
            break;
        }
      }

      let groundCards: Array<{ id: string; label: string }> | null = null;
      if (needsSecondAction && (clonedRoleName === "seer" || clonedRoleName === "warlock")) {
        groundCards = game.groundRoles.map((r, index) => ({
          id: r.id,
          label: `Ground Card ${index + 1}`,
        }));
      }

      let otherPlayers: Array<{ id: string; name: string }> | null = null;
      if (needsSecondAction && (clonedRoleName === "seer" || clonedRoleName === "robber" || clonedRoleName === "troublemaker" || clonedRoleName === "warlock")) {
        otherPlayers = game.players.filter((p) => p.id !== player.id).map((p) => ({ id: p.id, name: p.name }));
      }

      return {
        clonedRole: clonedRole.name,
        clonedRoleTeam: clonedRole.team,
        needsSecondAction,
        autoResult,
        groundCards,
        otherPlayers,
        delayedWake: CLONE_DELAYED_WAKE_ROLES.includes(clonedRoleName),
        message: needsSecondAction ? `استنسخت ${targetPlayer.name} وبقيت ${clonedRole.name}… اعمل حركته دلوقتي!` : autoResult?.message || `بقيت ${clonedRole.name}`,
      };
    };
  }
}
