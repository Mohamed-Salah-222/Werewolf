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
        <h2 style={{ ...styles.title, color: "#2a8a4a" }}>SEER</h2>
        <div style={styles.divider} />
        <p style={styles.description}>Choose what to look at:</p>
        <button style={styles.choiceButton} onClick={() => setMode("player")}>
          <span style={styles.choiceText}>LOOK AT ONE PLAYER'S ROLE</span>
        </button>
        <button style={styles.choiceButton} onClick={() => setMode("ground")}>
          <span style={styles.choiceText}>LOOK AT TWO GROUND CARDS</span>
        </button>
      </div>
    );
  }

  if (mode === "player") {
    return (
      <div style={styles.container}>
        <h2 style={{ ...styles.title, color: "#2a8a4a" }}>SEER</h2>
        <div style={styles.divider} />
        <p style={styles.description}>Choose a player to see their role:</p>
        <div style={styles.list}>
          {others.map((p) => (
            <button key={p.id} style={selectedPlayer === p.id ? styles.selectedItem : styles.item} onClick={() => !submitted && setSelectedPlayer(p.id)} disabled={submitted}>
              {p.name}
            </button>
          ))}
        </div>
        <button style={!selectedPlayer || submitted ? styles.buttonDisabled : styles.button} onClick={handleSeePlayer} disabled={!selectedPlayer || submitted}>
          {submitted ? "LOOKING..." : "SEE ROLE"}
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={{ ...styles.title, color: "#2a8a4a" }}>SEER</h2>
      <div style={styles.divider} />
      <p style={styles.description}>Pick exactly 2 ground cards:</p>
      <div style={styles.list}>
        {groundCards.map((card) => (
          <button key={card.id} style={selectedGround.includes(card.id) ? styles.selectedItem : styles.item} onClick={() => toggleGround(card.id)} disabled={submitted}>
            {card.label}
          </button>
        ))}
      </div>
      <button style={selectedGround.length !== 2 || submitted ? styles.buttonDisabled : styles.button} onClick={handleSeeGround} disabled={selectedGround.length !== 2 || submitted}>
        {submitted ? "LOOKING..." : "SEE CARDS"}
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
  choiceButton: {
    display: "block",
    width: "100%",
    padding: "18px 16px",
    backgroundColor: "rgba(201,168,76,0.03)",
    border: "1px solid #2a2019",
    borderRadius: "4px",
    marginBottom: "12px",
    cursor: "pointer",
  },
  choiceText: {
    fontSize: "13px",
    fontWeight: 400,
    letterSpacing: "3px",
    color: "#c9a84c",
    fontFamily: "'Creepster', cursive",
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

export default SeerAction;
