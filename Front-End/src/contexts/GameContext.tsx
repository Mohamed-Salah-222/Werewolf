import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import socket from "../socket";
import { getSession, saveSession, clearSession } from "../utils/gameSession";
import { API_URL } from "../config";
import { GameContext, type GameSession, type RejoinResponse } from "./GameContextType";

export function GameProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSessionState] = useState<GameSession | null>(getSession());
  const [showRejoinModal, setShowRejoinModal] = useState(false);
  const [rejoinLoading, setRejoinLoading] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  const hasCheckedRef = useRef(false);

  const setSession = useCallback((s: GameSession) => {
    saveSession(s);
    setSessionState(s);
  }, []);

  const endSession = useCallback(() => {
    clearSession();
    setSessionState(null);
  }, []);

  // On mount + on disconnect: check if session exists and we need to rejoin
  useEffect(() => {
    const checkSession = () => {
      const saved = getSession();
      if (saved && location.pathname !== "/") {
        setShowRejoinModal(true);
      }
    };

    // Check on mount (refresh case)
    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true;
      // Small delay to let the page render first
      setTimeout(checkSession, 100);
    }

    const onDisconnect = () => {
      setDisconnected(true);
      const saved = getSession();
      if (saved && location.pathname !== "/") {
        setShowRejoinModal(true);
      }
    };

    const onConnect = () => {
      setDisconnected(false);
    };

    socket.on("disconnect", onDisconnect);
    socket.on("connect", onConnect);

    return () => {
      socket.off("disconnect", onDisconnect);
      socket.off("connect", onConnect);
    };
  }, [location.pathname]);

  const handleRejoin = async () => {
    const saved = getSession();
    if (!saved) return;
    setRejoinLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/games/${saved.gameCode}`);
      const data = await res.json();
      if (!data.success) {
        clearSession();
        setSessionState(null);
        setShowRejoinModal(false);
        setRejoinLoading(false);
        navigate("/");
        return;
      }

      if (!socket.connected) socket.connect();
      await new Promise<void>((resolve) => {
        if (socket.connected) resolve();
        else socket.once("connect", () => resolve());
      });

      socket.emit(
        "rejoinGame" as "joinGame",
        {
          gameCode: saved.gameCode,
          playerId: saved.playerId,
          playerName: saved.playerName,
        } as never,
        ((response: RejoinResponse) => {
          setRejoinLoading(false);
          setShowRejoinModal(false);

          if (!response.success) {
            clearSession();
            setSessionState(null);
            navigate("/");
            return;
          }

          const updatedSession: GameSession = {
            gameCode: saved.gameCode,
            playerId: response.playerId || saved.playerId,
            playerName: response.playerName || saved.playerName,
            isHost: saved.isHost,
          };
          saveSession(updatedSession);
          setSessionState(updatedSession);

          const baseState = {
            playerName: updatedSession.playerName,
            playerId: updatedSession.playerId,
            isHost: updatedSession.isHost,
          };
          const gameCode = saved.gameCode;

          switch (response.phase) {
            case "waiting":
              navigate(`/waiting/${gameCode}`, { state: baseState, replace: true });
              break;
            case "role":
              navigate(`/role-reveal/${gameCode}`, {
                state: {
                  ...baseState,
                  rejoinRoleInfo: response.roleInfo || null,
                  hasConfirmedRole: response.hasConfirmedRole,
                },
                replace: true,
              });
              break;
            case "night":
              navigate(`/night/${gameCode}`, {
                state: {
                  ...baseState,
                  roleName: response.roleInfo?.roleName,
                  initialGroundCards: response.groundCardsInfo,
                  hasPerformedAction: response.hasPerformedAction,
                  initialActiveRole: response.currentActiveRole,
                  lastActionResult: response.lastActionResult,
                },
                replace: true,
              });
              break;
            case "discussion":
              navigate(`/discussion/${gameCode}`, {
                state: {
                  ...baseState,
                  timerSeconds: response.timerSeconds,
                  currentTimerSec: response.currentTimerSec,
                  startedAt: response.startedAt,
                  roleName: response.roleInfo?.roleName,
                  actionResult: response.lastActionResult,
                },
                replace: true,
              });
              break;
            case "vote":
              navigate(`/vote/${gameCode}`, {
                state: { ...baseState, hasVoted: response.hasVoted },
                replace: true,
              });
              break;
            default:
              clearSession();
              setSessionState(null);
              navigate("/");
              break;
          }
        }) as never,
      );
    } catch {
      setRejoinLoading(false);
      setShowRejoinModal(false);
      clearSession();
      setSessionState(null);
      navigate("/");
    }
  };

  const handleDecline = () => {
    clearSession();
    setSessionState(null);
    setShowRejoinModal(false);
    navigate("/");
  };

  return (
    <GameContext.Provider value={{ session, setSession, endSession }}>
      {children}
      {showRejoinModal && (
        <div style={overlayStyles.overlay}>
          <div style={overlayStyles.modal}>
            <style>{`
              @keyframes rejoinPulse {
                0%, 100% { opacity: 0.4; }
                50% { opacity: 1; }
              }
            `}</style>
            <div style={overlayStyles.iconWrapper}>
              <span style={overlayStyles.icon}>☽</span>
            </div>
            <h2 style={overlayStyles.title}>{disconnected ? "CONNECTION LOST" : "REJOIN GAME?"}</h2>
            <p style={overlayStyles.text}>{disconnected ? "You were disconnected from your game. Would you like to rejoin?" : "You were in a game. Would you like to rejoin?"}</p>
            <div style={overlayStyles.buttons}>
              <button style={overlayStyles.declineBtn} onClick={handleDecline} disabled={rejoinLoading}>
                START FRESH
              </button>
              <button style={overlayStyles.rejoinBtn} onClick={handleRejoin} disabled={rejoinLoading}>
                {rejoinLoading ? "REJOINING..." : "REJOIN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </GameContext.Provider>
  );
}

const overlayStyles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.92)",
  },
  modal: {
    backgroundColor: "#0f0d0a",
    border: "1px solid #2a2019",
    borderRadius: "4px",
    padding: "32px",
    width: "360px",
    textAlign: "center" as const,
  },
  iconWrapper: {
    marginBottom: "12px",
  },
  icon: {
    fontSize: "40px",
    color: "#c9a84c",
    filter: "drop-shadow(0 0 20px rgba(201,168,76,0.4))",
  },
  title: {
    fontSize: "22px",
    fontWeight: 400,
    letterSpacing: "5px",
    color: "#c9a84c",
    fontFamily: "'Creepster', cursive",
    margin: "0 0 12px 0",
  },
  text: {
    color: "#8a7a60",
    fontSize: "14px",
    marginBottom: "24px",
    fontFamily: "'Trade Winds', cursive",
    lineHeight: "1.6",
  },
  buttons: {
    display: "flex",
    gap: "12px",
  },
  declineBtn: {
    flex: 1,
    padding: "12px",
    fontSize: "13px",
    fontWeight: 400,
    letterSpacing: "2px",
    backgroundColor: "transparent",
    color: "#6b5a3a",
    border: "1px solid #2a2019",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "'Creepster', cursive",
  },
  rejoinBtn: {
    flex: 1,
    padding: "12px",
    fontSize: "13px",
    fontWeight: 400,
    letterSpacing: "2px",
    backgroundColor: "#c9a84c",
    color: "#0a0a0a",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "'Creepster', cursive",
  },
};
