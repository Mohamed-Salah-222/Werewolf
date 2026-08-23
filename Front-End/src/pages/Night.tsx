import { useEffect, useMemo, useState } from "react";
import { SOCKET_EVENTS } from "@werewolf/shared";
import type { PageProps } from "./types";
import { roleIdOf } from "./roleId";

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

  const myRoleId = priv?.currentRole ? roleIdOf(priv.currentRole) : "";
  const isClone = myRoleId === "clone";
  const isSeer = myRoleId === "seer";

  // Clone stage 1 copies a player; after that the backend drives follow-up actions
  const t: Targeting = isClone
    ? { kind: "players", need: 1, build: ([id]) => ({ type: "clone", targetPlayer: { id } }) }
    : targetingFor(myRoleId);

  const activeRoleName = snapshot.currentActiveRole ?? null;
  const isMyTurn = activeRoleName !== null && roleIdOf(activeRoleName) === myRoleId;

  useEffect(() => {
    setPlayerPicks([]);
    setGroundPicks([]);
    setMode("player");
  }, [snapshot.currentActiveRole]);

  const others = useMemo(
    () => snapshot.players.filter((p) => p.id !== snapshot.yourPlayerId),
    [snapshot],
  );

  if (!isMyTurn) {
    return (
      <main className="page center-screen">
        <h2>🌙 الليل</h2>
        <p className="hint">دور <b>{activeRoleName ?? "…"}</b> الآن</p>
        {snapshot.nightTimeRemaining > 0 && <p className="timer">{snapshot.nightTimeRemaining} ثانية</p>}
        <div className="queue">
          {snapshot.roleQueue.map((r) => (
            <span key={r.roleName} className={`chip ${activeRoleName === r.roleName ? "active" : ""}`}>
              {r.roleName}
            </span>
          ))}
        </div>
        {(priv?.hasPerformedAction || priv?.lastActionResult) && <p className="hint ok">✅ نفذت حركتك — استنى دورك الجاي</p>}
      </main>
    );
  }

  const picks = mode === "ground" ? groundPicks : playerPicks;
  const need = t.kind === "none" ? 0 : t.need;

  const togglePlayer = (id: string) => {
    if (t.kind !== "players") return;
    setMode("player");
    setPlayerPicks((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev.slice(-(t.need - 1)), id],
    );
  };

  const toggleGround = (id: string) => {
    setMode("ground");
    setGroundPicks((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev.slice(-(need - 1)), id],
    );
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
      action = { type: myRoleId };
    } else {
      action = t.build(picks);
    }
    emit(SOCKET_EVENTS.CLIENT.PERFORM_ACTION, { ...base, action });
    setPlayerPicks([]);
    setGroundPicks([]);
    setMode("player");
  };

  const resultMsg = (priv?.lastActionResult as Record<string, unknown> | null)?.message as string | undefined;

  return (
    <main className="page">
      <header className="night-head">
        <h2>🌙 دورك — {priv?.currentRole}</h2>
        {snapshot.nightTimeRemaining > 0 && <p className="timer">{snapshot.nightTimeRemaining} ثانية</p>}
      </header>

      {resultMsg && <section className="card result">{resultMsg}</section>}
      {!resultMsg && priv?.roleDescription && <p className="hint">{priv.roleDescription}</p>}

      {t.kind === "none" ? (
        <button className="btn primary big mt" onClick={submit}>
          {isClone ? "اختار لاعب تشبهه" : "نفّذ الحركة"}
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
    </main>
  );
}
