import { useState, useCallback, useEffect, useRef } from "react";
import type { PointerEvent } from "react";
import { API_URL } from "../config";
import { useGameStore } from "../store/gameStore";

import "./HomePage.css";
import { gameActions, connectSocket } from "../store/sockets";
import settingsAsset from "../assets/settings.webp";
import titleAsset from "../assets/logo.webp";
import accountAsset from "../assets/account.webp";
import buttonAsset from "../assets/button.webp";
import characterAsset from "../assets/character.webp";
import loreAsset from "../assets/lore.webp";
import abilityAsset from "../assets/ability.webp";

const homeCharacterImages = [characterAsset];

const homeCharacterLores = [
  "العصفورة قاعد وسط الناس في الحارة بيشوف كل واحد بيعمل ايه وبيامن الطريق للحرامية وبينقلهم الاخبار اول باول",
];

const homeCharacterAbilities = ["بينقل معلومة حد معين لواحد من الحرامية"];

// ===== COMPONENT =====

function HomePage() {
  const reset = useGameStore((s) => s.reset);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const [playerName, setPlayerName] = useState(() => sessionStorage.getItem("werewolf_playerName") || "");
  const [gameCode, setGameCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [homeCharacterIndex, setHomeCharacterIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);

  // === ANIMATION STATE ===
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    reset();
  }, [reset]);

  // Trigger mount animation
  useEffect(() => {
    // Small delay so the browser paints the initial state first
    const raf = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const closeModals = useCallback(() => {
    setShowCreateModal(false);
    setShowJoinModal(false);
    setError("");
    setPlayerName(sessionStorage.getItem("werewolf_playerName") || "");
    setGameCode("");
  }, []);

  const handleCreateGame = useCallback(async () => {
    if (playerName.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    sessionStorage.setItem("werewolf_playerName", playerName.trim());

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/games/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!data.success) {
        setError("Failed to create game");
        setLoading(false);
        return;
      }
      const code = data.data.code;
      connectSocket();
      gameActions.joinGame({ gameCode: code, playerName: playerName.trim() });
      setShowCreateModal(false);
    } catch {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  }, [playerName]);

  const handleJoinGame = useCallback(async () => {
    if (playerName.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    if (gameCode.trim().length !== 6) {
      setError("Game code must be 6 characters");
      return;
    }
    sessionStorage.setItem("werewolf_playerName", playerName.trim());
    setLoading(true);
    setError("");
    try {
      const code = gameCode.trim().toLowerCase();
      const name = playerName.trim();
      connectSocket();
      gameActions.joinGame({ gameCode: code, playerName: name });
      setShowJoinModal(false);
    } catch {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  }, [playerName, gameCode]);

  const activeHomeCharacterImage = homeCharacterImages[homeCharacterIndex];
  const activeHomeCharacterLore = homeCharacterLores[homeCharacterIndex];
  const activeHomeCharacterAbility = homeCharacterAbilities[homeCharacterIndex];

  const handleHomeCharacterStep = useCallback((direction: 1 | -1) => {
    setHomeCharacterIndex((currentIndex) => {
      const itemCount = homeCharacterImages.length;
      return (currentIndex + direction + itemCount) % itemCount;
    });
  }, []);

  const handleHomeCharacterPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.clientX;
  }, []);

  const handleHomeCharacterPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (touchStartXRef.current === null) return;

      const swipeDistance = event.clientX - touchStartXRef.current;
      touchStartXRef.current = null;

      if (Math.abs(swipeDistance) < 36) return;
      handleHomeCharacterStep(swipeDistance < 0 ? 1 : -1);
    },
    [handleHomeCharacterStep],
  );

  return (
    <div className={`home-page ${mounted ? "home-page--mounted" : ""}`}>
        <div className="home-header">
          <button className="home-header-icon" type="button" aria-label="Settings">
            <img src={settingsAsset} alt="" className="home-header-img home-header-img--settings" />
          </button>
          <img src={titleAsset} alt="Werewolf" className="home-header-title-img" />
          <button className="home-header-icon" type="button" aria-label="Account">
            <img src={accountAsset} alt="" className="home-header-img home-header-img--account" />
          </button>
        </div>
        <div className="home-header-separator" />
        <div className="home-action-row">
          <button
            className="home-action-asset-btn"
            type="button"
            onClick={() => {
              closeModals();
              setShowCreateModal(true);
            }}
          >
            <img src={buttonAsset} alt="" className="home-action-asset-img" />
            <span className="home-action-asset-text">ابدا لعب</span>
          </button>
          <button
            className="home-action-asset-btn"
            type="button"
            onClick={() => {
              closeModals();
              setShowJoinModal(true);
            }}
          >
            <img src={buttonAsset} alt="" className="home-action-asset-img" />
            <span className="home-action-asset-text">خش الحارة</span>
          </button>
          <button className="home-action-asset-btn" type="button">
            <img src={buttonAsset} alt="" className="home-action-asset-img" />
            <span className="home-action-asset-text">ازاي تلعب</span>
          </button>
        </div>
        <div className="home-action-separator" />
        <div
          className="home-character-panel"
          onPointerDown={handleHomeCharacterPointerDown}
          onPointerUp={handleHomeCharacterPointerUp}
        >
          <img src={activeHomeCharacterImage} alt="" className="home-character-img" />
        </div>
        <div className="home-character-separator" />
        <div className="home-lore-panel">
          <img src={loreAsset} alt="" className="home-lore-img" />
          <p className="home-panel-text home-lore-text">{activeHomeCharacterLore}</p>
        </div>
        <div className="home-lore-separator" />
        <div className="home-ability-panel">
          <img src={abilityAsset} alt="" className="home-ability-img" />
          <p className="home-panel-text home-ability-text-new">{activeHomeCharacterAbility}</p>
        </div>

      {showCreateModal && (
        <div className="home-overlay" onClick={closeModals}>
          <div className="home-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="home-modal-title">CREATE GAME</h2>
            <input className="home-input" type="text" placeholder="Enter your name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={20} onKeyDown={(e) => e.key === "Enter" && handleCreateGame()} autoFocus />
            {error && <p className="home-error">{error}</p>}
            <div className="home-modal-buttons">
              <button className="home-cancel-btn" onClick={closeModals}>
                CANCEL
              </button>
              <button className="home-confirm-btn" onClick={handleCreateGame} disabled={loading}>
                {loading ? "CREATING..." : "CREATE"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="home-overlay" onClick={closeModals}>
          <div className="home-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="home-modal-title">JOIN GAME</h2>
            <input className="home-input" type="text" placeholder="Game Code" value={gameCode} onChange={(e) => setGameCode(e.target.value)} maxLength={6} autoFocus />
            <input className="home-input" type="text" placeholder="Enter your name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={20} onKeyDown={(e) => e.key === "Enter" && handleJoinGame()} />
            {error && <p className="home-error">{error}</p>}
            <div className="home-modal-buttons">
              <button className="home-cancel-btn" onClick={closeModals}>
                CANCEL
              </button>
              <button className="home-confirm-btn" onClick={handleJoinGame} disabled={loading}>
                {loading ? "JOINING..." : "JOIN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
