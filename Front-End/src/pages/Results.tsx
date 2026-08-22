import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGameStore } from "../store/gameStore";
import { gameActions } from "../store/sockets";
import { findCharacter } from "../characters";

/** Resolve any role identifier to its stable id */
function roleIdOf(name: string): string {
  return findCharacter(name)?.id ?? name.toLowerCase();
}

// import VoiceChat from "../components/VoiceChat";
import "./Results.css";

function getTeam(role: string): string {
  const rid = roleIdOf(role);
  if (rid === "werewolf" || rid === "minion") return "werewolves";
  if (rid === "joker") return "joker";
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

  const navigate = useNavigate();

  const playerId = useGameStore((s) => s.playerId) || "";
  const isHost = useGameStore((s) => s.isHost);
  const winners = useGameStore((s) => s.winners) || "";
  const isDraw = useGameStore((s) => s.isDraw);
  const eliminatedPlayerId = useGameStore((s) => s.eliminatedPlayerId);
  const votes = useGameStore((s) => s.votes);
  const playerRoles = useGameStore((s) => s.playerRoles);
  const actionHistory = useGameStore((s) => s.actionHistory);
  const reset = useGameStore((s) => s.reset);

  const [showVotes, setShowVotes] = useState(false);
  const [showSequence, setShowSequence] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const handleRestart = () => {
    setRestarting(true);
    gameActions.restartGame({ gameCode: gameCode!, playerId });
  };

  const isNoWerewolfVote = !isDraw && !eliminatedPlayerId;
  const mostVotedPlayer = eliminatedPlayerId ? playerRoles.find((p) => p.playerId === eliminatedPlayerId) : null;
  const myRole = playerRoles.find((p) => p.playerId === playerId);

  const didIWin = () => {
    if (!myRole) return false;
    const myTeam = getTeam(myRole.role);
    if (winners === "joker" && roleIdOf(myRole.role) === "joker") return true;
    if (winners === "werewolves" && myTeam === "werewolves") return true;
    if (winners === "villagers" && myTeam === "villagers") return true;
    return false;
  };

  const winnerLabel = () => {
    switch (winners) {
      case "werewolves":
        return "العفاريت كسبت الليلة!";
      case "villagers":
        return "القرية كسبت!";
      case "joker":
        return "الجوكر ضحك عليهم!";
      default:
        return winners;
    }
  };

  const winnerStory = () => {
    switch (winners) {
      case "werewolves":
        return "الليل خلص والعفاريت شبعت… والقرية فاضل منها حكاية بتتحكي على القهوة.";
      case "villagers":
        return "الفجر طلع وأهل البلد عرفوا مين المستخبي… النهار ليهم من يومها.";
      case "joker":
        return "صوتوا عليه بدمبردوبة وهو الضحكة الأخيرة… ده كان هدفه من الأول.";
      default:
        return "";
    }
  };

  const getPlayerName = (id: string) => {
    if (id === "noWerewolf") return "مفيش عفريت";
    const p = playerRoles.find((pr) => pr.playerId === id);
    return p?.name || id;
  };

  return (
    <div className="res-page">
      <div className="res-vignette" />
      <div className="res-content">
        {/* Winner banner */}
        <div className="res-banner">
          <h1 className={`res-winner-text ${getWinnerColorClass(winners)}`}>{winnerLabel()}</h1>
          <p className="res-personal-result">{didIWin() ? "انت من الفايزين!" : "مش نصيبك الليلة دي"}</p>
          <p className="res-story">{winnerStory()}</p>
        </div>

        {/* Eliminated / Draw / No Werewolf */}
        {isDraw ? (
          <div className="res-eliminated">
            <p className="res-eliminated-label">نتيجة التصويت</p>
            <p className="res-eliminated-name">تعادل</p>
            <p className="res-eliminated-role res-color--neutral">محدش اتحكم فيه</p>
          </div>
        ) : isNoWerewolfVote ? (
          <div className="res-eliminated">
            <p className="res-eliminated-label">قرار القرية</p>
            <p className="res-eliminated-name">مفيش عفريت</p>
            <p className="res-eliminated-role res-color--neutral">القرية مقتنعة إن كل العفاريت على الأرض خلاص</p>
          </div>
        ) : (
          mostVotedPlayer && (
            <div className="res-eliminated">
              <p className="res-eliminated-label">اللي اتشال</p>
              <p className="res-eliminated-name">{mostVotedPlayer.name}</p>
              <p className={`res-eliminated-role ${getColorClass(mostVotedPlayer.role)}`}>{findCharacter(mostVotedPlayer.role)?.name || mostVotedPlayer.role}</p>
            </div>
          )
        )}

        {/* All roles */}
        <div className="res-section">
          <div className="res-role-list">
            {playerRoles.map((p) => (
              <div key={p.playerId} className="res-role-row">
                <span className="res-role-name">{p.name}</span>
                <span className={`res-role-value ${getColorClass(p.role)}`}>{findCharacter(p.role)?.name || p.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Game sequence */}
        {actionHistory.length > 0 && (
          <div className="res-section">
            <button className="res-toggle-btn" onClick={() => setShowSequence(!showSequence)}>
              <span>{showSequence ? "اخفي" : "ورّيني"} تسلسل الليل</span>
              <span className="res-toggle-arrow">{showSequence ? "▲" : "▼"}</span>
            </button>
            {showSequence && (
              <div className="res-sequence-list">
                {actionHistory.map((item, i) => (
                  <div key={i} className="res-sequence-row" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="res-sequence-marker">
                      <span className="res-sequence-dot" />
                      {i < actionHistory.length - 1 && <span className="res-sequence-line" />}
                    </div>
                    <div className="res-sequence-body">
                      <div className="res-sequence-header">
                        <span className={`res-sequence-role ${getColorClass(item.role)}`}>{findCharacter(item.role)?.name || item.role}</span>
                        <span className="res-sequence-separator">—</span>
                        <span className="res-sequence-player">{item.playerName}</span>
                      </div>
                      <p className="res-sequence-desc">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Vote breakdown */}
        <div className="res-section">
          <button className="res-toggle-btn" onClick={() => setShowVotes(!showVotes)}>
            <span>{showVotes ? "اخفي" : "ورّيني"} تفاصيل التصويت</span>
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
              {restarting ? "بنعيد…" : "العب تاني"}
            </button>
          )}
          <button
            className="res-home-btn"
            onClick={() => {
              gameActions.leaveGame({ gameCode: gameCode!, playerId });
              reset();
              navigate("/");
            }}
          >
            ارجع للبيت
          </button>
        </div>
      </div>
    </div>
  );
}

export default Results;
