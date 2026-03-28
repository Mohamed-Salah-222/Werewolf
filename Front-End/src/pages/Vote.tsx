import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket from "../socket";
import { API_URL } from "../config";
// import VoiceChat from "../components/VoiceChat";
import "./Vote.css";
import { useGameStore } from "../store/gameStore";

interface PlayerInfo {
  id: string;
  name: string;
}

type ViewState = "voting" | "sealing" | "waiting";

function Vote() {
  const { gameCode } = useParams();
  const navigate = useNavigate();

  const playerName = useGameStore((s) => s.playerName) || "Unknown";
  const playerId = useGameStore((s) => s.playerId) || "";
  const isHost = useGameStore((s) => s.isHost);
  const hasVotedStore = useGameStore((s) => s.hasVoted);
  const setPhase = useGameStore((s) => s.setPhase);
  const setResultsData = useGameStore((s) => s.setResultsData);
  const setHasVoted = useGameStore((s) => s.setHasVoted);

  const votedForId = useGameStore((s) => s.votedForId);
  const setVotedForId = useGameStore((s) => s.setVotedForId);

  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(votedForId);
  const [viewState, setViewState] = useState<ViewState>(hasVotedStore ? "waiting" : "voting");
  const [votedPlayers, setVotedPlayers] = useState<Set<string>>(new Set());

  // Force votes state
  const [showForceConfirm, setShowForceConfirm] = useState(false);
  const [forcing, setForcing] = useState(false);

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

    socket.on("gameEnded", (data: { winners: string; isDraw: boolean; eliminatedPlayerId: string | null; votes: Array<{ voter: string; vote: string }>; playerRoles: Array<{ playerId: string; name: string; role: string }>; actionHistory?: Array<{ role: string; playerName: string; description: string }> }) => {
      setResultsData({
        winners: data.winners,
        isDraw: data.isDraw,
        eliminatedPlayerId: data.eliminatedPlayerId,
        votes: data.votes,
        playerRoles: data.playerRoles,
        actionHistory: data.actionHistory || [],
      });
      setPhase("results");
      navigate(`/results/${gameCode}`);
    });

    return () => {
      socket.off("voteConfirmed");
      socket.off("gameEnded");
    };
  }, [gameCode, navigate, playerName, playerId, isHost]);

  const handleVote = () => {
    if (!selected || viewState !== "voting") return;

    setViewState("sealing");
    setHasVoted(true);
    setVotedForId(selected);
    socket.emit("vote", { gameCode, playerId, votedPlayerId: selected });

    setTimeout(() => {
      setViewState("waiting");
    }, 1200);
  };

  const handleForceVotes = useCallback(() => {
    if (forcing) return;
    setForcing(true);
    setShowForceConfirm(false);
    socket.emit("forceVotes", { gameCode, playerId }, (response?: { success: boolean; error?: string }) => {
      if (response && !response.success) {
        console.error("Force votes failed:", response.error);
        setForcing(false);
      }
      // On success, gameEnded event will fire and navigate us away
    });
  }, [forcing, gameCode, playerId]);

  const others = players.filter((p) => p.id !== playerId);
  const totalPlayers = players.length;
  const totalVoted = votedPlayers.size + (!votedPlayers.has(playerId) && (viewState === "waiting" || viewState === "sealing") ? 1 : 0);

  // Count how many haven't voted (for the force button label)
  const missingVotes = totalPlayers - totalVoted;

  const getVotedName = () => {
    if (selected === "noWerewolf") return "No Werewolf";
    return players.find((p) => p.id === selected)?.name || "Unknown";
  };

  return (
    <div className="vote-page">
      <div className="vote-vignette" />

      {/* Sealing overlay */}
      {viewState === "sealing" && (
        <div className="vote-seal-overlay">
          <div className="vote-seal-content">
            <span className="vote-seal-text">VOTE SEALED</span>
          </div>
        </div>
      )}

      <div className={`vote-content ${viewState === "sealing" ? "vote-content--fading" : ""}`}>
        <h1 className="vote-title">THE VOTE</h1>
        <p className="vote-subtitle">Who do you think is the Werewolf?</p>
        <p className="vote-count">
          {totalVoted} / {totalPlayers} voted
        </p>

        <div className="vote-voice">{/* <VoiceChat gameCode={gameCode || ""} playerId={playerId} /> */}</div>

        {/* ===== VOTING STATE ===== */}
        {viewState === "voting" && (
          <div className="vote-voting-view">
            <div className="vote-list">
              {others.map((p, i) => (
                <button key={p.id} className={selected === p.id ? "vote-item vote-item--selected" : "vote-item"} onClick={() => setSelected(p.id)} style={{ animationDelay: `${i * 0.05}s` }}>
                  <span className="vote-player-name">{p.name}</span>
                  {votedPlayers.has(p.id) && <span className="vote-voted-badge">VOTED</span>}
                </button>
              ))}
              <button className={selected === "noWerewolf" ? "vote-item vote-no-wolf vote-item--selected" : "vote-item vote-no-wolf"} onClick={() => setSelected("noWerewolf")} style={{ animationDelay: `${others.length * 0.05}s` }}>
                <span className="vote-player-name">No Werewolf</span>
                <span className="vote-no-wolf-hint">All werewolves are on the ground</span>
              </button>
            </div>
            <button className="vote-btn" onClick={handleVote} disabled={!selected}>
              CONFIRM VOTE
            </button>
          </div>
        )}

        {/* ===== WAITING STATE ===== */}
        {viewState === "waiting" && (
          <div className="vote-waiting-view">
            {/* Your vote summary */}
            <div className="vote-your-choice">
              <span className="vote-your-label">YOUR VERDICT</span>
              <span className="vote-your-target">{getVotedName()}</span>
            </div>

            {/* Divider */}
            <div className="vote-divider" />

            {/* Voter progress */}
            <p className="vote-waiting-hint">Waiting for other players</p>
            <div className="vote-progress-list">
              {players.map((p, i) => {
                const isSelf = p.id === playerId;
                const hasVoted = votedPlayers.has(p.id) || isSelf;

                return (
                  <div key={p.id} className={`vote-progress-item ${hasVoted ? "vote-progress-item--done" : ""}`} style={{ animationDelay: `${i * 0.06}s` }}>
                    <span className={`vote-progress-dot ${hasVoted ? "vote-progress-dot--done" : ""}`} />
                    <span className="vote-progress-name">{isSelf ? "You" : p.name}</span>
                    {hasVoted && <span className="vote-progress-check">✓</span>}
                  </div>
                );
              })}
            </div>

            {/* Force votes button — host only, only when someone hasn't voted */}
            {isHost && missingVotes > 0 && (
              <button className="vote-force-btn" onClick={() => setShowForceConfirm(true)} disabled={forcing}>
                {forcing ? "FORCING..." : `FORCE VOTES (${missingVotes} missing)`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ===== FORCE VOTES CONFIRMATION MODAL ===== */}
      {showForceConfirm && (
        <div className="vote-force-overlay" onClick={() => setShowForceConfirm(false)}>
          <div className="vote-force-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="vote-force-modal-title">FORCE VOTES</h3>
            <p className="vote-force-modal-text">
              <span className="vote-force-modal-count">{missingVotes}</span> player{missingVotes !== 1 ? "s" : ""} haven't voted yet. Their votes will be assigned randomly.
            </p>
            <div className="vote-force-modal-buttons">
              <button className="vote-force-modal-no" onClick={() => setShowForceConfirm(false)}>
                WAIT
              </button>
              <button className="vote-force-modal-yes" onClick={handleForceVotes}>
                FORCE IT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vote;
