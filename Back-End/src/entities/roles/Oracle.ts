import { Role } from "./Role";
import { Team } from "../../config/constants";
import { Game } from "../game";
import { Player } from "../Player";

export interface OracleAction {
  type: "oracle";
}

export const createOracleAction = (): OracleAction => ({
  type: "oracle",
});

export class Oracle implements Role {
  public id: string;
  public name: string = "Oracle";
  public team: Team = Team.Heroes;
  public description: string = "At the end of night, receives a random action result from another player";

  constructor() {
    this.id = Math.random().toString(36).substring(2, 10);
  }

  public performAction(): Function {
    return function (game: Game, player: Player, action: OracleAction) {
      if (action.type !== "oracle") {
        throw new Error(`Invalid action for Oracle. Expected 'oracle', received '${action.type}'.`);
      }

      // Collect action results from all other players who have acted
      const otherResults: Array<{ role: string; result: Record<string, unknown> }> = [];

      for (const p of game.players) {
        if (p.id === player.id) continue;

        const result = (p as unknown as { lastActionResult?: Record<string, unknown> }).lastActionResult;
        if (!result) continue;

        const roleName = p.getOriginalRole().name;
        otherResults.push({ role: roleName, result });
      }

      // No results available — fallback
      if (otherResults.length === 0) {
        return {
          hasVision: false,
          message: "The spirits are silent — no visions came to you tonight.",
        };
      }

      // Pick a random result
      const picked = otherResults[Math.floor(Math.random() * otherResults.length)];
      const visionMessage = buildVisionMessage(picked.role, picked.result);

      return {
        hasVision: true,
        sourceRole: picked.role,
        vision: visionMessage,
        message: visionMessage,
      };
    };
  }
}

/**
 * Builds a role-only vision message from an action result.
 * The Oracle sees role names, NOT player names.
 */
function buildVisionMessage(roleName: string, result: Record<string, unknown>): string {
  const r = roleName.toLowerCase();

  switch (r) {
    case "werewolf": {
      if (result.isAlone === true && typeof result.groundCard === "string") {
        return `The Werewolf saw a ${result.groundCard} on the ground.`;
      }
      const wolves = result.werewolves as Array<{ name: string }> | undefined;
      if (Array.isArray(wolves) && wolves.length > 0) {
        const names = wolves.map((w) => w.name).join(", ");
        return `The Werewolf saw that ${names} ${wolves.length > 1 ? "are Werewolves" : "is also a Werewolf"}.`;
      }
      return "The Werewolf performed their action.";
    }

    case "minion": {
      const wolves = result.werewolves as Array<{ name: string }> | undefined;
      if (Array.isArray(wolves) && wolves.length > 0) {
        const names = wolves.map((w) => w.name).join(", ");
        return `The Minion saw that the Werewolves are: ${names}.`;
      }
      return "The Minion found no Werewolves.";
    }

    case "seer": {
      if (result.actionType === "player" && typeof result.role === "string") {
        return `The Seer saw a ${result.role}.`;
      }
      if (result.actionType === "ground" && typeof result.groundRole1 === "string" && typeof result.groundRole2 === "string") {
        return `The Seer saw ${result.groundRole1} and ${result.groundRole2} on the ground.`;
      }
      return "The Seer performed their action.";
    }

    case "clone": {
      if (typeof result.clonedRole === "string") {
        return `The Clone copied a ${result.clonedRole}.`;
      }
      return "The Clone performed their action.";
    }

    case "mason": {
      const masons = result.masons as Array<{ name: string }> | undefined;
      if (Array.isArray(masons) && masons.length > 0) {
        const names = masons.map((m) => m.name).join(", ");
        return `The Mason saw ${names} as a fellow Mason.`;
      }
      return "The Mason is alone.";
    }

    case "robber": {
      if (typeof result.newRole === "string") {
        return `The Robber stole a ${result.newRole}.`;
      }
      return "The Robber performed their action.";
    }

    case "troublemaker": {
      if (typeof result.player1Name === "string" && typeof result.player2Name === "string") {
        return `The Troublemaker swapped ${result.player1Name} and ${result.player2Name}.`;
      }
      return "The Troublemaker swapped two players.";
    }

    case "drunk":
      return "The Drunk swapped their role with a ground card.";

    case "insomniac": {
      if (result.hasChanged === true && typeof result.currentRole === "string") {
        return `The Insomniac's role was swapped to ${result.currentRole}.`;
      }
      return "The Insomniac's role was not swapped.";
    }

    case "joker": {
      if (typeof result.groundRole === "string") {
        return `The Joker saw a ${result.groundRole} on the ground.`;
      }
      return "The Joker performed their action.";
    }

    case "warlock": {
      if (typeof result.targetName === "string") {
        return `The Warlock swapped ${result.targetName}'s role with a ground card.`;
      }
      return "The Warlock swapped a player's role with a ground card.";
    }

    default:
      return `The ${roleName} performed their action.`;
  }
}
