import reconnect from "../utils/reconnect";
import { useNavigate } from "react-router-dom";
import { getSession, clearSession } from "../utils/gameSession";


export function Reconnecting() {
  const response = reconnect()!;
  const navigate = useNavigate();
  const session = getSession()!;
  if (!response) {
    console.log("Failed to reconnect");
    navigate("/");
  }
  if (!session) {
    console.log("Session not found");
    navigate("/");
  }
  const baseState = {
    playerName: response.playerName || session.playerName,
    playerId: response.playerId || session.playerId,
    isHost: session.isHost,
  };
  if (response) {
    switch (response.phase) {
      case "waiting":
        navigate(`/waiting/${session.gameCode}`, { state: baseState });
        break;
      case "role":
        navigate(`/role-reveal/${session.gameCode}`, {
          state: { ...baseState, rejoinRoleInfo: response.roleInfo, hasConfirmedRole: response.hasConfirmedRole },
        });
        break;
      case "night":
        navigate(`/night/${session.gameCode}`, {
          state: {
            ...baseState,
            roleName: response.roleInfo?.roleName,
            initialGroundCards: response.groundCardsInfo,
            hasPerformedAction: response.hasPerformedAction,
            initialActiveRole: response.currentActiveRole,
            lastActionResult: response.lastActionResult,
          },
        });
        break;
      case "discussion":
        navigate(`/discussion/${session.gameCode}`, {
          state: {
            ...baseState,
            timerSeconds: response.timerSeconds || 360,
            roleName: response.roleInfo?.roleName,
            actionResult: response.lastActionResult,
          },
        });
        break;
      case "vote":
        navigate(`/vote/${session.gameCode}`, { state: { ...baseState, hasVoted: response.hasVoted } });
        break;
      default:
        clearSession();
        navigate("/");
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.vignette} />
      <div style={styles.content}>
        <h1 style={styles.title}>RECONNECTING</h1>
        <p style={styles.subtitle}>The server is not responding. Please wait a few seconds and try again.</p>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    position: "relative",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(ellipse at 50% 30%, #1a0a0a 0%, #0a0a0a 50%, #000 100%)",
    fontFamily: "'Trade Winds', cursive",
    color: "#e8dcc8",
  },
  vignette: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
    zIndex: 1,
  },
  content: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    width: "100%",
    maxWidth: "420px",
    padding: "32px 20px",
  },
  title: {
    fontSize: "36px",
    fontWeight: 400,
    letterSpacing: "8px",
    margin: 0,
    fontFamily: "'Creepster', cursive",
    background: "linear-gradient(180deg, #e8c84a 0%, #c9a84c 40%, #8a6d2e 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    filter: "drop-shadow(0 0 30px rgba(201,168,76,0.2))",
  },
  subtitle: {
    fontSize: "14px",
    color: "#5a4a30",
    marginBottom: "32px",
    fontStyle: "italic",
  },
};
