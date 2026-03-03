import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import { clearSession, saveSession } from "../utils/gameSession";
import VoiceChat from "../components/VoiceChat";
import "./Results.css";

interface LocationState {
  playerName: string;
  playerId: string;
  isHost: boolean;
  winners: string;
  votes: Array<{ voter: string; vote: string }>;
  playerRoles: Array<{ playerId: string; name: string; role: string }>;
}

function getTeam(role: string): string {
  const villains = ["werewolf", "minion"];
  if (villains.includes(role.toLowerCase())) return "werewolves";
  if (role.toLowerCase() === "joker") return "joker";
  return "villagers";
}

function getColorClass(role: string): string {
  const team = getTeam(role);
  if (team === "werewolves") return "res-color--villain";
  if (team === "joker") return "res-color--neutral";
  return "res-color--village";
}

function getWinnerColorClass(winners: string): string {
  if (winners === "werewolves") return "res-color--villain";
  if (winners === "joker") return "res-color--neutral";
  return "res-color--village";
}

function Results() {
  const { gameCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const playerId = state?.playerId || "";
  const isHost = state?.isHost || false;
  const winners = state?.winners || "";
  const votes = state?.votes || [];
  const playerRoles = state?.playerRoles || [];

  const [showVotes, setShowVotes] = useState(false);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.on("gameRestarted", () => {
      saveSession({
        gameCode: gameCode || "",
        playerId: state?.playerId || "",
        playerName: state?.playerName || "",
        isHost: state?.isHost || false,
      });
      navigate(`/waiting/${gameCode}`, {
        state: { playerName: state?.playerName, playerId: state?.playerId, isHost: state?.isHost },
      });
    });

    return () => {
      socket.off("gameRestarted");
    };
  }, [gameCode, navigate, state]);

  const handleRestart = () => {
    setRestarting(true);
    socket.emit("restartGame", { gameCode });
  };

  const voteCounts = new Map<string, number>();
  votes.forEach((v) => {
    voteCounts.set(v.vote, (voteCounts.get(v.vote) || 0) + 1);
  });

  let mostVotedId = "";
  let maxVotes = 0;
  voteCounts.forEach((count, id) => {
    if (count > maxVotes) {
      maxVotes = count;
      mostVotedId = id;
    }
  });

  const isNoWerewolfVote = mostVotedId === "noWerewolf";
  const mostVotedPlayer = isNoWerewolfVote ? null : playerRoles.find((p) => p.playerId === mostVotedId);
  const myRole = playerRoles.find((p) => p.playerId === playerId);

  const didIWin = () => {
    if (!myRole) return false;
    const myTeam = getTeam(myRole.role);
    if (winners === "joker" && myRole.role.toLowerCase() === "joker") return true;
    if (winners === "werewolves" && myTeam === "werewolves") return true;
    if (winners === "villagers" && myTeam === "villagers") return true;
    return false;
  };

  const winnerLabel = () => {
    switch (winners) {
      case "werewolves":
        return "Werewolves Win";
      case "villagers":
        return "Village Wins";
      case "joker":
        return "Joker Wins";
      default:
        return winners;
    }
  };

  const getPlayerName = (id: string) => {
    if (id === "noWerewolf") return "No Werewolf";
    const p = playerRoles.find((pr) => pr.playerId === id);
    return p?.name || id;
  };

  return (
    <div className="res-page">
      <div className="res-vignette" />
      <div className="res-content">
        {/* Winner banner */}
        <div className={`res-banner`}>
          <h1 className={`res-winner-text ${getWinnerColorClass(winners)}`}>{winnerLabel()}</h1>
          <p className="res-personal-result">{didIWin() ? "You won!" : "You lost."}</p>
        </div>

        {/* Voice Chat */}
        <div className="res-voice">
          <VoiceChat gameCode={gameCode || ""} playerId={playerId} />
        </div>

        {/* Eliminated */}
        {isNoWerewolfVote ? (
          <div className="res-eliminated">
            <p className="res-eliminated-label">VILLAGE DECISION</p>
            <p className="res-eliminated-name">No Werewolf</p>
            <p className="res-eliminated-role res-color--neutral">The village believes all werewolves are on the ground</p>
            <p className="res-eliminated-votes">
              {maxVotes} vote{maxVotes !== 1 ? "s" : ""}
            </p>
          </div>
        ) : (
          mostVotedPlayer && (
            <div className="res-eliminated">
              <p className="res-eliminated-label">ELIMINATED</p>
              <p className="res-eliminated-name">{mostVotedPlayer.name}</p>
              <p className={`res-eliminated-role ${getColorClass(mostVotedPlayer.role)}`}>{mostVotedPlayer.role}</p>
              <p className="res-eliminated-votes">
                {maxVotes} vote{maxVotes !== 1 ? "s" : ""}
              </p>
            </div>
          )
        )}

        {/* All roles */}
        <div className="res-section">
          <h2 className="res-section-title">ALL ROLES</h2>
          <div className="res-role-list">
            {playerRoles.map((p) => (
              <div key={p.playerId} className="res-role-row">
                <span className="res-role-name">{p.name}</span>
                <span className={`res-role-value ${getColorClass(p.role)}`}>{p.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vote breakdown */}
        <div className="res-section">
          <button className="res-toggle-btn" onClick={() => setShowVotes(!showVotes)}>
            <span>{showVotes ? "HIDE" : "SHOW"} VOTE DETAILS</span>
            <span className="res-toggle-arrow">{showVotes ? "▲" : "▼"}</span>
          </button>
          {showVotes && (
            <div className="res-vote-list">
              {votes.map((v, i) => (
                <div key={i} className="res-vote-row">
                  <span className="res-voter-name">{getPlayerName(v.voter)}</span>
                  <span className="res-arrow">→</span>
                  <span className="res-voted-name">{getPlayerName(v.vote)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="res-actions">
          {isHost && (
            <button className="res-restart-btn" onClick={handleRestart} disabled={restarting}>
              {restarting ? "RESTARTING..." : "PLAY AGAIN"}
            </button>
          )}
          <button
            className="res-home-btn"
            onClick={() => {
              clearSession();
              navigate("/");
            }}
          >
            BACK TO HOME
          </button>
        </div>
      </div>
    </div>
  );
}

export default Results;
