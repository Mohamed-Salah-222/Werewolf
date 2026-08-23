import { useState } from "react";
import { SOCKET_EVENTS } from "@werewolf/shared";
import { ROLE_TEAM_LABEL, type PageProps } from "./types";
import { roleIdOf } from "./roleId";
import { RoleIcon, ClawMarks } from "./Art";
import HelpTip from "./HelpTip";
import { sfx } from "../sfx";

export default function RoleReveal({ snapshot, emit }: PageProps) {
  const [revealed, setRevealed] = useState(false);
  const priv = snapshot.playerPrivateData;
  if (!priv) return null;

  const team = ROLE_TEAM_LABEL[priv.roleTeam ?? ""] ?? priv.roleTeam;
  const roleId = roleIdOf(priv.currentRole ?? "");

  return (
    <main className="page center-screen">
      <HelpTip phase="roleReveal" />
      {!revealed ? (
        <>
          <ClawMarks width={200} />
          <h2>دورك جاهز</h2>
          <p className="hint">تأكد إن محدش بيبصلك، وبعدين افتح الكارت</p>
          <button
            className="btn primary big card-flip-btn"
            onClick={() => {
              sfx.play("phase");
              setRevealed(true);
            }}
          >
            اكشف دوري
          </button>
        </>
      ) : (
        <>
          <div className={`role-card role-card--flip team-${priv.roleTeam}`}>
            <span className="role-team">{team}</span>
            <div className="role-art"><RoleIcon roleId={roleId} size={64} /></div>
            <h1 className="role-name">{priv.currentRole}</h1>
          </div>
          {priv.roleDescription && <p className="hint desc">{priv.roleDescription}</p>}
          <button
            className="btn primary"
            onClick={() => {
              sfx.play("confirm");
              emit(SOCKET_EVENTS.CLIENT.CONFIRM_ROLE_REVEAL, {
                gameCode: snapshot.code,
                playerId: snapshot.yourPlayerId,
              });
            }}
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
