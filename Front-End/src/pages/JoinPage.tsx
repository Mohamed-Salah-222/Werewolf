import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket from "../socket";
import { useGameStore } from "../store/gameStore";
import { gameActions } from "../store/sockets";
import "./JoinPage.css";

// ===== COMPONENT =====

type PageStatus = "loading" | "error" | "started";

function JoinPage() {
  const { gameCode: urlCode } = useParams<{ gameCode: string }>();
  const navigate = useNavigate();

  const phase = useGameStore((s) => s.phase);
  const playerId = useGameStore((s) => s.playerId);
  const gameCode = useGameStore((s) => s.gameCode);

  const code = urlCode?.toLowerCase() || "";
  const isValidCode = code.length === 6;

  const [status, setStatus] = useState<PageStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const resolvedRef = useRef(false);

  // ── Single effect: attach listeners, connect, emit, timeout ──────────────
  useEffect(() => {
    if (!isValidCode) return;

    resolvedRef.current = false;

    const onError = (data: { message: string }) => {
      if (resolvedRef.current) return;
      const msg = (data?.message || "").toLowerCase();

      if (msg.includes("already started") || msg.includes("not in waiting")) {
        resolvedRef.current = true;
        setStatus("started");
        return;
      }

      resolvedRef.current = true;
      setStatus("error");
      setErrorMsg(data?.message || "Failed to join game.");
    };

    socket.on("error", onError);

    const doJoin = () => {
      if (resolvedRef.current) return;
      const savedName = sessionStorage.getItem("werewolf_playerName");
      const playerName = savedName && savedName.trim().length >= 2 ? savedName.trim() : "";
      gameActions.joinGame({ gameCode: code, playerName });
    };

    socket.on("connect", doJoin);
    if (socket.connected) {
      doJoin();
    } else {
      socket.connect();
    }

    const timeout = setTimeout(() => {
      if (!resolvedRef.current) {
        resolvedRef.current = true;
        setStatus("error");
        setErrorMsg("Connection timed out. The game might not exist.");
      }
    }, 10000);

    return () => {
      resolvedRef.current = true;
      socket.off("error", onError);
      socket.off("connect", doJoin);
      clearTimeout(timeout);
    };
  }, [code, isValidCode]);

  // ── Phase watcher — guard against stale store state ───────────────────────
  useEffect(() => {
    if (phase === "home" || gameCode !== code || !playerId) return;
    resolvedRef.current = true;
    const routeMap: Record<string, string> = {
      waiting: "waiting",
      role: "role-reveal",
      night: "night",
      discussion: "discussion",
      vote: "vote",
      results: "results",
    };
    const route = routeMap[phase];
    if (route) navigate(`/${route}/${code}`, { replace: true });
  }, [phase, gameCode, code, playerId, navigate]);

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
