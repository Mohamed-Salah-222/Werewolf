function WaitingForTurn() {
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Night Phase</h2>
      <p style={styles.text}>Someone is performing their action...</p>
      <p style={styles.subtext}>Please wait for your turn.</p>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    textAlign: "center",
    padding: "40px 20px",
  },
  title: {
    fontSize: "24px",
    marginBottom: "16px",
  },
  text: {
    color: "#aaa",
    fontSize: "16px",
    marginBottom: "8px",
  },
  subtext: {
    color: "#666",
    fontSize: "14px",
  },
};

export default WaitingForTurn;
