// TypeScript types/interfaces for game-related data
import { Player } from '../entities/Player';
import { Game } from '../entities/Game';
import { TimerOption } from '../config/constants';

export type performActionReturn = (game: Game, player: Player) => any;

export type Vote = {
  // ids playerids
  voter: PlayerId;
  vote: PlayerId;
};
export type PlayerId = string;

export type Settings = {
  timer: TimerOption;
}
