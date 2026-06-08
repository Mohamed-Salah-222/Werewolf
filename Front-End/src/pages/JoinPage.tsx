import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGameStore } from "../store/gameStore";
import { connectAndJoin } from "../store/sockets";
import "./JoinPage.css";

// ===== COMPONENT =====

type PageStatus = "loading" | "error" | "started";

function JoinPage() {
  const { gameCode: urlCode } = useParams<{ gameCode: string }>();
  const navigate = useNavigate();

  const code = urlCode?.toLowerCase() || "";
  const isValidCode = code.length === 6;

  const [status, setStatus] = useState<PageStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  // ── Connect socket, emit join, timeout on failure ────────────────────────
  useEffect(() => {
    if (!isValidCode) return;

    const savedName = sessionStorage.getItem("werewolf_playerName");
    const playerName = savedName && savedName.trim().length >= 2 ? savedName.trim() : "";
    const cancelJoin = connectAndJoin({ gameCode: code, playerName });

    const timeout = setTimeout(() => {
      const { gameCode: storeCode } = useGameStore.getState();
      if (storeCode !== code) {
        setStatus("error");
        setErrorMsg("Could not join game. It may not exist or has already started.");
      }
    }, 10000);

    return () => {
      cancelJoin();
      clearTimeout(timeout);
    };
  }, [code, isValidCode]);

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
