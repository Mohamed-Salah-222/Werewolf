import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket from "../socket";
import { API_URL } from "../config";
import { useGameStore } from "../store/gameStore";
import "./JoinPage.css";

// ===== RANDOM NAMES =====
const RANDOM_NAMES = ["Nora Ganzer", "Mde7a 4waya", "Master Baiter", "BenDover69", "Cereal Killer", "Lionel Pepsi", "Kom Zbala", "8ba2 Astna3y", "Gaymer", "Chicken Bobs", "Hairy Potter", "Honor Hitler"];

function getRandomName(excludeNames: string[]): string {
  const available = RANDOM_NAMES.filter((n) => !excludeNames.some((ex) => ex.toLowerCase() === n.toLowerCase()));
  if (available.length === 0) {
    return `Wolf${Math.floor(Math.random() * 9000) + 1000}`;
  }
  return available[Math.floor(Math.random() * available.length)];
}

// ===== SOCKET HELPERS =====

interface JoinResponse {
  success: boolean;
  playerName?: string;
  playerId?: string;
  error?: string;
}

interface RejoinResponse {
  success: boolean;
  phase?: string;
  error?: string;
}

function ensureConnected(): Promise<void> {
  if (!socket.connected) socket.connect();
  return new Promise<void>((resolve) => {
    if (socket.connected) resolve();
    else socket.once("connect", () => resolve());
  });
}

function emitJoinGame(gameCode: string, playerName: string): Promise<JoinResponse> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ success: false, error: "Connection timed out" });
    }, 8000);
    socket.emit("joinGame", { gameCode, playerName }, (response: JoinResponse) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
}

function emitRejoinGame(gameCode: string, playerId: string, playerName: string): Promise<RejoinResponse> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ success: false, error: "Connection timed out" });
    }, 8000);
    socket.emit("rejoinGame", { gameCode, playerId, playerName }, (response: RejoinResponse) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
}

// ===== COMPONENT =====

type PageStatus = "loading" | "error" | "started";

const PHASE_ROUTES: Record<string, (code: string) => string> = {
  waiting: (c) => `/waiting/${c}`,
  role: (c) => `/role-reveal/${c}`,
  night: (c) => `/night/${c}`,
  discussion: (c) => `/discussion/${c}`,
  vote: (c) => `/vote/${c}`,
  endGame: (c) => `/results/${c}`,
};

function JoinPage() {
  const { gameCode: urlCode } = useParams<{ gameCode: string }>();
  const navigate = useNavigate();
  const hasAttemptedRef = useRef(false);

  const setSession = useGameStore((s) => s.setSession);
  const setPhase = useGameStore((s) => s.setPhase);
  const storedGameCode = useGameStore((s) => s.gameCode);
  const storedPlayerId = useGameStore((s) => s.playerId);
  const storedPlayerName = useGameStore((s) => s.playerName);

  const [status, setStatus] = useState<PageStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const code = urlCode?.toLowerCase() || "";
  const isValidCode = code.length === 6;

  useEffect(() => {
    if (hasAttemptedRef.current) return;
    if (!isValidCode) return;
    hasAttemptedRef.current = true;

    let cancelled = false;

    const attempt = async () => {
      try {
        // 1. Check if game exists
        const res = await fetch(`${API_URL}/api/games/${code}/check`);
        if (cancelled) return;
        const checkData = await res.json();

        if (!checkData.success) {
          if (!cancelled) {
            setStatus("error");
            setErrorMsg("This game doesn't exist or has been deleted.");
          }
          return;
        }

        // 2. Connect socket
        await ensureConnected();
        if (cancelled) return;

        // 3. Try rejoin if we were already in this game
        if (storedGameCode === code && storedPlayerId && storedPlayerName) {
          const rejoinRes = await emitRejoinGame(code, storedPlayerId, storedPlayerName);
          if (cancelled) return;

          if (rejoinRes.success) {
            const phase = rejoinRes.phase || "waiting";
            const routeFn = PHASE_ROUTES[phase];
            navigate(routeFn ? routeFn(code) : `/waiting/${code}`, { replace: true });
            return;
          }

          if (rejoinRes.error === "Game has already started") {
            if (!cancelled) setStatus("started");
            return;
          }
        }

        // 4. Fetch existing player names to avoid collisions
        let existingNames: string[] = [];
        try {
          const gameRes = await fetch(`${API_URL}/api/games/${code}`);
          if (cancelled) return;
          const gameData = await gameRes.json();
          if (gameData.success && gameData.data?.players) {
            existingNames = gameData.data.players.map((p: { name: string }) => p.name);
          }
        } catch {
          // Non-critical
        }
        if (cancelled) return;

        // 5. Pick a name: saved > random
        const savedName = sessionStorage.getItem("werewolf_playerName");
        let nameToUse: string;

        if (savedName && savedName.trim().length >= 2) {
          const nameTaken = existingNames.some((n) => n.toLowerCase() === savedName.trim().toLowerCase());
          nameToUse = nameTaken ? getRandomName(existingNames) : savedName.trim();
        } else {
          nameToUse = getRandomName(existingNames);
        }

        // 6. Join
        const joinRes = await emitJoinGame(code, nameToUse);
        if (cancelled) return;

        if (joinRes.success) {
          sessionStorage.setItem("werewolf_playerName", nameToUse);
          setSession({
            gameCode: code,
            playerId: joinRes.playerId || "",
            playerName: joinRes.playerName || nameToUse,
            isHost: false,
          });
          setPhase("waiting");
          navigate(`/waiting/${code}`, { replace: true });
          return;
        }

        // 7. Name collision — retry with random
        if (joinRes.error?.includes("name") || joinRes.error?.includes("already joined")) {
          const retryName = getRandomName([...existingNames, nameToUse]);
          const retryRes = await emitJoinGame(code, retryName);
          if (cancelled) return;

          if (retryRes.success) {
            sessionStorage.setItem("werewolf_playerName", retryName);
            setSession({
              gameCode: code,
              playerId: retryRes.playerId || "",
              playerName: retryRes.playerName || retryName,
              isHost: false,
            });
            setPhase("waiting");
            navigate(`/waiting/${code}`, { replace: true });
            return;
          }

          if (!cancelled) {
            setStatus("error");
            setErrorMsg(retryRes.error || "Failed to join game.");
          }
          return;
        }

        if (joinRes.error?.includes("already started") || joinRes.error?.includes("not in Waiting")) {
          if (!cancelled) setStatus("started");
          return;
        }

        if (!cancelled) {
          setStatus("error");
          setErrorMsg(joinRes.error || "Failed to join game.");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg("Could not connect to server.");
        }
      }
    };

    attempt();

    return () => {
      cancelled = true;
      hasAttemptedRef.current = false;
    };
  }, [code, isValidCode, storedGameCode, storedPlayerId, storedPlayerName, navigate, setSession, setPhase]);

  // ===== RENDER =====

  if (!isValidCode) {
    return (
      <div className="join-page">
        <div className="join-vignette" />
        <div className="join-card">
          <div className="join-spinner" />
          <h2 className="join-title">INVALID LINK</h2>
          <p className="join-subtitle">This game link isn't valid.</p>
          <button className="join-home-btn" onClick={() => navigate("/")}>
            GO HOME
          </button>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="join-page">
        <div className="join-vignette" />
        <div className="join-card">
          <div className="join-spinner" />

          <h2 className="join-title">JOINING GAME...</h2>
          <p className="join-subtitle">Setting up your disguise</p>
        </div>
      </div>
    );
  }

  if (status === "started") {
    return (
      <div className="join-page">
        <div className="join-vignette" />
        <div className="join-card">
          <div className="join-spinner" />
          <h2 className="join-title">GAME IN PROGRESS</h2>
          <p className="join-subtitle">This game has already started. You can't join mid-game.</p>
          <button className="join-home-btn" onClick={() => navigate("/")}>
            GO HOME
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="join-page">
      <div className="join-vignette" />
      <div className="join-card">
        <h2 className="join-title">COULDN'T JOIN</h2>
        <p className="join-subtitle">{errorMsg}</p>
        <button className="join-home-btn" onClick={() => navigate("/")}>
          GO HOME
        </button>
      </div>
    </div>
  );
}

export default JoinPage;
