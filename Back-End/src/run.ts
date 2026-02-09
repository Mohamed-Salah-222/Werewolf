import { Game } from './entities/Game';
import { Logger } from './utils/Logger';
import { Phase } from './config/constants';
import { PlayerId } from './types/game.types';

// basic logger
const logger = new Logger();

// create game
const game = new Game(logger);

// ---- EVENT LISTENERS (what socket handlers will later be) ----

game.on('playerJoin', (name: string) => {
  console.log(`[EVENT] player joined: ${name}`);
});

game.on('gameStarted', () => {
  console.log('[EVENT] game started');
  console.log('Phase:', game.phase);

  // simulate all players confirming role reveal
  game.players.forEach((p) => {
    game.confirmPlayerRoleReveal(p.id);
  });

  // start night after reveal
  game.startNight();
});

game.on('playerRoleRevealConfirmed', (playerId: PlayerId) => {
  const player = game.getPlayerById(playerId);
  console.log(`[EVENT] role revealed by ${player.name} and role is ${player.getRole().name}`);
});

game.on('nightStarted', () => {
  console.log('[EVENT] night started');
});

game.on('roleActionQueue', (roleName: string) => {
  console.log(`[EVENT] first role action: ${roleName}`);
  performRandomActionsForRole(roleName);
});


game.on('dayStarted', () => {
  console.log('[EVENT] day started');
});

game.on('votingStarted', () => {
  console.log('[EVENT] voting started');

  // everyone votes randomly (except self)
  game.players.forEach((voter) => {
    const targets = game.players.filter((p) => p.id !== voter.id);
    const randomTarget =
      targets[Math.floor(Math.random() * targets.length)]; game.playerVote(voter.id, randomTarget.id);
  });
});

game.on('winnersCalculated', (winner) => {
  console.log('[EVENT] winners:', winner);
});
function prettyPrintVotes() {
  game.votes.forEach((vote) => {
    console.log(`Voter: ${game.getPlayerById(vote.voter).name} has voted for ${game.getPlayerById(vote.vote).name} and his role is ${game.getPlayerById(vote.vote).getRole().name}`);
  });
  const mostVotedPlayer = getMostVotedPlayer();
  console.log(`Most voted player: is ${game.getPlayerById(mostVotedPlayer).name} and his role is ${game.getPlayerById(mostVotedPlayer).getRole().name}`);
}
function getMostVotedPlayer() {
  const voteCounts = new Map();

  // Count votes for each player
  game.votes.forEach((vote) => {
    const currentCount = voteCounts.get(vote.vote) || 0;
    voteCounts.set(vote.vote, currentCount + 1);
  });

  // Find player with most votes
  let mostVotedPlayer = null;
  let maxVotes = 0;

  voteCounts.forEach((count, playerId) => {
    if (count > maxVotes) {
      maxVotes = count;
      mostVotedPlayer = playerId;
    }
  });

  return mostVotedPlayer;
}

game.on('gameEnded', (winner) => {
  console.log('[EVENT] game ended');
  console.log('Winner:', winner);
  prettyPrintVotes();
});

// ---- DUMMY ACTION DRIVER ----

game.on('nextAction', (roleName: string) => {
  console.log(`[EVENT] next role action: ${roleName}`);
  performRandomActionsForRole(roleName);
});

function performRandomActionsForRole(roleName: string) {
  if (roleName === undefined) {
    return;
  }

  const playersWithRole = game.players.filter(
    (player) => player.getRole().name === roleName
  );

  console.log(
    `[ACTION] ${playersWithRole.length} player(s) with role ${roleName}`
  );

  // If no one has this role, immediately advance
  if (playersWithRole.length === 0) {
    const next = game.nextAction();
    game.emit('nextAction', next);
    return;
  }

  playersWithRole.forEach((player) => {
    console.log(`[ACTION] player ${player.name} (${roleName}) performs action`);
    game.playerPerformAction(player.id);
  });
}

// ---- BOOTSTRAP GAME ----

// minimum is 6 players
const dummyPlayers = [
  'Alice',
  'Bob',
  'Charlie',
  'Diana',
  'Eve',
  'Frank',
];

dummyPlayers.forEach((name) => game.playerJoin(name));

// start game
game.start();
