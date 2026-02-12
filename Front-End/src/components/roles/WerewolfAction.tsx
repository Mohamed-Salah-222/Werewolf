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
      <h2 style={{ ...styles.title, color: "#c41e1e" }}>WEREWOLF</h2>
      <div style={styles.divider} />
      <p style={styles.description}>You wake up to see who the other Werewolves are. If you're alone, you get to peek at one ground card.</p>
      <p style={styles.instruction}>Tap below to look around.</p>
      <button style={submitted ? styles.buttonDisabled : styles.button} onClick={handleAction} disabled={submitted}>
        {submitted ? "LOOKING..." : "OPEN EYES"}
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
    marginBottom: "16px",
    lineHeight: "1.7",
    fontFamily: "'Trade Winds', cursive",
  },
  instruction: {
    color: "#9a8a70",
    fontSize: "14px",
    marginBottom: "24px",
    fontFamily: "'Trade Winds', cursive",
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

export default WerewolfAction;
