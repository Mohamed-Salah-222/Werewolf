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
      <h2 style={{ ...styles.title, color: "#d4a017" }}>JOKER</h2>
      <div style={styles.divider} />
      <p style={styles.description}>Pick one ground card to peek at.</p>
      <div style={styles.list}>
        {groundCards.map((card) => (
          <button key={card.id} style={selected === card.id ? styles.selectedItem : styles.item} onClick={() => !submitted && setSelected(card.id)} disabled={submitted}>
            {card.label}
          </button>
        ))}
      </div>
      <button style={!selected || submitted ? styles.buttonDisabled : styles.button} onClick={handleAction} disabled={!selected || submitted}>
        {submitted ? "PEEKING..." : "PEEK AT CARD"}
      </button>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { textAlign: "center", padding: "40px 20px" },
  title: {
    fontSize: "28px",
    fontWeight: 400,
    letterSpacing: "6px",
    margin: "0 0 8px 0",
    fontFamily: "'Creepster', cursive",
    textShadow: "0 0 20px currentColor",
  },
  divider: {
    width: "60px",
    height: "1px",
    backgroundColor: "#3d2e1a",
    margin: "0 auto 20px",
  },
  description: {
    color: "#8a7a60",
    fontSize: "14px",
    marginBottom: "24px",
    lineHeight: "1.7",
    fontFamily: "'Trade Winds', cursive",
  },
  list: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    marginBottom: "24px",
  },
  item: {
    padding: "14px 16px",
    fontSize: "14px",
    backgroundColor: "rgba(201,168,76,0.03)",
    color: "#c9b896",
    border: "1px solid #1a1510",
    borderRadius: "4px",
    textAlign: "left" as const,
    cursor: "pointer",
    fontFamily: "'Trade Winds', cursive",
  },
  selectedItem: {
    padding: "14px 16px",
    fontSize: "14px",
    backgroundColor: "rgba(201,168,76,0.08)",
    color: "#e8dcc8",
    border: "2px solid #c9a84c",
    borderRadius: "4px",
    textAlign: "left" as const,
    cursor: "pointer",
    fontFamily: "'Trade Winds', cursive",
    boxShadow: "0 0 16px rgba(201,168,76,0.15), inset 0 0 12px rgba(201,168,76,0.05)",
  },
  button: {
    padding: "14px 48px",
    fontSize: "14px",
    fontWeight: 400,
    letterSpacing: "3px",
    backgroundColor: "#c9a84c",
    color: "#0a0a0a",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "'Creepster', cursive",
  },
  buttonDisabled: {
    padding: "14px 48px",
    fontSize: "14px",
    fontWeight: 400,
    letterSpacing: "3px",
    backgroundColor: "transparent",
    color: "#3d2e1a",
    border: "1px solid #1a1510",
    borderRadius: "4px",
    cursor: "not-allowed",
    fontFamily: "'Creepster', cursive",
  },
};

export default JokerAction;
