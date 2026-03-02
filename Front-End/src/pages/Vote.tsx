import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import { API_URL } from "../config";
import { useLeaveWarning } from "../hooks/useLeaveWarning";
import VoiceChat from "../components/VoiceChat";
import "./Vote.css";

interface LocationState {
  playerName: string;
  playerId: string;
  isHost: boolean;
  hasVoted?: boolean;
}

interface PlayerInfo {
  id: string;
  name: string;
}

function Vote() {
  const { gameCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const playerName = state?.playerName || "Unknown";
  const playerId = state?.playerId || "";
  const isHost = state?.isHost || false;

  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [votedLocally, setVotedLocally] = useState(false);
  const hasVoted = votedLocally || state?.hasVoted || false;
  const [votedPlayers, setVotedPlayers] = useState<Set<string>>(new Set());

  useLeaveWarning(true);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await fetch(`${API_URL}/api/games/${gameCode}`);
        const data = await res.json();
        if (data.success && data.data.players) {
          setPlayers(data.data.players);
        }
      } catch {
        console.error("Failed to fetch players");
      }
    };
    fetchPlayers();
  }, [gameCode]);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.on("voteConfirmed", (data: { playerId: string }) => {
      setVotedPlayers((prev) => {
        const next = new Set(prev);
        next.add(data.playerId);
        return next;
      });
    });

    socket.on("gameEnded", (data: { winners: string; votes: Array<{ voter: string; vote: string }>; playerRoles: Array<{ playerId: string; name: string; role: string }> }) => {
      navigate(`/results/${gameCode}`, {
        state: { playerName, playerId, isHost, winners: data.winners, votes: data.votes, playerRoles: data.playerRoles },
      });
    });

    return () => {
      socket.off("voteConfirmed");
      socket.off("gameEnded");
    };
  }, [gameCode, navigate, playerName, playerId, isHost]);

  const handleVote = () => {
    if (!selected || hasVoted) return;
    setVotedLocally(true);
    socket.emit("vote", { gameCode, playerId, votedPlayerId: selected });
  };

  const others = players.filter((p) => p.id !== playerId);
  const totalPlayers = players.length;
  const totalVoted = votedPlayers.size + (hasVoted ? 1 : 0);

  return (
    <div className="vote-page">
      <div className="vote-vignette" />
      <div className="vote-content">
        <h1 className="vote-title">THE VOTE</h1>
        <p className="vote-subtitle">Who do you think is the Werewolf?</p>
        <p className="vote-count">
          {totalVoted} / {totalPlayers} voted
        </p>

        <div className="vote-voice">
          <VoiceChat gameCode={gameCode || ""} playerId={playerId} />
        </div>

        {!hasVoted ? (
          <>
            <div className="vote-list">
              {others.map((p) => (
                <button key={p.id} className={selected === p.id ? "vote-item--selected" : "vote-item"} onClick={() => setSelected(p.id)}>
                  <span className="vote-player-name">{p.name}</span>
                  {votedPlayers.has(p.id) && <span className="vote-voted-badge">VOTED</span>}
                </button>
              ))}
              <button className={selected === "noWerewolf" ? "vote-no-wolf--selected" : "vote-no-wolf"} onClick={() => setSelected("noWerewolf")}>
                <span className="vote-player-name">No Werewolf</span>
                <span className="vote-no-wolf-hint">All werewolves are on the ground</span>
              </button>
            </div>
            <button className="vote-btn" onClick={handleVote} disabled={!selected}>
              CONFIRM VOTE
            </button>
          </>
        ) : (
          <div className="vote-waiting">
            {selected ? (
              <p className="vote-voted-text">
                You voted for <strong className="vote-voted-strong">{selected === "noWerewolf" ? "No Werewolf" : players.find((p) => p.id === selected)?.name}</strong>
              </p>
            ) : (
              <p className="vote-voted-text">Your vote has been cast</p>
            )}
            <p className="vote-waiting-text">Waiting for other players...</p>
            <div className="vote-voter-list">
              {players.map((p) => (
                <div key={p.id} className="vote-voter-row">
                  <span className="vote-voter-name">{p.name}</span>
                  <span className={votedPlayers.has(p.id) || p.id === playerId ? "vote-done-tag" : "vote-pending-tag"}>{votedPlayers.has(p.id) || p.id === playerId ? "✓" : "..."}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Vote;
