import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import socket from "../socket";
import { useGameStore } from "../store/gameStore";
import { API_URL } from "../config";

export function useSocketRejoin() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    const attemptRejoin = async () => {
      const { gameCode, playerId, playerName, phase, reset } = useGameStore.getState();

      // Nothing to rejoin
      if (!gameCode || !playerId || phase === "home") return;

      // Don't rejoin if we're on the home page
      if (location.pathname === "/") return;

      // Already attempted this session
      if (hasAttemptedRef.current) return;
      hasAttemptedRef.current = true;

      try {
        // Check if game still exists
        const res = await fetch(`${API_URL}/api/games/${gameCode}`);
        const data = await res.json();

        if (!data.success) {
          reset();
          navigate("/");
          return;
        }

        // Ensure socket is connected
        if (!socket.connected) socket.connect();
        await new Promise<void>((resolve) => {
          if (socket.connected) resolve();
          else socket.once("connect", () => resolve());
        });

        // Rejoin the socket room
        socket.emit("rejoinGame", { gameCode, playerId, playerName }, (response: { success: boolean; error?: string }) => {
          if (!response.success) {
            // If rejoin fails during waiting phase, try joining fresh
            if (phase === "waiting" && playerName) {
              socket.emit("joinGame", { gameCode, playerName }, (joinResponse: { success: boolean; playerId?: string }) => {
                if (joinResponse.success && joinResponse.playerId) {
                  useGameStore.getState().setSession({
                    gameCode,
                    playerId: joinResponse.playerId,
                    playerName: playerName,
                    isHost: false,
                  });
                } else {
                  reset();
                  navigate("/");
                }
              });
            } else {
              reset();
              navigate("/");
            }
          }
        });
      } catch {
        // Server unreachable — keep store data, user can retry
      }
    };

    attemptRejoin();
  }, [location.pathname, navigate]);

  // Handle disconnects during active game
  useEffect(() => {
    const onReconnect = () => {
      const { gameCode, playerId, playerName, phase } = useGameStore.getState();
      if (!gameCode || !playerId || !playerName || phase === "home") return;

      socket.emit("rejoinGame", { gameCode, playerId, playerName }, (response: { success: boolean }) => {
        if (!response.success && phase === "waiting" && playerName) {
          socket.emit("joinGame", { gameCode, playerName }, (joinResponse: { success: boolean; playerId?: string }) => {
            if (joinResponse.success && joinResponse.playerId) {
              useGameStore.getState().setSession({
                gameCode,
                playerId: joinResponse.playerId,
                playerName,
                isHost: false,
              });
            }
          });
        }
      });
    };

    socket.on("connect", onReconnect);
    return () => {
      socket.off("connect", onReconnect);
    };
  }, []);
}
