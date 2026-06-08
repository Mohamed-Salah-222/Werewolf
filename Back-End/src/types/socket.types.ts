import { Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerId,
} from "@werewolf/shared";
export interface JoinGameResponse {
  success: boolean;
  playerId?: PlayerId;
  playerName?: string;
  message?: string;
  error?: string;
}

export type PlayerSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents
> & { playerId: PlayerId };
