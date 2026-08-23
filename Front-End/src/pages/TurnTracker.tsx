import { ROLE_REGISTRY } from "@werewolf/shared";
import { roleIdOf } from "./roleId";
import { RoleIcon } from "./Art";
import { formatTime, useCountdown } from "./Timers";

type QueueEntry = { roleName: string; seconds: number };

/** Night turn tracker: glowing "now" card + ordered row of waiting role cards. */
export default function TurnTracker({
  queue,
  activeIndex,
  activeRoleName,
  activeStartedAt,
}: {
  queue: QueueEntry[];
  activeIndex: number | null;
  activeRoleName: string | null;
  activeStartedAt: number | null;
}) {
  const idx = activeIndex ?? -1;
  const activeEntry = activeIndex != null ? queue[activeIndex] : undefined;
  const endsAt =
    activeEntry && activeStartedAt ? activeStartedAt + activeEntry.seconds * 1000 : null;
  const left = useCountdown(endsAt);

  return (
    <div className="tracker">
      <div className={`now-card ${activeRoleName ? "" : "is-dark"}`}>
        <span className="now-label">{activeRoleName ? "الآن" : "…"}</span>
        {activeRoleName ? (
          <>
            <RoleIcon roleId={roleIdOf(activeRoleName)} size={46} />
            <div className="now-text">
              <h3>{activeRoleName}</h3>
              <p className="hint">{ROLE_REGISTRY[roleIdOf(activeRoleName)]?.description}</p>
            </div>
            {left > 0 && <span className="now-timer">{formatTime(left)}</span>}
          </>
        ) : (
          <div className="now-text">
            <h3>الليل يجهّز…</h3>
            <p className="hint">استنى إشارة دورك</p>
          </div>
        )}
      </div>

      <div className="queue-cards" aria-label="ترتيب الأدوار في الليل">
        {queue.map((e, i) => {
          const state = i < idx ? "done" : i === idx ? "now" : "next";
          return (
            <span key={`${i}-${e.roleName}`} className={`q-card ${state}`} title={e.roleName}>
              <RoleIcon roleId={roleIdOf(e.roleName)} size={20} />
              <em>{e.roleName}</em>
              {state === "done" && <b className="q-tick">✓</b>}
            </span>
          );
        })}
      </div>
    </div>
  );
}
