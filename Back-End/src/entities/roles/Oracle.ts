import { Role } from "./Role";
import { ROLE_REGISTRY, Team } from "@werewolf/shared";
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
  public name: string = ROLE_REGISTRY.oracle.name;
  public team: Team = Team.Village;
  public description: string = ROLE_REGISTRY.oracle.description;

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
          message: "الأرواح ساكتة… مفيش رؤيات لليلة دي.",
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
const AR_TO_ID: Record<string, string> = {
  "العفريت": "werewolf",
  "التابع": "minion",
  "الرمال": "seer",
  "الحرامي": "robber",
  "الشقية": "troublemaker",
  "البناي": "mason",
  "الليم": "drunk",
  "الساهر": "insomniac",
  "الشبيه": "clone",
  "الجوكر": "joker",
  "الساحر": "warlock",
  "الكاهن": "oracle",
};

function buildVisionMessage(roleName: string, result: Record<string, unknown>): string {
  const r = AR_TO_ID[roleName] ?? roleName.toLowerCase();

  switch (r) {
    case "werewolf": {
      if (result.isAlone === true && typeof result.groundCard === "string") {
        return `العفريت شاف ${result.groundCard} على الأرض.`;
      }
      const wolves = result.werewolves as Array<{ name: string }> | undefined;
      if (Array.isArray(wolves) && wolves.length > 0) {
        const names = wolves.map((w) => w.name).join(", ");
        return `العفريت شاف إن شلته هي: ${names}.`;
      }
      return "العفريت عمل حركته.";
    }

    case "minion": {
      const wolves = result.werewolves as Array<{ name: string }> | undefined;
      if (Array.isArray(wolves) && wolves.length > 0) {
        const names = wolves.map((w) => w.name).join(", ");
        return `التابع شاف إن العفاريت هم: ${names}.`;
      }
      return "التابع ملقاش عفاريت.";
    }

    case "seer": {
      if (result.actionType === "player" && typeof result.role === "string") {
        return `الرمال شاف ${result.role}.`;
      }
      if (result.actionType === "ground" && typeof result.groundRole1 === "string" && typeof result.groundRole2 === "string") {
        return `الرمال شاف ${result.groundRole1} و${result.groundRole2} على الأرض.`;
      }
      return "الرمال عمل حركته.";
    }

    case "clone": {
      if (typeof result.clonedRole === "string") {
        return `الشبيه استنسخ دور ${result.clonedRole}.`;
      }
      return "الشبيه عمل حركته.";
    }

    case "mason": {
      const masons = result.masons as Array<{ name: string }> | undefined;
      if (Array.isArray(masons) && masons.length > 0) {
        const names = masons.map((m) => m.name).join(", ");
        return `البناي شاف إخوته البنايين: ${names}.`;
      }
      return "البناي لوحدو.";
    }

    case "robber": {
      if (typeof result.newRole === "string") {
        return `الحرامي سرق دور وبقى ${result.newRole}.`;
      }
      return "الحرامي عمل حركته.";
    }

    case "troublemaker": {
      if (typeof result.player1Name === "string" && typeof result.player2Name === "string") {
        return `الشقية بدلت بين ${result.player1Name} و${result.player2Name}.`;
      }
      return "الشقية بدلت لاعبين.";
    }

    case "drunk":
      return "الليم بدل دوره بكارت أرض.";

    case "insomniac": {
      if (result.hasChanged === true && typeof result.currentRole === "string") {
        return `دور الساهر اتبادل بقى ${result.currentRole}.`;
      }
      return "دور الساهر ماتبادلش.";
    }

    case "joker": {
      if (typeof result.groundRole === "string") {
        return `الجوكر شاف ${result.groundRole} على الأرض.`;
      }
      return "الجوكر عمل حركته.";
    }

    case "warlock": {
      if (typeof result.targetName === "string") {
        return `الساحر بدل دور ${result.targetName} بكارت أرض.`;
      }
      return "الساحر بدل دور لاعب بكارت أرض.";
    }

    default:
      return `${roleName} عمل حركته.`;
  }
}
