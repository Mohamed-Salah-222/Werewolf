import { useState } from "react";

interface Props {
  onAction: (action: Record<string, unknown>) => void;
}

function MinionAction({ onAction }: Props) {
  const [submitted, setSubmitted] = useState(false);

  const handleAction = () => {
    setSubmitted(true);
    onAction({ type: "minion" });
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>😈 Minion</h2>
      <p style={styles.description}>You serve the Werewolves. Tap below to see who they are.</p>
      <button style={submitted ? styles.buttonDisabled : styles.button} onClick={handleAction} disabled={submitted}>
        {submitted ? "Looking..." : "See Werewolves"}
      </button>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: { textAlign: "center", padding: "40px 20px" },
  title: { fontSize: "28px", marginBottom: "12px" },
  description: { color: "#aaa", fontSize: "14px", marginBottom: "24px", lineHeight: "1.5" },
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

export default MinionAction;
