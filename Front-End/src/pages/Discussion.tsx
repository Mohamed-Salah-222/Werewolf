import { SOCKET_EVENTS } from "@werewolf/shared";
import { PageProps } from "./types";

function useRemaining(startedAt: number | null, seconds: number | null): number {
  const [, tick] = useTicker();
  if (!startedAt || !seconds) return 0;
  const left = Math.max(0, seconds - Math.floor((Date.now() - startedAt) / 1000));
  void tick;
  return left;
}

import { useEffect, useState as _s } from "react";
function useTicker(): [number, () => void] {
  const [n, setN] = _s(0);
  useEffect(() => {
    const i = setInterval(() => setN((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, []);
  return [n, () => {}];
}

export default function Discussion({ snapshot, emit }: PageProps) {
  const left = useRemaining(snapshot.timer.startedAt, snapshot.timer.currentTimerSec);
  const isHost = snapshot.hostId === snapshot.yourPlayerId;
  const mins = Math.floor(left / 60);
  const secs = String(left % 60).padStart(2, "0");

  return (
    <main className="page center-screen">
      <h2>💬 النقاش</h2>
      <p className="timer huge">{left > 0 ? `${mins}:${secs}` : "انتهى الوقت"}</p>
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
