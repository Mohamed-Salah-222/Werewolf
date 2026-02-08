import { Game } from "./entities/Game";
import { Logger } from "./utils/Logger";

/* ---------------------------------------------
 * Pretty printing helpers
 * ------------------------------------------- */

const hr = (title?: string) => {
  console.log("\n" + "─".repeat(60));
  if (title) console.log(`▶ ${title}`);
  console.log("─".repeat(60));
};

const log = (label: string, data?: any) => {
  console.log(
    `\x1b[36m${label}\x1b[0m`,
    data !== undefined ? JSON.stringify(data, null, 2) : ""
  );
};

/* ---------------------------------------------
 * Boot game
 * ------------------------------------------- */

const logger = Logger.getInstance();
const game = new Game(logger);

hr("GAME CREATED");
log("Game code", game.code);

/* ---------------------------------------------
 * Event listeners (simulate socket handlers)
 * ------------------------------------------- */

game.on("playerJoin", (name) => log("EVENT playerJoin", name));
game.on("gameStarted", () => log("EVENT gameStarted"));
game.on("playerRoleRevealConfirmed", (id) =>
  log("EVENT roleRevealConfirmed", id)
);
game.on("nightStarted", () => log("EVENT nightStarted"));
game.on("perfomActionsStarted", () => log("EVENT performActionsStarted"));
game.on("nextAction", (action) =>
  log("EVENT nextAction (ignored)", action)
);
game.on("votingStarted", () => log("EVENT votingStarted"));
game.on("winnersCalculated", (winners) =>
  log("EVENT winnersCalculated", winners)
);
game.on("gameEnded", (result) =>
  log("EVENT gameEnded", result)
);
game.on("gameRestarted", () => log("EVENT gameRestarted"));

/* ---------------------------------------------
 * Dummy players (MIN = 6)
 * ------------------------------------------- */

const PLAYERS = [
  "Alice",
  "Bob",
  "Charlie",
  "Diana",
  "Eve",
  "Frank",
];

hr("PLAYERS JOIN");

PLAYERS.forEach((name) => game.playerJoin(name));

/* ---------------------------------------------
 * Start game
 * ------------------------------------------- */

hr("START GAME");
game.start();

/* ---------------------------------------------
 * Role reveal confirmation (dummy)
 * ------------------------------------------- */

hr("ROLE REVEAL CONFIRMATION");

game.players.forEach((p) => {
  game.confirmPlayerRoleReveal(p.id);
});

/* ---------------------------------------------
 * Night phase
 * ------------------------------------------- */

hr("NIGHT START");
game.startNight();

/* ---------------------------------------------
 * Perform actions (DUMMY CONFIRMATIONS ONLY)
 * ------------------------------------------- */

hr("PERFORM ACTIONS");

game.startPerformActions();

/**
 * Randomize order to simulate network timing
 */
const shuffled = [...game.players].sort(() => Math.random() - 0.5);

shuffled.forEach((player, index) => {
  setTimeout(() => {
    log("ACTION CONFIRMED BY", player.name);
    game.playerPerformAction(player.id);
  }, index * 300);
});

/* ---------------------------------------------
 * Voting (after actions settle)
 * ------------------------------------------- */

setTimeout(() => {
  hr("VOTING");

  game.startVoting();

  const ids = game.players.map((p) => p.id);

  game.players.forEach((p) => {
    const vote =
      ids[Math.floor(Math.random() * ids.length)];
    log("VOTE", { from: p.name, to: vote });
    game.playerVote(p.id, vote);
  });
}, 3000);
