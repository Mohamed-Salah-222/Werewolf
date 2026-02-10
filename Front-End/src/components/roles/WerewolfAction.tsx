import { useState } from "react";

interface Props {
  onAction: (action: Record<string, unknown>) => void;
}

function WerewolfAction({ onAction }: Props) {
  const [submitted, setSubmitted] = useState(false);

  const handleAction = () => {
    setSubmitted(true);
    onAction({ type: "werewolf" });
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🐺 Werewolf</h2>
      <p style={styles.description}>You wake up to see who the other Werewolves are. If you're alone, you get to peek at one ground card.</p>
      <p style={styles.instruction}>Tap below to look around.</p>
      <button style={submitted ? styles.buttonDisabled : styles.button} onClick={handleAction} disabled={submitted}>
        {submitted ? "Looking..." : "Open Eyes"}
      </button>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { textAlign: "center", padding: "40px 20px" },
  title: { fontSize: "28px", marginBottom: "12px" },
  description: { color: "#aaa", fontSize: "14px", marginBottom: "16px", lineHeight: "1.5" },
  instruction: { color: "#ccc", fontSize: "16px", marginBottom: "24px" },
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

export default WerewolfAction;
