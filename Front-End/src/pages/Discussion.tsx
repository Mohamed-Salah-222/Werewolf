import { SOCKET_EVENTS } from "@werewolf/shared";
import type { PageProps } from "./types";
import { useCountdown, TimerRing } from "./Timers";
import HelpTip from "./HelpTip";
import MyRoleBadge from "./MyRoleBadge";
import { RoleIcon } from "./Art";
import { roleIdOf } from "./roleId";

export default function Discussion({ snapshot, emit }: PageProps) {
  const left = useCountdown(snapshot.timer.startedAt != null && snapshot.timer.currentTimerSec != null
    ? snapshot.timer.startedAt + snapshot.timer.currentTimerSec * 1000
    : null);
  const isHost = snapshot.hostId === snapshot.yourPlayerId;
  const alive = snapshot.players.filter((p) => p.isConnected).length;
  const recap = snapshot.actionHistory ?? [];

  return (
    <main className="page center-screen">
      <HelpTip phase="discussion" />
      <h2>💬 النقاش</h2>
      <MyRoleBadge currentRole={snapshot.playerPrivateData?.currentRole} />
      <TimerRing seconds={left} total={snapshot.timer.currentTimerSec ?? 0} size={130} />
      <p className="hint">{alive} لاعب متصل — اسأل، اتهم، دافع عن نفسك</p>

      {recap.length > 0 && (
        <section className="card night-recap">
          <h3>🌙 اللي عملته الليلة</h3>
          <ul className="recap-list">
            {recap.map((a, i) => (
              <li key={i}>
                <span className="recap-role">
                  <RoleIcon roleId={roleIdOf(a.role)} size={20} />
                  <b>{a.role}</b>
                </span>
                <span className="recap-player">{a.playerName}</span>
                <span className="recap-desc">{a.description}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul className="player-list compact">
        {snapshot.players.map((p) => (
          <li key={p.id} className={p.id === snapshot.yourPlayerId ? "me" : p.isConnected ? "" : "dim"}>
            <span>{p.name}</span>
            {!p.isConnected && <em className="badge off">غير متصل</em>}
          </li>
        ))}
      </ul>
      {isHost && (
        <button
          className="btn primary mt"
          onClick={() => emit(SOCKET_EVENTS.CLIENT.SKIP_TO_VOTE, { gameCode: snapshot.code, playerId: snapshot.yourPlayerId })}
        >
          ابدأوا التصويت دلوقتي
        </button>
      )}
    </main>
  );
}
