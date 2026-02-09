import { Role } from "./Role";
import { Team } from "../../config/constants";
import { Game } from "../Game";
import { Player } from "../Player";

export enum SeerActionType {
  SeePlayerRole = "seer_player_role",
  SeeGroundRoles = "seer_ground_roles",
}

export interface SeerSeePlayerAction {
  type: SeerActionType.SeePlayerRole;
  targetPlayer: Player;
}

export interface SeerSeeGroundRolesAction {
  type: SeerActionType.SeeGroundRoles;
  groundRole1: Role;
  groundRole2: Role;
}

export type SeerAction = SeerSeePlayerAction | SeerSeeGroundRolesAction;

export const createSeerAction = {
  seePlayer: (targetPlayer: Player): SeerSeePlayerAction => ({
    type: SeerActionType.SeePlayerRole,
    targetPlayer,
  }),
  seeGround: (groundRole1: Role, groundRole2: Role): SeerSeeGroundRolesAction => ({
    type: SeerActionType.SeeGroundRoles,
    groundRole1,
    groundRole2,
  }),
};

export class Seer implements Role {
  public id: string;
  public name: string = "Seer";
  public team: Team = Team.Heroes;
  public description: string = "Looks at one player's role OR two ground cards";

  constructor() {
    this.id = Math.random().toString(36).substring(2, 10);
  }

  public performAction(): Function {
    return function (game: Game, player: Player, action: SeerAction) {
      if (action.type !== SeerActionType.SeePlayerRole && action.type !== SeerActionType.SeeGroundRoles) {
        throw new Error(`Invalid action for Seer. Expected 'seer_player_role' or 'seer_ground_roles', received '${(action as any).type}'.`);
      }

      if (action.type === SeerActionType.SeePlayerRole) {
        if (!action.targetPlayer) {
          throw new Error("Seer player action requires a target player");
        }

        const targetPlayer = game.players.find((p) => p.id === action.targetPlayer.id);

        if (!targetPlayer) {
          throw new Error("Target player not found");
        }

        if (targetPlayer.id === player.id) {
          throw new Error("Seer cannot target themselves");
        }

        const targetRole = targetPlayer.getRole();

        return {
          actionType: "player",
          playerName: targetPlayer.name,
          role: targetRole.name,
          team: targetRole.team,
          message: `${targetPlayer.name} is a ${targetRole.name}`,
        };
      } else {
        const groundRole1 = game.groundRoles.find((r) => r.id === action.groundRole1.id);
        const groundRole2 = game.groundRoles.find((r) => r.id === action.groundRole2.id);

        if (!groundRole1 || !groundRole2) {
          throw new Error("Ground roles not found");
        }

        if (groundRole1.id === groundRole2.id) {
          throw new Error("Cannot select the same ground card twice");
        }

        return {
          actionType: "ground",
          groundRole1: groundRole1.name,
          groundRole2: groundRole2.name,
          message: `You saw ${groundRole1.name} and ${groundRole2.name} on the ground`,
        };
      }
    };
  }
}
