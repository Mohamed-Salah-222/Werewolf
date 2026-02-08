// TypeScript types/interfaces for game-related data
import { Player } from '../entities/Player';
import { Game } from '../entities/Game';

export type performActionReturn = (game: Game, player: Player) => any;
