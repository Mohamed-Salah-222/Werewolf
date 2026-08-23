import { useCallback, useEffect, useState } from "react";
import { SOCKET_EVENTS } from "@werewolf/shared";
import { getSocket, setLastGameCode } from "./socket";
import { useStore, loadSession, clearSession } from "./store";
import Lobby from "./pages/Lobby";
import RoleReveal from "./pages/RoleReveal";
import Night from "./pages/Night";
import Discussion from "./pages/Discussion";
import Vote from "./pages/Vote";
import EndGame from "./pages/EndGame";

export default function App() {
  const { snapshot, connected, error, setError } = useStore();
  const [hasSession] = useState(() => loadSession() !== null);
  useStoreSetErrorBridge(setError);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error, setError]);

  const emit = useCallback((event: string, payload: Record<string, unknown>) => {
    const s = getSocket();
    if (!s.connected) s.connect();
    (s.emit as (...args: unknown[]) => void)(event, payload);
  }, []);

  const leave = useCallback(() => {
    if (snapshot) {
      emit(SOCKET_EVENTS.CLIENT.LEAVE_GAME, { gameCode: snapshot.code, playerId: snapshot.yourPlayerId });
    }
    getSocket().disconnect();
    clearSession();
    setLastGameCode(null);
    window.location.reload();
  }, [snapshot, emit]);

  // no game yet → join screen
  if (!snapshot) {
    return (
      <>
        <JoinScreen canRejoin={hasSession} />
        <ErrorToast />
      </>
    );
  }

  const phase = snapshot.phase;
  const me = snapshot.players.find((p) => p.id === snapshot.yourPlayerId);

  return (
    <div className="app">
      <header className="topbar">
        <span className="room-code">غرفة {snapshot.code}</span>
        <span className={`conn ${connected ? "on" : "off"}`}>{connected ? "متصل" : "غير متصل"}</span>
        <button className="link danger" onClick={leave}>خروج</button>
      </header>

      {phase === "waiting" && <Lobby snapshot={snapshot} emit={emit} />}
      {phase === "role" && <RoleReveal snapshot={snapshot} emit={emit} />}
      {phase === "night" && <Night snapshot={snapshot} emit={emit} />}
      {phase === "discussion" && <Discussion snapshot={snapshot} emit={emit} />}
      {phase === "vote" && <Vote snapshot={snapshot} emit={emit} />}
      {phase === "endGame" && <EndGame snapshot={snapshot} />}

      {me && !me.isConnected && (
        <div className="banner">انقطع الاتصال — جاري إعادة الاتصال…</div>
      )}
      <ErrorToast />
    </div>
  );
}

function ErrorToast() {
  const { error } = useStore();
  if (!error) return null;
  return <div className="toast">{error}</div>;
}

function JoinScreen({ canRejoin }: { canRejoin: boolean }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"join" | "create" | null>(null);

  const doJoin = async () => {
    if (!code.trim()) return;
    setBusy("join");
    try {
      const { connectAndJoin } = await import("./socket");
      await connectAndJoin({ gameCode: code.trim(), playerName: name.trim() });
    } catch (e) {
      useStoreSetError((e as Error).message);
    }
    setBusy(null);
  };

  const doCreate = async () => {
    setBusy("create");
    try {
      const res = await fetch(
        `${(import.meta.env.VITE_BACKEND_URL as string) || `${location.protocol}//${location.hostname}:3000`}/api/games/create`,
        { method: "POST" },
      );
      const json = await res.json();
      if (json?.data?.code) setCode(json.data.code.toUpperCase());
      else throw new Error(json?.error ?? "تعذر إنشاء الغرفة");
    } catch (e) {
      useStoreSetError((e as Error).message);
    }
    setBusy(null);
  };

  const doRejoin = async () => {
    const s = loadSession();
    if (!s) return;
    setBusy("join");
    try {
      const { connectAndJoin } = await import("./socket");
      await connectAndJoin(s);
    } catch {
      useStoreSetError("تعذر استعادة الجلسة، ادخل من جديد");
      clearSession();
    }
    setBusy(null);
  };

  return (
    <main className="center-screen">
      <h1 className="title">🐺 الوحش</h1>
      <p className="subtitle">وحش ليلة واحدة</p>

      <label className="field">
        <span>اسمك</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="اسم اللاعب" />
      </label>
      <label className="field">
        <span>كود الغرفة</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="ABC123"
          className="code-input"
          autoCapitalize="characters"
        />
      </label>

      <button className="btn primary" disabled={busy !== null || code.length !== 6} onClick={doJoin}>
        {busy === "join" ? "…" : "ادخل"}
      </button>
      <div className="row">
        <button className="btn ghost" disabled={busy !== null} onClick={doCreate}>أنشئ غرفة جديدة</button>
        {canRejoin && (
          <button className="btn ghost" disabled={busy !== null} onClick={doRejoin}>استعادة الجلسة</button>
        )}
      </div>
    </main>
  );
}

// small escape hatch to set store error outside provider tree
let _setError: ((m: string | null) => void) | null = null;
export function useStoreSetErrorBridge(setter: (m: string | null) => void): void {
  _setError = setter;
}
function useStoreSetError(msg: string): void {
  _setError?.(msg);
}
