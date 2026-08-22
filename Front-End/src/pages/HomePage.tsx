import { useState, useCallback, useEffect, useRef } from "react";
import { API_URL } from "../config";
import { useGameStore } from "../store/gameStore";

import { characters, type CharacterData } from "../characters";
import "./HomePage.css";
import HowToPlay from "../components/HowToPlay";
import { Team } from "@werewolf/shared";
import { gameActions, connectSocket } from "../store/sockets";

// ===== HELPERS =====

function teamColor(team: string): string {
  if (team === Team.Villain) return "var(--color-villain)";
  if (team === Team.Neutral) return "var(--color-neutral)";
  return "var(--color-village)";
}

function teamLabel(team: string): string {
  if (team === Team.Villain) return "فريق العفاريت";
  if (team === Team.Neutral) return "مستقل";
  return "فريق القرية";
}

// ===== COMPONENT =====

function HomePage() {
  const reset = useGameStore((s) => s.reset);

  const [selectedChar, setSelectedChar] = useState<CharacterData>(characters[0]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const [playerName, setPlayerName] = useState(() => sessionStorage.getItem("werewolf_playerName") || "");
  const [gameCode, setGameCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // === ANIMATION STATE ===
  const [mounted, setMounted] = useState(false);
  const [charSwitching, setCharSwitching] = useState(false);
  const [displayedChar, setDisplayedChar] = useState<CharacterData>(characters[0]);
  const switchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // FIX #2: Use a ref for the carousel grid instead of document.querySelector
  const gridRef = useRef<HTMLDivElement>(null);

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

  // FIX #1: Guard timeout callback against rapid switches using a pending ref
  const pendingCharRef = useRef<CharacterData | null>(null);

  const handleCharSwitch = useCallback(
    (char: CharacterData) => {
      if (char.id === selectedChar.id) return;

      // Clear any pending switch
      if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);

      // Track which character this switch is for
      pendingCharRef.current = char;

      // Start exit animation
      setCharSwitching(true);

      // After exit animation completes, swap character and enter
      switchTimeoutRef.current = setTimeout(() => {
        // Only apply if this is still the latest requested switch
        if (pendingCharRef.current?.id !== char.id) return;

        setSelectedChar(char);
        setDisplayedChar(char);
        pendingCharRef.current = null;
        // Force reflow then remove switching class to trigger enter
        requestAnimationFrame(() => {
          setCharSwitching(false);
        });
      }, 250); // matches CSS exit duration
    },
    [selectedChar.id],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (switchTimeoutRef.current) clearTimeout(switchTimeoutRef.current);
    };
  }, []);

  const closeModals = useCallback(() => {
    setShowCreateModal(false);
    setShowJoinModal(false);
    setShowHowToPlay(false);
    setError("");
    setPlayerName(sessionStorage.getItem("werewolf_playerName") || "");
    setGameCode("");
  }, []);

  const handleCreateGame = useCallback(async () => {
    if (playerName.trim().length < 2) {
      setError("الاسم لازم يكون حرفين على الأقل");
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
        setError("حصلت مشكلة في عمل اللعبة، جرب تاني");
        setLoading(false);
        return;
      }
      const code = data.data.code;
      connectSocket();
      gameActions.joinGame({ gameCode: code, playerName: playerName.trim() });
      setShowCreateModal(false);
    } catch {
      setError("مقدرش أوصل للسيرفر، اتأكد من النت");
    } finally {
      setLoading(false);
    }
  }, [playerName]);

  const handleJoinGame = useCallback(async () => {
    if (playerName.trim().length < 2) {
      setError("الاسم لازم يكون حرفين على الأقل");
      return;
    }
    if (gameCode.trim().length !== 6) {
      setError("كود اللعبة لازم يكون 6 حروف");
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
      setError("مقدرش أوصل للسيرفر، اتأكد من النت");
    } finally {
      setLoading(false);
    }
  }, [playerName, gameCode]);

  return (
    <div className={`home-page ${mounted ? "home-page--mounted" : ""}`}>
      <div className="home-vignette" />

      {/* ===== TOP: TITLE + BUTTONS ===== */}
      <div className="home-topbar">
        <h1 className="home-title anim-title">الذئب</h1>
        <p className="home-tagline anim-title">حكاية قرية مصرية… اللي بيخون بيتكشف قبل الفجر</p>
        <div className="home-button-row">
          <button
            className="action-btn anim-btn anim-btn--1"
            onClick={() => {
              closeModals();
              setShowCreateModal(true);
            }}
          >
            اعمل لعبة
          </button>
          <button
            className="action-btn anim-btn anim-btn--2"
            onClick={() => {
              closeModals();
              setShowJoinModal(true);
            }}
          >
            انضم للعبة
          </button>
          <button
            className="action-btn anim-btn anim-btn--3"
            onClick={() => {
              closeModals();
              setShowHowToPlay(true);
            }}
          >
            إزاي بتتلعب؟
          </button>
        </div>
      </div>

      {/* ===== MIDDLE: CHARACTER SHOWCASE ===== */}
      <div className="home-showcase">
        <div className={`home-char-display anim-char-display ${charSwitching ? "char-exit" : "char-enter"}`}>
          {displayedChar.fullBody ? (
            <img src={displayedChar.fullBody} alt={displayedChar.name} className="home-fullbody-img" />
          ) : (
            <div className="home-placeholder-body">
              <span className="home-placeholder-icon">؟</span>
              <span className="home-placeholder-text">على قريب</span>
            </div>
          )}
        </div>

        <div className={`home-info-panel anim-info-panel ${charSwitching ? "info-exit" : "info-enter"}`}>
          <div className={`home-team-badge home-team-badge--${displayedChar.team}`}>{teamLabel(displayedChar.team)}</div>
          <h2 className="home-char-name">{displayedChar.name}</h2>
          <p className="home-char-title">{displayedChar.title}</p>
          <div className="home-divider" />
          <p className="home-char-desc">{displayedChar.description}</p>
          <div className="home-ability-box">
            <span className="home-ability-label">القدرة</span>
            <p className="home-ability-text">{displayedChar.ability}</p>
          </div>
        </div>
      </div>

      {/* ===== الحكايا: STORY STRIP ===== */}
      <div className="home-story anim-selectbar">
        <p>
          في قرية صغيرة على شط النيل، من ساعة ما القمر بيبقى مليان، الناس بتقول إن في عفاريت بتتجول بينهم بالليل
          وبصحى الصباح حد منهم مفقود… القرية عايزة تعرف: مين المستخبي بينكم؟ الحقيقة بتظهر قبل الفجر.
        </p>
      </div>

      {/* ===== BOTTOM: CHARACTER CAROUSEL ===== */}
      <div className="home-selectbar anim-selectbar">
        <button
          className="carousel-arrow carousel-arrow--left"
          onClick={() => {
            // FIX #2: Use ref instead of document.querySelector
            gridRef.current?.scrollBy({ left: -200, behavior: "smooth" });
          }}
          aria-label="اتعريض يمين"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="carousel-mask">
          {/* FIX #2: Attach ref to the grid element */}
          <div className="home-select-grid" ref={gridRef}>
            {characters.map((char, index) => {
              const isActive = selectedChar.id === char.id;
              const color = teamColor(char.team);
              return (
                <button
                  key={char.id}
                  className={`home-grid-slot anim-grid-slot ${isActive ? "home-grid-slot--active" : ""}`}
                  style={
                    {
                      "--slot-index": index,
                      ...(isActive
                        ? {
                          borderColor: color,
                          boxShadow: `0 0 20px ${color}60, inset 0 0 15px ${color}20`,
                        }
                        : undefined),
                    } as React.CSSProperties
                  }
                  onClick={() => handleCharSwitch(char)}
                >
                  {char.square ? (
                    <img src={char.square} alt={char.name} className="home-grid-img" />
                  ) : (
                    <div className="home-grid-placeholder">
                      <span className="home-grid-placeholder-text">{char.name.charAt(0)}</span>
                    </div>
                  )}
                  <span className="home-grid-label" style={{ color: isActive ? color : "#666" }}>
                    {char.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          className="carousel-arrow carousel-arrow--right"
          onClick={() => {
            // FIX #2: Use ref instead of document.querySelector
            gridRef.current?.scrollBy({ left: 200, behavior: "smooth" });
          }}
          aria-label="اتعرّض شمال"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
      </div>
      {/* ===== CREATE MODAL ===== */}
      {showCreateModal && (
        <div className="home-overlay" onClick={closeModals}>
          <div className="home-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="home-modal-title">اعمل لعبة</h2>
            <input className="home-input" type="text" placeholder="اكتب اسمك" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={20} onKeyDown={(e) => e.key === "Enter" && handleCreateGame()} autoFocus />
            {error && <p className="home-error">{error}</p>}
            <div className="home-modal-buttons">
              <button className="home-cancel-btn" onClick={closeModals}>
                إلغاء
              </button>
              <button className="home-confirm-btn" onClick={handleCreateGame} disabled={loading}>
                {loading ? "بيجهز…" : "اعمل"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== JOIN MODAL ===== */}
      {showJoinModal && (
        <div className="home-overlay" onClick={closeModals}>
          <div className="home-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="home-modal-title">انضم للعبة</h2>
            <input className="home-input home-input-code" type="text" placeholder="كود اللعبة" value={gameCode} onChange={(e) => setGameCode(e.target.value)} maxLength={6} autoFocus />
            <input className="home-input" type="text" placeholder="اكتب اسمك" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={20} onKeyDown={(e) => e.key === "Enter" && handleJoinGame()} />
            {error && <p className="home-error">{error}</p>}
            <div className="home-modal-buttons">
              <button className="home-cancel-btn" onClick={closeModals}>
                إلغاء
              </button>
              <button className="home-confirm-btn" onClick={handleJoinGame} disabled={loading}>
                {loading ? "بيحاول…" : "انضم"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showHowToPlay && <HowToPlay onClose={() => setShowHowToPlay(false)} />}
    </div>
  );
}

export default HomePage;
