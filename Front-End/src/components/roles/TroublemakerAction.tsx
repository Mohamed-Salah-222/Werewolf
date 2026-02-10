import { useState } from "react";

interface Props {
  playerId: string;
  players: Array<{ id: string; name: string }>;
  onAction: (action: { type: string; player1: { id: string }; player2: { id: string } }) => void;
}

function TroublemakerAction({ playerId, players, onAction }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const others = players.filter((p) => p.id !== playerId);

  const togglePlayer = (id: string) => {
    if (submitted) return;
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  const handleAction = () => {
    if (selected.length !== 2) return;
    setSubmitted(true);
    onAction({
      type: "troublemaker",
      player1: { id: selected[0] },
      player2: { id: selected[1] },
    });
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🔀 Troublemaker</h2>
      <p style={styles.description}>Pick exactly 2 players to swap their roles. You won't see what they are.</p>
      <div style={styles.list}>
        {others.map((p) => (
          <button key={p.id} style={selected.includes(p.id) ? styles.selectedItem : styles.item} onClick={() => togglePlayer(p.id)} disabled={submitted}>
            {p.name}
          </button>
        ))}
      </div>
      <button style={selected.length !== 2 || submitted ? styles.buttonDisabled : styles.button} onClick={handleAction} disabled={selected.length !== 2 || submitted}>
        {submitted ? "Swapping..." : "Swap Roles"}
      </button>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { textAlign: "center", padding: "40px 20px" },
  title: { fontSize: "28px", marginBottom: "12px" },
  description: { color: "#aaa", fontSize: "14px", marginBottom: "24px", lineHeight: "1.5" },
  list: { display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" },
  item: {
    padding: "12px 16px",
    fontSize: "15px",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    border: "1px solid #333",
    borderRadius: "8px",
    textAlign: "left" as const,
  },
  selectedItem: {
    padding: "12px 16px",
    fontSize: "15px",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    border: "2px solid #fff",
    borderRadius: "8px",
    textAlign: "left" as const,
  },
  button: {
    padding: "14px 48px",
    fontSize: "16px",
    fontWeight: "bold",
    backgroundColor: "#fff",
    color: "#111",
    border: "none",
    borderRadius: "8px",
  },
  buttonDisabled: {
    padding: "14px 48px",
    fontSize: "16px",
    fontWeight: "bold",
    backgroundColor: "#333",
    color: "#666",
    border: "none",
    borderRadius: "8px",
    cursor: "not-allowed",
  },
};

export default TroublemakerAction;
