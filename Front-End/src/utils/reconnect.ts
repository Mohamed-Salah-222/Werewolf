import socket from "../socket";
import { getSession, clearSession, saveSession } from "./gameSession";



interface RejoinResponse {
  success: boolean;
  playerId?: string;
  playerName?: string;
  phase?: string;
  roleInfo?: {
    roleName: string;
    roleTeam: string;
    roleDescription?: string;
    currentRoleName: string;
  } | null;
  groundCardsInfo?: Array<{ id: string; label: string }> | null;
  hasPerformedAction?: boolean;
  hasConfirmedRole?: boolean;
  hasVoted?: boolean;
  players?: Array<{ id: string; name: string }>;
  timerSeconds?: number;
  currentActiveRole?: string;
  lastActionResult?: { message?: string } | null;
  error?: string;
}

export function reconnect(): RejoinResponse | undefined {
  if (!socket.connected) {
    socket.connect();
  }
  const session = getSession();
  if (!session) return;

  socket.emit("rejoinGame", { gameCode: session.gameCode, playerId: session.playerId, playerName: session.playerName }, (response: RejoinResponse) => {
    if (!response.success) {
      clearSession();
      return;
    }
    saveSession({
      gameCode: session.gameCode,
      playerId: response.playerId || session.playerId,
      playerName: response.playerName || session.playerName,
      isHost: session.isHost,
    });
    return response;
  });
}

export default reconnect;
