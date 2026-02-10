interface ActionCompleteProps {
  result: { message?: string } | null;
}

function ActionComplete({ result }: ActionCompleteProps) {
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Action Complete</h2>
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
  title: {
    fontSize: "24px",
    marginBottom: "16px",
    color: "#4ade80",
  },
  text: {
    color: "#aaa",
    fontSize: "16px",
    marginBottom: "16px",
  },
  resultBox: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "12px",
    padding: "20px",
    marginBottom: "16px",
  },
  resultText: {
    color: "#fff",
    fontSize: "15px",
    lineHeight: "1.5",
  },
  subtext: {
    color: "#666",
    fontSize: "14px",
  },
};

export default ActionComplete;
