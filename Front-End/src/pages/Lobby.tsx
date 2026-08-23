import { useState } from "react";
import { SOCKET_EVENTS, MIN_PLAYERS } from "@werewolf/shared";
import type { PageProps } from "./types";
import ShareButton from "./ShareButton";
import HelpTip from "./HelpTip";
import HowToPlay from "./HowToPlay";
import { sfx } from "../sfx";

export default function Lobby({ snapshot, emit }: PageProps) {
  const isHost = snapshot.hostId === snapshot.yourPlayerId;
  const count = snapshot.players.length;
  const allReady = snapshot.players.every((p) => p.isReady);
  const me = snapshot.players.find((p) => p.id === snapshot.yourPlayerId);
  const [showHowTo, setShowHowTo] = useState(false);

  return (
    <main className="page">
      <HelpTip phase="lobby" />
      <section className="card">
        <h2>غرفة اللعب</h2>
        <p className="hint">شارك الكود مع أصحابك: <b className="code-big">{snapshot.code}</b></p>
        <p className="hint">{count} لاعب — يلزم {MIN_PLAYERS} على الأقل</p>
        <div className="row">
          <ShareButton gameCode={snapshot.code} />
          <button className="htp-btn" onClick={() => { sfx.play("click"); setShowHowTo(true); }}>؟ إزاي تلعب</button>
        </div>
      </section>

      <ul className="player-list">
        {snapshot.players.map((p) => (
          <li key={p.id} className={p.id === snapshot.yourPlayerId ? "me" : ""}>
            <span>{p.name}{p.id === snapshot.yourPlayerId ? " (أنت)" : ""}</span>
            <span className="badges">
              {p.isHost && <em className="badge host">👑 مضيف</em>}
              {p.isReady && <em className="badge ready">جاهز</em>}
              {isHost && !p.isHost && (
                <>
                  <button
                    className="link"
                    title="تعيين كمضيف"
                    onClick={() => {
                      sfx.play("click");
                      emit(SOCKET_EVENTS.CLIENT.ASSIGN_HOST, {
                        gameCode: snapshot.code,
                        playerId: snapshot.yourPlayerId,
                        newHostId: p.id,
                      });
                    }}
                  >
                    👑
                  </button>
                  <button
                    className="link danger"
                    onClick={() => {
                      sfx.play("error");
                      emit(SOCKET_EVENTS.CLIENT.KICK_PLAYER, {
                        gameCode: snapshot.code,
                        hostId: snapshot.hostId,
                        kickedPlayerId: p.id,
                      });
                    }}
                  >
                    طرد
                  </button>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="row">
        <button
          className={`btn ${me?.isReady ? "ghost" : "primary"}`}
          onClick={() => {
            sfx.play(me?.isReady ? "deselect" : "select");
            emit(SOCKET_EVENTS.CLIENT.PLAYER_READY, {
              gameCode: snapshot.code,
              playerId: snapshot.yourPlayerId,
              ready: !me?.isReady,
            });
          }}
        >
          {me?.isReady ? "إلغاء الجاهزية" : "أنا جاهز"}
        </button>
        {isHost && (
          <>
            <button
              className="btn primary"
              disabled={!allReady || count < MIN_PLAYERS}
              onClick={() => {
                sfx.play("confirm");
                emit(SOCKET_EVENTS.CLIENT.START_GAME, { gameCode: snapshot.code, playerId: snapshot.yourPlayerId });
              }}
            >
              ابدأ اللعبة
            </button>
            {!allReady && <span className="hint">في انتظار جاهزية الجميع</span>}
            {allReady && count < MIN_PLAYERS && (
              <span className="hint">يلزم {MIN_PLAYERS} لاعبين على الأقل</span>
            )}
          </>
        )}
      </div>
      {showHowTo && <HowToPlay onClose={() => setShowHowTo(false)} />}
    </main>
  );
}
