import { io } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@werewolf/shared";
import { API_URL } from "./config";

const socket = io<ServerToClientEvents, ClientToServerEvents>(API_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

export default socket;
