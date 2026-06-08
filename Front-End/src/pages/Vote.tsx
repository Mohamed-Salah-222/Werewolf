import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
// import VoiceChat from "../components/VoiceChat";
import "./Vote.css";
import { useGameStore } from "../store/gameStore";
import { gameActions } from "../store/sockets";

type ViewState = "voting" | "sealing" | "waiting";

function Vote() {
  const { gameCode } = useParams();
  const navigate = useNavigate();

  const playerName = useGameStore((s) => s.playerName) || "Unknown";
  const playerId = useGameStore((s) => s.playerId) || "";
  const isHost = useGameStore((s) => s.isHost);
  const storePlayers = useGameStore((s) => s.players);
  const hasVotedStore = useGameStore((s) => s.hasVoted);
  const setHasVoted = useGameStore((s) => s.setHasVoted);

  const votedForId = useGameStore((s) => s.votedForId);
  const setVotedForId = useGameStore((s) => s.setVotedForId);

  const [selected, setSelected] = useState<string | null>(votedForId);
  const [viewState, setViewState] = useState<ViewState>(hasVotedStore ? "waiting" : "voting");
  // Derived from store snapshot (stays in sync with server)
  const votedPlayers = new Set(storePlayers.filter(p => p.hasVoted).map(p => p.id));

  // Force votes state
  const [showForceConfirm, setShowForceConfirm] = useState(false);
  const [forcing, setForcing] = useState(false);

  const handleVote = () => {
    if (!selected || viewState !== "voting") return;

    setViewState("sealing");
    setHasVoted(true);
    setVotedForId(selected);
    gameActions.vote({ gameCode: gameCode!, playerId, votedPlayerId: selected });

    setTimeout(() => {
      setViewState("waiting");
    }, 1200);
  };

  const handleForceVotes = useCallback(() => {
    if (forcing) return;
    setForcing(true);
    setShowForceConfirm(false);
    gameActions.forceVotes({ gameCode: gameCode!, playerId });
    setTimeout(() => setForcing(false), 3000);
  }, [forcing, gameCode, playerId]);

  const others = storePlayers.filter((p) => p.id !== playerId);
  const totalPlayers = storePlayers.length;
  const totalVoted = votedPlayers.size + (!votedPlayers.has(playerId) && (viewState === "waiting" || viewState === "sealing") ? 1 : 0);

  // Count how many haven't voted (for the force button label)
  const missingVotes = totalPlayers - totalVoted;

  const getVotedName = () => {
    if (selected === "noWerewolf") return "No Werewolf";
    return storePlayers.find((p) => p.id === selected)?.name || "Unknown";
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
              {storePlayers.map((p, i) => {
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

      {/* Leave button */}
      <button
        className="rr-leave-btn"
        onClick={() => {
          gameActions.leaveGame({ gameCode: gameCode!, playerId });
          useGameStore.getState().reset();
          navigate("/");
        }}
      >
        LEAVE
      </button>
    </div>
  );
}

export default Vote;
