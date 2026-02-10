import { useState } from "react";

interface Props {
  playerId: string;
  players: Array<{ id: string; name: string }>;
  groundCards: Array<{ id: string; label: string }>;
  onAction: (action: { type: string; targetPlayer?: { id: string }; groundRole1?: { id: string }; groundRole2?: { id: string } }) => void;
}

function SeerAction({ playerId, players, groundCards, onAction }: Props) {
  const [mode, setMode] = useState<"choose" | "player" | "ground">("choose");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedGround, setSelectedGround] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const others = players.filter((p) => p.id !== playerId);

  const handleSeePlayer = () => {
    if (!selectedPlayer) return;
    setSubmitted(true);
    onAction({
      type: "seer_player_role",
      targetPlayer: { id: selectedPlayer },
    });
  };

  const handleSeeGround = () => {
    if (selectedGround.length !== 2) return;
    setSubmitted(true);
    onAction({
      type: "seer_ground_roles",
      groundRole1: { id: selectedGround[0] },
      groundRole2: { id: selectedGround[1] },
    });
  };

  const toggleGround = (id: string) => {
    if (submitted) return;
    setSelectedGround((prev) => {
      if (prev.includes(id)) return prev.filter((g) => g !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  if (mode === "choose") {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>🔮 Seer</h2>
        <p style={styles.description}>Choose what to look at:</p>
        <button style={styles.choiceButton} onClick={() => setMode("player")}>
          Look at one player's role
        </button>
        <button style={styles.choiceButton} onClick={() => setMode("ground")}>
          Look at two ground cards
        </button>
      </div>
    );
  }

  if (mode === "player") {
    return (
      <div style={styles.container}>
        <h2 style={styles.title}>🔮 Seer</h2>
        <p style={styles.description}>Choose a player to see their role:</p>
        <div style={styles.list}>
          {others.map((p) => (
            <button key={p.id} style={selectedPlayer === p.id ? styles.selectedItem : styles.item} onClick={() => !submitted && setSelectedPlayer(p.id)} disabled={submitted}>
              {p.name}
            </button>
          ))}
        </div>
        <button style={!selectedPlayer || submitted ? styles.buttonDisabled : styles.button} onClick={handleSeePlayer} disabled={!selectedPlayer || submitted}>
          {submitted ? "Looking..." : "See Role"}
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🔮 Seer</h2>
      <p style={styles.description}>Pick exactly 2 ground cards:</p>
      <div style={styles.list}>
        {groundCards.map((card) => (
          <button key={card.id} style={selectedGround.includes(card.id) ? styles.selectedItem : styles.item} onClick={() => toggleGround(card.id)} disabled={submitted}>
            {card.label}
          </button>
        ))}
      </div>
      <button style={selectedGround.length !== 2 || submitted ? styles.buttonDisabled : styles.button} onClick={handleSeeGround} disabled={selectedGround.length !== 2 || submitted}>
        {submitted ? "Looking..." : "See Cards"}
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
  choiceButton: {
    display: "block",
    width: "100%",
    padding: "16px",
    fontSize: "15px",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    border: "1px solid #333",
    borderRadius: "8px",
    marginBottom: "12px",
    textAlign: "center" as const,
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

export default SeerAction;
