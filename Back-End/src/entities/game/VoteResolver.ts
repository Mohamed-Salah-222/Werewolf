import { Team } from "../../config/constants";
import { Player } from "../Player";
import { PlayerId, Vote } from "../../types/game.types";
import { Logger } from "../../utils/Logger";

export class VoteResolver {
  constructor(private logger: Logger) {}

  getVoteResults(votes: Vote[]): Map<string, number> {
    let mapVotes = new Map<string, number>();

    for (let i = 0; i < votes.length; i++) {
      let vote = votes[i];
      if (mapVotes.has(vote.vote)) {
        mapVotes.set(vote.vote, mapVotes.get(vote.vote) + 1);
      } else {
        mapVotes.set(vote.vote, 1);
      }
    }

    return mapVotes;
  }

  calculateResults(mapVotes: Map<PlayerId, number>, players: Player[]): { winners: string; isDraw: boolean; eliminatedPlayerId: string | null; winningTeam: Team } {
    const getPlayerById = (id: string): Player => {
      const player = players.find((p) => p.id === id);
      if (!player) throw new Error(`Player with id ${id} not found`);
      return player;
    };

    const maxVotes = Math.max(...Array.from(mapVotes.values()));
    const topVoted = Array.from(mapVotes.entries()).filter(([_, count]) => count === maxVotes);

    let winners: Team;

    // Draw — no elimination
    if (topVoted.length > 1) {
      const tiedPlayerIds = topVoted.map(([id]) => id).filter((id) => id !== "noWerewolf");
      const allWerewolves =
        tiedPlayerIds.length > 0 &&
        tiedPlayerIds.every((id) => {
          const player = getPlayerById(id);
          return player.getRole().name === "Werewolf";
        });

      if (allWerewolves) {
        winners = Team.Heroes;
      } else {
        const jokerTied = tiedPlayerIds.some((id) => {
          const player = getPlayerById(id);
          return player.getRole().team === Team.Joker;
        });

        if (jokerTied) {
          winners = Team.Joker;
        } else {
          winners = Team.Villains;
        }
      }

      return { winners, isDraw: true, eliminatedPlayerId: null, winningTeam: winners };
    }

    // Single top-voted target
    const voted = topVoted[0][0];

    if (voted === "noWerewolf") {
      for (const player of players) {
        if (player.getRole().name === "Werewolf") {
          winners = Team.Villains;
          return { winners, isDraw: false, eliminatedPlayerId: null, winningTeam: winners };
        }
      }
      winners = Team.Heroes;
      return { winners, isDraw: false, eliminatedPlayerId: null, winningTeam: winners };
    }

    const votedPlayerRole = getPlayerById(voted).getRole();

    if (votedPlayerRole.team === Team.Joker) {
      winners = Team.Joker;
    } else if (votedPlayerRole.name === "Minion") {
      winners = Team.Villains;
    } else if (votedPlayerRole.team === Team.Villains) {
      winners = Team.Heroes;
    } else {
      winners = Team.Villains;
    }

    return { winners, isDraw: false, eliminatedPlayerId: voted, winningTeam: winners };
  }

  buildActionHistory(players: Player[]): Array<{ role: string; playerName: string; description: string }> {
    const roleOrder = ["Werewolf", "Minion", "Clone", "Seer", "Mason", "Robber", "Troublemaker", "Drunk", "Insomniac", "Joker"];
    const actionHistory: Array<{ role: string; playerName: string; description: string }> = [];

    for (const roleName of roleOrder) {
      const playersWithRole = players.filter((p) => p.getOriginalRole().name === roleName);

      for (const player of playersWithRole) {
        const result = (player as any).lastActionResult;
        if (!result) continue;

        actionHistory.push({
          role: roleName,
          playerName: player.name,
          description: result.message || "Performed their action",
        });
      }
    }

    return actionHistory;
  }
}
