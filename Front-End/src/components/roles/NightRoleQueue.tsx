interface RoleQueueItem {
  roleName: string;
  seconds: number;
}

interface Props {
  roleQueue: RoleQueueItem[];
  activeRole: string;
  timer: number;
  myRole: string;
}

function NightRoleQueue({ roleQueue, activeRole, timer, myRole }: Props) {
  return (
    <div style={styles.container}>
      {roleQueue.map((item) => {
        const isActive = activeRole.toLowerCase() === item.roleName.toLowerCase();
        const isMine = myRole.toLowerCase() === item.roleName.toLowerCase();

        return (
          <div
            key={item.roleName}
            style={{
              ...styles.row,
              ...(isActive ? styles.rowActive : {}),
            }}
          >
            <span
              style={{
                ...styles.roleName,
                ...(isActive ? styles.roleNameActive : {}),
                ...(isMine && !isActive ? styles.roleNameMine : {}),
              }}
            >
              {item.roleName}
              {isMine && <span style={styles.youBadge}> (YOU)</span>}
            </span>

            <span
              style={{
                ...styles.timer,
                ...(isActive ? styles.timerActive : {}),
              }}
            >
              {isActive ? `${timer}s` : `${item.seconds}s`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    width: "100%",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: "4px",
    backgroundColor: "rgba(201,168,76,0.02)",
    border: "1px solid #1a1510",
    transition: "all 0.3s ease",
  },
  rowActive: {
    backgroundColor: "rgba(201,168,76,0.08)",
    border: "1px solid rgba(201,168,76,0.3)",
  },
  roleName: {
    fontSize: "13px",
    fontFamily: "'Creepster', cursive",
    letterSpacing: "2px",
    color: "#3d2e1a",
  },
  roleNameActive: {
    color: "#c9a84c",
  },
  roleNameMine: {
    color: "#8a7a60",
  },
  youBadge: {
    fontSize: "10px",
    color: "#c9a84c",
    letterSpacing: "1px",
  },
  timer: {
    fontSize: "12px",
    fontFamily: "'Creepster', cursive",
    letterSpacing: "1px",
    color: "#2a2019",
    fontVariantNumeric: "tabular-nums",
  },
  timerActive: {
    color: "#c9a84c",
  },
};

export default NightRoleQueue;
