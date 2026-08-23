import { SOCKET_EVENTS } from "@werewolf/shared";
import type { PageProps } from "./types";

export default function Vote({ snapshot, emit }: PageProps) {
  const priv = snapshot.playerPrivateData;
  const others = snapshot.players.filter((p) => p.id !== snapshot.yourPlayerId);

  return (
    <main className="page center-screen">
      <h2>🗳️ التصويت</h2>
      {priv?.hasVoted && (
        <p className="hint ok">صوّتت — في انتظار الباقي ({snapshot.players.filter((p) => p.hasVoted).length}/{snapshot.players.length})</p>
      )}
      {!priv?.hasVoted && (
        <>
          <p className="hint">مين الوحش؟</p>
          <ul className="player-list selectable">
            {others.map((p) => (
              <li
                key={p.id}
                onClick={() =>
                  emit(SOCKET_EVENTS.CLIENT.VOTE, {
                    gameCode: snapshot.code,
                    playerId: snapshot.yourPlayerId,
                    votedPlayerId: p.id,
                  })
                }
              >
                <span>{p.name}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
