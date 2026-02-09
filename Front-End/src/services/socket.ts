import { io, Socket } from "socket.io-client";

// Types matching your backend
interface JoinGameData {
  gameCode: string;
  playerName: string;
}

interface JoinGameResponse {
  success: boolean;
  playerId?: string;
  playerName?: string;
  message?: string;
  error?: string;
}

interface PlayerJoinedData {
  playerId: string;
  playerName: string;
  playerCount: number;
}

interface PlayerListUpdateData {
  players: Array<{
    id: string;
    name: string;
  }>;
}

interface GameStartedData {
  phase: string;
}

// Socket instance (singleton)
class SocketService {
  private socket: Socket | null = null;
  private serverUrl = "http://localhost:3000"; // Change this to your backend URL

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(this.serverUrl, {
      transports: ["websocket"],
      autoConnect: true,
    });

    this.socket.on("connect", () => {
      console.log("Connected to server:", this.socket?.id);
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from server");
    });

    this.socket.on("error", (data: { message: string }) => {
      console.error("Socket error:", data.message);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Join game
  joinGame(data: JoinGameData, callback: (response: JoinGameResponse) => void): void {
    if (!this.socket) {
      callback({ success: false, error: "Not connected to server" });
      return;
    }
    this.socket.emit("joinGame", data, callback);
  }

  // Listen for player joined
  onPlayerJoined(callback: (data: PlayerJoinedData) => void): void {
    this.socket?.on("playerJoined", callback);
  }

  // Listen for player list update
  onPlayerListUpdate(callback: (data: PlayerListUpdateData) => void): void {
    this.socket?.on("playerListUpdate", callback);
  }

  // Listen for game started
  onGameStarted(callback: (data: GameStartedData) => void): void {
    this.socket?.on("gameStarted", callback);
  }

  // Start game (host only)
  startGame(gameCode: string): void {
    this.socket?.emit("startGame", { gameCode });
  }

  // Leave game
  leaveGame(gameCode: string, playerId: string): void {
    this.socket?.emit("leaveGame", { gameCode, playerId });
  }

  // Remove all listeners
  removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }
}

export const socketService = new SocketService();
