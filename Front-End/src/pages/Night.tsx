import { useEffect, useMemo, useRef, useState } from "react";
import { SOCKET_EVENTS } from "@werewolf/shared";
import type { PageProps } from "./types";
import { roleIdOf } from "./roleId";
import { RoleIcon, Spinner } from "./Art";
import HelpTip from "./HelpTip";
import MyRoleBadge from "./MyRoleBadge";
import TurnTracker from "./TurnTracker";
import { TimerRing } from "./Timers";
import { sfx } from "../sfx";

type Targeting =
  | { kind: "none" }
  | { kind: "players"; need: 1 | 2; build: (ids: string[]) => Record<string, unknown> }
  | { kind: "ground"; need: 1 | 2; build: (ids: string[]) => Record<string, unknown> };

function targetingFor(roleId: string): Targeting {
  switch (roleId) {
    case "werewolf":
    case "minion":
    case "mason":
    case "insomniac":
    case "oracle":
      return { kind: "none" };
    case "robber":
    case "warlock":
      return {
        kind: "players",
        need: 1,
        build: ([id]) => ({ type: roleId, targetPlayer: { id } }),
      };
    case "troublemaker":
      return {
        kind: "players",
        need: 2,
        build: ([a, b]) => ({ type: roleId, player1: { id: a }, player2: { id: b } }),
      };
    case "seer":
      // two modes, handled specially below
      return { kind: "players", need: 1, build: ([id]) => ({ type: "seer_player_role", targetPlayer: { id } }) };
    case "drunk":
    case "joker":
      return { kind: "ground", need: 1, build: ([id]) => ({ type: roleId, targetRoleId: id }) };
    default:
      // clone and anything unknown: pick a player; clone handler overrides action type
      return {
        kind: "players",
        need: 1,
        build: ([id]) => ({ type: roleId === "clone" ? "clone" : roleId, targetPlayer: { id } }),
      };
  }
}

export default function Night({ snapshot, emit }: PageProps) {
  const priv = snapshot.playerPrivateData;
  const [playerPicks, setPlayerPicks] = useState<string[]>([]);
  const [groundPicks, setGroundPicks] = useState<string[]>([]);
  const [mode, setMode] = useState<"player" | "ground">("player");
  const [resultHidden, setResultHidden] = useState(false);
  const prevNightSecs = useRef<number | null>(null);

  const resultMsg = (priv?.lastActionResult as Record<string, unknown> | null)?.message as string | undefined;

  // a fresh action result always un-hides the card
  useEffect(() => {
    setResultHidden(false);
  }, [resultMsg]);

  const myRoleId = priv?.currentRole ? roleIdOf(priv.currentRole) : "";
  // The backend wakes players and performs actions by ORIGINAL role —
  // currentRole is display-only (robber/drunk/warlock/clone swaps change it).
  const originalRoleId = priv?.originalRole ? roleIdOf(priv.originalRole) : "";

  // Clone phase 2: after cloning, the result carries the cloned role —
  // the follow-up menu is that role's own targeting (see main-branch reference).
  const cloneResult =
    originalRoleId === "clone"
      ? (priv?.lastActionResult as
          | {
              clonedRole?: string;
              needsSecondAction?: boolean;
            }
          | null
          | undefined)
      : null;
  const cloneFollowUpRole =
    originalRoleId === "clone" &&
    cloneResult?.needsSecondAction &&
    cloneResult.clonedRole
      ? roleIdOf(cloneResult.clonedRole)
      : null;

  // The role you are actually acting as this night:
  // clone stage 2 -> cloned role; clone stage 1 -> clone; everyone else -> original role.
  const actingRoleId = cloneFollowUpRole ?? (originalRoleId === "clone" ? "clone" : originalRoleId);
  const isSeer = actingRoleId === "seer";

  const t: Targeting = targetingFor(actingRoleId);

  const activeRoleName = snapshot.currentActiveRole ?? null;
  const isMyTurn =
    activeRoleName !== null &&
    // the clone slot stays "clone" through both stages; other slots wake by original role
    (roleIdOf(activeRoleName) === actingRoleId ||
      (originalRoleId === "clone" && roleIdOf(activeRoleName) === "clone"));
  const isMyTurnRef = useRef(false);

  useEffect(() => {
    setPlayerPicks([]);
    setGroundPicks([]);
    setMode("player");
  }, [snapshot.currentActiveRole]);

  // bell when it becomes your turn
  useEffect(() => {
    if (isMyTurn && !isMyTurnRef.current) sfx.play("turn");
    isMyTurnRef.current = isMyTurn;
  }, [isMyTurn]);

  // urgent ticks in the final seconds of the night
  useEffect(() => {
    const prev = prevNightSecs.current;
    prevNightSecs.current = snapshot.nightTimeRemaining;
    if (
      prev != null &&
      snapshot.nightTimeRemaining > 0 &&
      snapshot.nightTimeRemaining <= 5 &&
      snapshot.nightTimeRemaining < prev
    ) {
      sfx.play("tick");
    }
  }, [snapshot.nightTimeRemaining]);

  const others = useMemo(
    () => snapshot.players.filter((p) => p.id !== snapshot.yourPlayerId),
    [snapshot],
  );

  const tracker = (
    <TurnTracker
      queue={snapshot.roleQueue}
      activeIndex={snapshot.currentActiveRoleIndex}
      activeRoleName={activeRoleName}
      activeStartedAt={snapshot.currentActiveRoleStartedAt}
    />
  );

  // persistent, dismissible record of what your night action did
  const resultCard = resultMsg ? (
    resultHidden ? (
      <button className="result-restore" onClick={() => { sfx.play("click"); setResultHidden(false); }}>
        👁 اللي عملته
      </button>
    ) : (
      <section className="card result with-close">
        <button className="result-close" onClick={() => { sfx.play("click"); setResultHidden(true); }} aria-label="إخفاء">✕</button>
        <div className="result-body">
          <RoleIcon roleId={actingRoleId} size={22} />
          <span>{resultMsg}</span>
        </div>
      </section>
    )
  ) : null;

  if (!isMyTurn) {
    return (
      <main className="page center-screen">
        <HelpTip phase="night" />
        <h2>🌙 الليل</h2>
        <MyRoleBadge currentRole={priv?.currentRole} />
        {snapshot.nightTimeRemaining > 0 && (
          <TimerRing seconds={snapshot.nightTimeRemaining} total={Math.max(...snapshot.roleQueue.map((r) => r.seconds), snapshot.nightTimeRemaining)} />
        )}
        {!priv?.hasPerformedAction && !priv?.lastActionResult && activeRoleName === null && (
          <Spinner label="الليل يبدأ…" />
        )}
        {priv?.hasPerformedAction && <p className="hint ok">✅ نفذت حركتك — استنى دورك الجاي</p>}
        {resultCard}
        {tracker}
      </main>
    );
  }

  const picks = mode === "ground" ? groundPicks : playerPicks;
  const need = t.kind === "none" ? 0 : t.need;
  const alreadyActed = !!priv?.hasPerformedAction;

  const togglePlayer = (id: string) => {
    if (t.kind !== "players") return;
    setMode("player");
    setPlayerPicks((prev) => {
      if (prev.includes(id)) {
        sfx.play("deselect");
        return prev.filter((x) => x !== id);
      }
      sfx.play("select");
      return [...prev.slice(-(t.need - 1)), id];
    });
  };

  const toggleGround = (id: string) => {
    setMode("ground");
    setGroundPicks((prev) => {
      if (prev.includes(id)) {
        sfx.play("deselect");
        return prev.filter((x) => x !== id);
      }
      sfx.play("select");
      return [...prev.slice(-(need - 1)), id];
    });
  };

  const submit = () => {
    const base = { gameCode: snapshot.code, playerId: snapshot.yourPlayerId };
    let action: Record<string, unknown>;
    if (isSeer && mode === "ground" && groundPicks.length === 2) {
      action = {
        type: "seer_ground_roles",
        groundRole1: { id: groundPicks[0] },
        groundRole2: { id: groundPicks[1] },
      };
    } else if (t.kind === "none") {
      action = { type: actingRoleId };
    } else {
      action = t.build(picks);
    }
    sfx.play("confirm");
    emit(SOCKET_EVENTS.CLIENT.PERFORM_ACTION, { ...base, action });
    setPlayerPicks([]);
    setGroundPicks([]);
    setMode("player");
  };

  return (
    <main className="page">
      <HelpTip phase="night" />
      <header className="night-head">
        <h2 className="with-art">
          <RoleIcon roleId={actingRoleId} size={34} /> دورك — {priv?.currentRole}
          {cloneFollowUpRole && (
            <span className="clone-followup-tag">
              ← بقيت {cloneResult?.clonedRole}
            </span>
          )}
        </h2>
        {snapshot.nightTimeRemaining > 0 && (
          <TimerRing seconds={snapshot.nightTimeRemaining} total={Math.max(...snapshot.roleQueue.map((r) => r.seconds), snapshot.nightTimeRemaining)} size={72} />
        )}
      </header>

      {alreadyActed ? (
        <>
          <p className="hint ok">✅ نفذت حركتك — استنى الباقين اللي معاك</p>
          {resultCard}
        </>
      ) : (
        <>
          {resultMsg && resultCard}
          {!resultMsg && priv?.roleDescription && <p className="hint">{priv.roleDescription}</p>}

          {t.kind === "none" ? (
            <button className="btn primary big mt" onClick={submit}>
              {actingRoleId === "clone" ? "اختار لاعب تشبهه" : "نفّذ الحركة"}
            </button>
          ) : (
            <>
              <h3>{mode === "ground" ? "كروت الأرض" : `اختار هدف${need > 1 ? "ين" : ""}`}</h3>
              <ul className="player-list selectable">
                {others.map((p) => (
                  <li
                    key={p.id}
                    className={playerPicks.includes(p.id) ? "selected" : ""}
                    onClick={() => togglePlayer(p.id)}
                  >
                    <span>{p.name}</span>
                    {!p.isConnected && <em className="badge off">غير متصل</em>}
                  </li>
                ))}
              </ul>

              {(t.kind === "ground" || isSeer) && (
                <>
                  <h3 className="mt">{isSeer ? "أو بص على كارتين من الأرض" : "أو اختار كارت من الأرض"}</h3>
                  <div className="row">
                    {snapshot.groundCards.map((c, i) => (
                      <button
                        key={c.id}
                        className={`btn ghost ${groundPicks.includes(c.id) ? "picked" : ""}`}
                        onClick={() => toggleGround(c.id)}
                      >
                        كارت {i + 1}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <button
                className="btn primary big mt"
                disabled={picks.length < (isSeer && mode === "ground" ? 2 : need)}
                onClick={submit}
              >
                نفّذ الحركة
              </button>
            </>
          )}
        </>
      )}

      <div className="mt tracker-foot">{tracker}</div>
    </main>
  );
}
