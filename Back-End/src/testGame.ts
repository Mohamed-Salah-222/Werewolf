import { Game } from "./entities/game";
import { Logger } from "./utils/Logger";

const logger = new Logger();

function log(msg: string) {
  console.log(msg);
  logger.info(msg);
}

function divider(title: string) {
  const line = "═".repeat(60);
  log("");
  log(line);
  log(`  ${title}`);
  log(line);
}

// ════════════════════════════════════════════════════════════
//  CREATE GAME + JOIN 12 PLAYERS
// ════════════════════════════════════════════════════════════

const game = new Game(logger);

const playerNames = ["Salah", "Slta", "Yosre", "Fady", "7oda", "SaSa", "Mo7e", "7mada", "3okl", "Omer", "Jo", "7mdy"];

divider("JOINING PLAYERS");
playerNames.forEach((name) => {
  game.playerJoin(name);
  log(`  ✅ ${name} joined`);
});

// Ready all players
game.players.forEach((p) => {
  game.playerReady(p.id);
});

log(`\n  Players: ${game.players.length}`);
log(`  All ready: ${game.allPlayersReady}`);

// ════════════════════════════════════════════════════════════
//  START GAME — roles assigned
// ════════════════════════════════════════════════════════════

divider("STARTING GAME");
game.start();

log(`  Phase: ${game.phase}`);
log(`  Ground cards: ${game.groundRoles.map((r) => r.name).join(", ")}`);
log("");

// Print role assignments
game.players.forEach((p) => {
  log(`  🎭 ${p.name.padEnd(10)} → ${p.getRole().name} (${p.getRole().team})`);
});

// ════════════════════════════════════════════════════════════
//  CONFIRM ROLE REVEALS
// ════════════════════════════════════════════════════════════

divider("ROLE REVEAL PHASE");
game.players.forEach((p) => {
  game.confirmPlayerRoleReveal(p.id);
});
log("  All players confirmed their roles");

// ════════════════════════════════════════════════════════════
//  NIGHT PHASE — manually perform each role's action
// ════════════════════════════════════════════════════════════

divider("NIGHT PHASE — MANUAL ACTIONS");

// We need to perform actions in the correct role order.
// Instead of relying on the timer system, we'll execute actions directly.

const roleOrder = ["Werewolf", "Minion", "Clone", "Seer", "Mason", "Robber", "Troublemaker", "Drunk", "Warlock", "Insomniac", "Joker", "Oracle"];

for (const roleName of roleOrder) {
  const playersWithRole = game.players.filter((p) => p.getOriginalRole().name === roleName);

  if (playersWithRole.length === 0) continue;

  log(`\n  ── ${roleName.toUpperCase()} ──`);

  for (const player of playersWithRole) {
    const otherPlayers = game.players.filter((p) => p.id !== player.id);
    let action: Record<string, unknown>;
    let result: Record<string, unknown>;

    try {
      switch (roleName.toLowerCase()) {
        case "werewolf":
          action = { type: "werewolf" };
          result = player.performOriginalAction(game, action);
          break;

        case "minion":
          action = { type: "minion" };
          result = player.performOriginalAction(game, action);
          break;

        case "clone": {
          const target = otherPlayers[0];
          action = { type: "clone", targetPlayer: { id: target.id } };
          result = player.performOriginalAction(game, action);

          if ((result as { needsSecondAction?: boolean }).needsSecondAction) {
            const clonedRole = ((result as { clonedRole?: string }).clonedRole || "").toLowerCase();
            log(`    🧬 Clone copied ${(result as { clonedRole?: string }).clonedRole} — needs second action`);

            let secondAction: Record<string, unknown> | null = null;
            switch (clonedRole) {
              case "seer":
                secondAction = { type: "seer_player_role", targetPlayer: { id: otherPlayers[1].id } };
                break;
              case "robber":
                secondAction = { type: "robber", targetPlayer: { id: otherPlayers[1].id } };
                break;
              case "troublemaker":
                secondAction = { type: "troublemaker", player1: { id: otherPlayers[1].id }, player2: { id: otherPlayers[2].id } };
                break;
              case "drunk":
                secondAction = { type: "drunk", targetRoleId: game.groundRoles[0].id };
                break;
              case "warlock":
                secondAction = { type: "warlock", targetPlayer: { id: otherPlayers[1].id } };
                break;
            }

            if (secondAction) {
              const clonedRoleObj = player.getRole();
              const secondResult = clonedRoleObj.performAction()(game, player, secondAction);
              log(`    🧬 Clone second action result: ${(secondResult as { message?: string }).message}`);
              result = { ...result, secondActionResult: secondResult };
            }
          }
          break;
        }

        case "seer": {
          // Look at a player's role
          const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
          action = { type: "seer_player_role", targetPlayer: { id: target.id } };
          result = player.performOriginalAction(game, action);
          break;
        }

        case "mason":
          action = { type: "mason" };
          result = player.performOriginalAction(game, action);
          break;

        case "robber": {
          const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
          action = { type: "robber", targetPlayer: { id: target.id } };
          result = player.performOriginalAction(game, action);
          break;
        }

        case "troublemaker": {
          const shuffled = [...otherPlayers].sort(() => Math.random() - 0.5);
          action = { type: "troublemaker", player1: { id: shuffled[0].id }, player2: { id: shuffled[1].id } };
          result = player.performOriginalAction(game, action);
          break;
        }

        case "drunk":
          action = { type: "drunk", targetRoleId: game.groundRoles[0].id };
          result = player.performOriginalAction(game, action);
          break;

        case "warlock": {
          const target = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
          action = { type: "warlock", targetPlayer: { id: target.id } };
          result = player.performOriginalAction(game, action);
          break;
        }

        case "insomniac":
          action = { type: "insomniac" };
          result = player.performOriginalAction(game, action);
          break;

        case "joker":
          action = { type: "joker", targetRoleId: game.groundRoles[0].id };
          result = player.performOriginalAction(game, action);
          break;

        case "oracle": {
          // DEBUG: show all available results
          log("    [DEBUG] Results the Oracle can pick from:");
          game.players.forEach((p2) => {
            const r2 = (p2 as unknown as { lastActionResult?: Record<string, unknown> }).lastActionResult;
            if (r2 && p2.id !== player.id) {
              log(`      ${p2.name} (orig: ${p2.getOriginalRole().name}): ${JSON.stringify(r2).substring(0, 150)}`);
            }
          });

          action = { type: "oracle" };
          result = player.performOriginalAction(game, action);
          break;
        }

        default:
          result = { message: "No action" };
      }

      // Store result for Oracle to read
      (player as unknown as { lastActionResult: Record<string, unknown> }).lastActionResult = result;

      // Mark as performed
      if (!game.confirmedPlayerPerformActions.includes(player.id)) {
        game.confirmedPlayerPerformActions.push(player.id);
      }

      const msg = (result as { message?: string }).message || JSON.stringify(result);
      log(`    ${player.name}: ${msg}`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      log(`    ❌ ${player.name}: ERROR — ${errMsg}`);
    }
  }
}

// ════════════════════════════════════════════════════════════
//  POST-NIGHT: Show role changes
// ════════════════════════════════════════════════════════════

divider("ROLE CHANGES AFTER NIGHT");
game.players.forEach((p) => {
  const original = p.getOriginalRole().name;
  const current = p.getRole().name;
  const changed = original !== current;
  log(`  ${p.name.padEnd(10)} ${original.padEnd(14)} → ${current.padEnd(14)} ${changed ? "⚡ CHANGED" : ""}`);
});

log("\n  Ground cards after night:");
game.groundRoles.forEach((r, i) => {
  log(`    Ground ${i + 1}: ${r.name}`);
});

// ════════════════════════════════════════════════════════════
//  VOTING PHASE
// ════════════════════════════════════════════════════════════

divider("VOTING PHASE");

// Skip discussion, go straight to voting
game.phase = "vote" as any;

// Everyone votes randomly
game.players.forEach((voter) => {
  const targets = game.players.filter((p) => p.id !== voter.id);
  const target = targets[Math.floor(Math.random() * targets.length)];
  game.playerVote(voter.id, target.id);
  log(`  ${voter.name.padEnd(10)} voted for ${target.name}`);
});

// ════════════════════════════════════════════════════════════
//  RESULTS
// ════════════════════════════════════════════════════════════

divider("GAME RESULTS");

log(`  Winners: ${game.winners}`);

// Vote tally
const voteCounts = new Map<string, number>();
game.votes.forEach((v) => {
  voteCounts.set(v.vote, (voteCounts.get(v.vote) || 0) + 1);
});

log("\n  Vote tally:");
const sorted = [...voteCounts.entries()].sort((a, b) => b[1] - a[1]);
sorted.forEach(([playerId, count]) => {
  const p = game.getPlayerById(playerId);
  log(`    ${p.name.padEnd(10)} — ${count} vote(s) [current role: ${p.getRole().name}]`);
});

// Action history
if (game.actionHistory.length > 0) {
  log("\n  Night action history:");
  game.actionHistory.forEach((entry) => {
    log(`    ${entry.role.padEnd(14)} (${entry.playerName}): ${entry.description}`);
  });
}

divider("TEST COMPLETE");
log(`  Check logs/game.log for full output`);
log("");

// Close logger
setTimeout(() => process.exit(0), 500);
