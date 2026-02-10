import { useState } from "react";

interface Props {
  groundCards: Array<{ id: string; label: string }>;
  onAction: (action: Record<string, unknown>) => void;
}

function JokerAction({ groundCards, onAction }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleAction = () => {
    if (!selected) return;
    setSubmitted(true);
    onAction({ type: "joker", targetRoleId: selected });
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🃏 Joker</h2>
      <p style={styles.description}>Pick one ground card to peek at.</p>
      <div style={styles.list}>
        {groundCards.map((card) => (
          <button key={card.id} style={selected === card.id ? styles.selectedItem : styles.item} onClick={() => !submitted && setSelected(card.id)} disabled={submitted}>
            {card.label}
          </button>
        ))}
      </div>
      <button style={!selected || submitted ? styles.buttonDisabled : styles.button} onClick={handleAction} disabled={!selected || submitted}>
        {submitted ? "Peeking..." : "Peek at Card"}
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

export default JokerAction;
