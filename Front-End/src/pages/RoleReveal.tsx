import { useState } from "react";
import { SOCKET_EVENTS } from "@werewolf/shared";
import { ROLE_TEAM_LABEL, type PageProps } from "./types";

export default function RoleReveal({ snapshot, emit }: PageProps) {
  const [revealed, setRevealed] = useState(false);
  const priv = snapshot.playerPrivateData;
  if (!priv) return null;

  const team = ROLE_TEAM_LABEL[priv.roleTeam ?? ""] ?? priv.roleTeam;
  const others = snapshot.players.filter((p) => p.id !== snapshot.yourPlayerId);

  return (
    <main className="page center-screen">
      {!revealed ? (
        <>
          <h2>دورك جاهز</h2>
          <p className="hint">تأكد إن محدش بيبصلك، وبعدين افتح الكارت</p>
          <button className="btn primary big" onClick={() => setRevealed(true)}>اكشف دوري</button>
        </>
      ) : (
        <>
          <div className={`role-card team-${priv.roleTeam}`}>
            <span className="role-team">{team}</span>
            <h1 className="role-name">{priv.currentRole}</h1>
          </div>
          {priv.roleDescription && <p className="hint">{priv.roleDescription}</p>}
          <button
            className="btn primary"
            onClick={() =>
              emit(SOCKET_EVENTS.CLIENT.CONFIRM_ROLE_REVEAL, {
                gameCode: snapshot.code,
                playerId: snapshot.yourPlayerId,
              })
            }
          >
            فهمت، مستعد
          </button>
          <p className="hint">
            أكدوا ({snapshot.players.filter((p) => p.hasConfirmedRole).length}/{snapshot.players.length})
          </p>
        </>
      )}
    </main>
  );
}
