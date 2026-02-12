interface ActionCompleteProps {
  result: { message?: string } | null;
}

function ActionComplete({ result }: ActionCompleteProps) {
  return (
    <div style={styles.container}>
      <div style={styles.iconWrapper}>
        <span style={styles.icon}>✦</span>
      </div>
      <h2 style={styles.title}>ACTION COMPLETE</h2>
      <div style={styles.divider} />
      <p style={styles.text}>Your night action is done.</p>
      {result?.message && (
        <div style={styles.resultBox}>
          <p style={styles.resultText}>{result.message}</p>
        </div>
      )}
      <p style={styles.subtext}>Waiting for other players...</p>
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
  },
  icon: {
    fontSize: "32px",
    color: "#2a8a4a",
    filter: "drop-shadow(0 0 12px rgba(42,138,74,0.4))",
  },
  title: {
    fontSize: "24px",
    fontWeight: 400,
    letterSpacing: "6px",
    color: "#2a8a4a",
    margin: "0 0 12px 0",
    fontFamily: "'Creepster', cursive",
    textShadow: "0 0 20px rgba(42,138,74,0.2)",
  },
  divider: {
    width: "60px",
    height: "1px",
    backgroundColor: "#2a3a2a",
    margin: "0 auto 16px",
  },
  text: {
    color: "#8a7a60",
    fontSize: "14px",
    marginBottom: "20px",
    fontFamily: "'Trade Winds', cursive",
  },
  resultBox: {
    backgroundColor: "rgba(201,168,76,0.05)",
    border: "1px solid #2a2019",
    borderRadius: "4px",
    padding: "20px",
    marginBottom: "20px",
  },
  resultText: {
    color: "#e8dcc8",
    fontSize: "14px",
    lineHeight: "1.7",
    margin: 0,
    fontFamily: "'Trade Winds', cursive",
  },
  subtext: {
    color: "#5a4a30",
    fontSize: "12px",
    fontStyle: "italic",
    fontFamily: "'Trade Winds', cursive",
  },
};

export default ActionComplete;
