import type { UpdateGamePayload } from "@werewolf/shared";
import { roleIdOf } from "./roleId";

export default function EndGame({ snapshot }: { snapshot: UpdateGamePayload }) {
  const winners = snapshot.winners;
  const isDraw = snapshot.isDraw;

  let headline = "انتهت اللعبة";
  if (isDraw) headline = "تعادل! 🤝";
  else if (winners === "villain") headline = "الوحوش كسبت 🐺";
  else if (winners === "village") headline = "أهل القرية كسبوا 🌾";
  else if (winners) headline = `الفريق الفائز: ${winners}`;

  const roleOf = (p: { name: string; role: string }) => p.role;

  return (
    <main className="page center-screen">
      <h1>{headline}</h1>

      <section className="card">
        <h3>الأدوار</h3>
        <ul className="results-list small">
          {(snapshot.resultsPlayerRoles ?? []).map((r) => (
            <li key={r.playerId}>
              <span>{r.name}</span>
              <span className={["werewolf", "minion"].includes(roleIdOf(roleOf(r))) ? "wolf-text" : ""}>
                {roleOf(r)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3>تصويتات</h3>
        <ul className="results-list small">
          {(snapshot.resultsVotes ?? []).map((v, i) => (
            <li key={i}>
              <span>{v.voter}</span>
              <span>← {v.vote}</span>
            </li>
          ))}
          {!snapshot.resultsVotes?.length && <li>—</li>}
        </ul>
      </section>

      {snapshot.actionHistory && snapshot.actionHistory.length > 0 && (
        <section className="card">
          <h3>أحداث الليل</h3>
          <ul className="results-list small">
            {snapshot.actionHistory.map((a, i) => (
              <li key={i}>
                <span>{a.role}</span>
                <span>{a.description}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button className="btn primary mt" onClick={() => window.location.reload()}>
        العودة للبداية
      </button>
    </main>
  );
}
