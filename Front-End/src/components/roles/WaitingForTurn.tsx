function WaitingForTurn() {
  return (
    <div style={styles.container}>
      <style>{`
        @keyframes waitingPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.2; }
          40% { opacity: 1; }
        }
      `}</style>
      <div style={styles.iconWrapper}>
        <span style={styles.icon}>☽</span>
      </div>
      <h2 style={styles.title}>THE NIGHT STIRS</h2>
      <div style={styles.divider} />
      <p style={styles.text}>Someone is performing their action...</p>
      <div style={styles.dots}>
        <span style={{ ...styles.dot, animationDelay: "0s" }}>•</span>
        <span style={{ ...styles.dot, animationDelay: "0.2s" }}>•</span>
        <span style={{ ...styles.dot, animationDelay: "0.4s" }}>•</span>
      </div>
      <p style={styles.subtext}>Please wait for your turn</p>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    textAlign: "center",
    padding: "40px 20px",
  },
  iconWrapper: {
    marginBottom: "12px",
    animation: "waitingPulse 3s ease-in-out infinite",
  },
  icon: {
    fontSize: "40px",
    color: "#c9a84c",
    filter: "drop-shadow(0 0 20px rgba(201,168,76,0.3))",
  },
  title: {
    fontSize: "24px",
    fontWeight: 400,
    letterSpacing: "6px",
    color: "#c9a84c",
    margin: "0 0 12px 0",
    fontFamily: "'Creepster', cursive",
    textShadow: "0 0 20px rgba(201,168,76,0.15)",
  },
  divider: {
    width: "60px",
    height: "1px",
    backgroundColor: "#3d2e1a",
    margin: "0 auto 16px",
  },
  text: {
    color: "#8a7a60",
    fontSize: "14px",
    marginBottom: "16px",
    fontFamily: "'Trade Winds', cursive",
  },
  dots: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    marginBottom: "16px",
  },
  dot: {
    fontSize: "24px",
    color: "#c9a84c",
    animation: "dotPulse 1.4s ease-in-out infinite",
  },
  subtext: {
    color: "#5a4a30",
    fontSize: "12px",
    fontStyle: "italic",
    fontFamily: "'Trade Winds', cursive",
  },
};

export default WaitingForTurn;
