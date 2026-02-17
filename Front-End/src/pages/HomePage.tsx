import { useState } from "react";
import socket from "../socket";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import { useGame } from "../hooks/useGame";
import "./HomePage.css";

// Import character images
import werewolfSquare from "../assets/werewolf_square.webp";
import werewolf2d from "../assets/werewolf_2d.webp";
import minionSquare from "../assets/minion_square.webp";
import minion2d from "../assets/minion_2d.webp";
import seerSquare from "../assets/seer_square.webp";
import seer2d from "../assets/seer_2d.webp";
import robberSquare from "../assets/robber_square.webp";
import robber2d from "../assets/robber_2d.webp";
import troublemakerSquare from "../assets/troublemaker_square.webp";
import troublemaker2d from "../assets/troublemaker_2d.webp";
import masonSquare from "../assets/mason_square.webp";
import mason2d from "../assets/mason_2d.webp";
import drunkSquare from "../assets/drunk_square.webp";
import drunk2d from "../assets/drunk_2d.webp";
import insomniacSquare from "../assets/insomaniac_square.webp";
import insomniac2d from "../assets/insomaniac_2d.webp";
import cloneSquare from "../assets/clone_square.webp";
import clone2d from "../assets/clone_2d.webp";
import jokerSquare from "../assets/joker_square.webp";
import joker2d from "../assets/joker_2d.webp";

interface CharacterData {
  id: string;
  name: string;
  team: "villain" | "village" | "neutral";
  title: string;
  description: string;
  ability: string;
  square: string | null;
  fullBody: string | null;
}

const characters: CharacterData[] = [
  {
    id: "werewolf",
    name: "Werewolf",
    team: "villain",
    title: "The Beast Among Us",
    description: "A creature of the night hiding in plain sight. When darkness falls, the werewolf reveals its true nature — hunting alongside its pack to devour the innocent.",
    ability: "During the night, all Werewolves open their eyes and identify each other. If you are the only Werewolf, you may peek at one ground card.",
    square: werewolfSquare,
    fullBody: werewolf2d,
  },
  {
    id: "minion",
    name: "Minion",
    team: "villain",
    title: "The Shadow Servant",
    description: "A loyal servant who would die for the wolves. Knows who they are, yet remains invisible to them.",
    ability: "You see who the Werewolves are, but they don't know you exist. If you die, the Werewolves win.",
    square: minionSquare,
    fullBody: minion2d,
  },
  {
    id: "seer",
    name: "Seer",
    team: "village",
    title: "The All-Seeing Eye",
    description: "Gifted with visions beyond mortal sight. The Seer peers into the souls of others to uncover the truth.",
    ability: "Look at one player's role, or two of the ground cards.",
    square: seerSquare,
    fullBody: seer2d,
  },
  {
    id: "robber",
    name: "Robber",
    team: "village",
    title: "The Night Thief",
    description: "Takes what isn't his including identities. By morning, even he doesn't know who he truly is.",
    ability: "Steal another player's role and see what you become.",
    square: robberSquare,
    fullBody: robber2d,
  },
  {
    id: "troublemaker",
    name: "Troublemaker",
    team: "village",
    title: "The Chaos Weaver",
    description: "Sows confusion by swapping others' fates. Nobody is safe from her meddling hands.",
    ability: "Swap the roles of two other players without looking.",
    square: troublemakerSquare,
    fullBody: troublemaker2d,
  },
  {
    id: "mason",
    name: "Mason",
    team: "village",
    title: "The Sworn Brother",
    description: "Bound by oath, Masons know their own. Their trust is unbreakable a rare gift in a village of lies.",
    ability: "Wake up and see who the other Mason is.",
    square: masonSquare,
    fullBody: mason2d,
  },
  {
    id: "drunk",
    name: "Drunk",
    team: "village",
    title: "The Lost Soul",
    description: "Too deep in the bottle to remember who they are. Stumbles through the night, swapping fates unknowingly.",
    ability: "Swap your role with a ground card — but you don't get to see it.",
    square: drunkSquare,
    fullBody: drunk2d,
  },
  {
    id: "insomniac",
    name: "Insomniac",
    team: "village",
    title: "The Sleepless Watcher",
    description: "Can never quite fall asleep. While others scheme in darkness, the Insomniac watches and waits.",
    ability: "Wake up last and check if your role has changed.",
    square: insomniacSquare,
    fullBody: insomniac2d,
  },
  {
    id: "clone",
    name: "Clone",
    team: "village",
    title: "The Mimic",
    description: "Becomes whoever it chooses to copy. A blank slate that takes on the identity of another.",
    ability: "Copy another player's role and become that role.",
    square: cloneSquare,
    fullBody: clone2d,
  },
  {
    id: "joker",
    name: "Joker",
    team: "neutral",
    title: "The Wild Card",
    description: "Chaos incarnate. Wants nothing more than to be eliminated. A madman who wins by losing.",
    ability: "You win if the village votes to eliminate you. You are on your own team.",
    square: jokerSquare,
    fullBody: joker2d,
  },
];

function HomePage() {
  const navigate = useNavigate();
  const { setSession } = useGame();

  const [selectedChar, setSelectedChar] = useState<CharacterData>(characters[0]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const [playerName, setPlayerName] = useState("");
  const [gameCode, setGameCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Preload all character images
  useState(() => {
    characters.forEach((char) => {
      if (char.fullBody) {
        const img = new Image();
        img.src = char.fullBody;
      }
      if (char.square) {
        const img = new Image();
        img.src = char.square;
      }
    });
  });

  const handleCreateGame = async () => {
    if (playerName.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/games/create`, { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      if (!data.success) {
        setError("Failed to create game");
        setLoading(false);
        return;
      }
      const code = data.data.code;
      if (!socket.connected) socket.connect();
      socket.emit("joinGame", { gameCode: code, playerName: playerName.trim() }, (response: { success: boolean; playerName?: string; playerId?: string; error?: string }) => {
        setLoading(false);
        if (response.success) {
          setSession({ gameCode: code, playerId: response.playerId || "", playerName: response.playerName || "", isHost: true });
          setShowCreateModal(false);
          navigate(`/waiting/${code}`, { state: { playerName: response.playerName, playerId: response.playerId, isHost: true } });
        } else {
          setError(response.error || "Failed to join game");
        }
      });
    } catch {
      setError("Could not connect to server");
      setLoading(false);
    }
  };

  const handleJoinGame = () => {
    if (playerName.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    if (gameCode.trim().length !== 6) {
      setError("Game code must be 6 characters");
      return;
    }
    setLoading(true);
    setError("");
    if (!socket.connected) socket.connect();
    socket.emit("joinGame", { gameCode: gameCode.trim().toLowerCase(), playerName: playerName.trim() }, (response: { success: boolean; playerName?: string; playerId?: string; error?: string }) => {
      setLoading(false);
      if (response.success) {
        setSession({ gameCode: gameCode.trim().toLowerCase(), playerId: response.playerId || "", playerName: response.playerName || "", isHost: false });
        setShowJoinModal(false);
        navigate(`/waiting/${gameCode.trim().toLowerCase()}`, { state: { playerName: response.playerName, playerId: response.playerId, isHost: false } });
      } else {
        setError(response.error || "Failed to join game");
      }
    });
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowJoinModal(false);
    setError("");
    setPlayerName("");
    setGameCode("");
  };

  const teamColor = (team: string) => {
    if (team === "villain") return "#c41e1e";
    if (team === "neutral") return "#d4a017";
    return "#2a8a4a";
  };

  const teamLabel = (team: string) => {
    if (team === "villain") return "WEREWOLF TEAM";
    if (team === "neutral") return "NEUTRAL";
    return "VILLAGE TEAM";
  };

  return (
    <div style={styles.page} className="home-page-override">
      <div style={styles.vignette} />

      <style>{`
        .action-btn {
          padding: 14px 36px;
          font-size: 16px;
          font-weight: 400;
          letter-spacing: 3px;
          font-family: 'Creepster', cursive;
          background-color: transparent;
          color: #c9a84c;
          border: 1px solid #3d2e1a;
          cursor: pointer;
          text-transform: uppercase;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .action-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.1), transparent);
          transition: left 0.5s ease;
        }
        .action-btn:hover {
          border-color: #c9a84c;
          color: #e8dcc8;
          box-shadow: 0 0 20px rgba(201,168,76,0.2), inset 0 0 20px rgba(201,168,76,0.05);
          text-shadow: 0 0 10px rgba(201,168,76,0.3);
        }
        .action-btn:hover::before {
          left: 100%;
        }
        .action-btn:active {
          transform: scale(0.97);
        }
      `}</style>

      {/* ===== TOP: TITLE + BUTTONS ===== */}
      <div style={styles.topBar} className="topbar-override">
        <h1 style={styles.title}>WEREWOLF</h1>
        <div style={styles.buttonRow}>
          <button
            className="action-btn"
            onClick={() => {
              closeModals();
              setShowCreateModal(true);
            }}
          >
            CREATE GAME
          </button>
          <button
            className="action-btn"
            onClick={() => {
              closeModals();
              setShowJoinModal(true);
            }}
          >
            JOIN GAME
          </button>
        </div>
      </div>

      {/* ===== MIDDLE: CHARACTER SHOWCASE ===== */}
      <div style={styles.showcase} className="showcase-override">
        <div style={styles.characterDisplay} className="char-display-override">
          {selectedChar.fullBody ? (
            <img src={selectedChar.fullBody} alt={selectedChar.name} style={styles.fullBodyImg} key={selectedChar.id} />
          ) : (
            <div style={styles.placeholderBody}>
              <span style={styles.placeholderIcon}>?</span>
              <span style={styles.placeholderText}>COMING SOON</span>
            </div>
          )}
        </div>

        <div style={styles.infoPanel} className="info-panel-override">
          <div style={{ ...styles.teamBadge, backgroundColor: teamColor(selectedChar.team) }}>{teamLabel(selectedChar.team)}</div>
          <h2 style={styles.charName}>{selectedChar.name.toUpperCase()}</h2>
          <p style={styles.charTitle}>{selectedChar.title}</p>
          <div style={styles.divider} />
          <p style={styles.charDesc}>{selectedChar.description}</p>
          <div style={styles.abilityBox}>
            <span style={styles.abilityLabel}>ABILITY</span>
            <p style={styles.abilityText}>{selectedChar.ability}</p>
          </div>
        </div>
      </div>

      {/* ===== BOTTOM: CHARACTER SELECT GRID ===== */}
      <div style={styles.selectBar} className="selectbar-override">
        <div style={styles.selectGrid} className="selectgrid-override">
          {characters.map((char) => (
            <button
              key={char.id}
              style={{
                ...styles.gridSlot,
                borderColor: selectedChar.id === char.id ? teamColor(char.team) : "#2a2a2a",
                boxShadow: selectedChar.id === char.id ? `0 0 20px ${teamColor(char.team)}60, inset 0 0 15px ${teamColor(char.team)}20` : "none",
              }}
              onClick={() => setSelectedChar(char)}
            >
              {char.square ? (
                <img src={char.square} alt={char.name} style={styles.gridImg} />
              ) : (
                <div style={styles.gridPlaceholder}>
                  <span style={styles.gridPlaceholderText}>{char.name.charAt(0)}</span>
                </div>
              )}
              <span style={{ ...styles.gridLabel, color: selectedChar.id === char.id ? teamColor(char.team) : "#666" }}>{char.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ===== MODALS ===== */}
      {showCreateModal && (
        <div style={styles.overlay} onClick={closeModals}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>CREATE GAME</h2>
            <input style={styles.input} type="text" placeholder="Enter your name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={20} onKeyDown={(e) => e.key === "Enter" && handleCreateGame()} autoFocus />
            {error && <p style={styles.error}>{error}</p>}
            <div style={styles.modalButtons}>
              <button style={styles.cancelBtn} onClick={closeModals}>
                CANCEL
              </button>
              <button style={styles.confirmBtn} onClick={handleCreateGame} disabled={loading}>
                {loading ? "CREATING..." : "CREATE"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div style={styles.overlay} onClick={closeModals}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>JOIN GAME</h2>
            <input style={styles.input} type="text" placeholder="Game Code" value={gameCode} onChange={(e) => setGameCode(e.target.value)} maxLength={6} autoFocus />
            <input style={styles.input} type="text" placeholder="Enter your name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={20} onKeyDown={(e) => e.key === "Enter" && handleJoinGame()} />
            {error && <p style={styles.error}>{error}</p>}
            <div style={styles.modalButtons}>
              <button style={styles.cancelBtn} onClick={closeModals}>
                CANCEL
              </button>
              <button style={styles.confirmBtn} onClick={handleJoinGame} disabled={loading}>
                {loading ? "JOINING..." : "JOIN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    position: "relative",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    background: "radial-gradient(ellipse at 30% 50%, #1a0a0a 0%, #0a0a0a 50%, #000 100%)",
    fontFamily: "'Trade Winds', cursive",
    color: "#e8dcc8",
  },
  vignette: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
    zIndex: 1,
  },
  topBar: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    padding: "28px 40px 20px",
    borderBottom: "1px solid #1a1510",
  },
  title: {
    fontSize: "72px",
    fontWeight: 400,
    letterSpacing: "10px",
    margin: 0,
    fontFamily: "'Creepster', cursive",
    background: "linear-gradient(180deg, #e8c84a 0%, #c9a84c 40%, #8a6d2e 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    textShadow: "none",
    filter: "drop-shadow(0 0 40px rgba(201,168,76,0.25))",
  },
  buttonRow: {
    display: "flex",
    gap: "20px",
    marginTop: "16px",
  },
  showcase: {
    position: "relative",
    zIndex: 10,
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "40px",
    padding: "0 60px",
    minHeight: 0,
  },
  characterDisplay: {
    flex: "0 0 300px",
    width: "300px",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    height: "100%",
    maxHeight: "500px",
  },
  fullBodyImg: {
    maxHeight: "480px",
    width: "auto",
    objectFit: "contain" as const,
    filter: "drop-shadow(0 0 60px rgba(201,168,76,0.15))",
    animation: "characterFloat 4s ease-in-out infinite",
  },
  placeholderBody: {
    width: "240px",
    height: "400px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    border: "1px dashed #2a2019",
    borderRadius: "4px",
    gap: "12px",
  },
  placeholderIcon: {
    fontSize: "64px",
    color: "#2a2019",
    fontFamily: "'Creepster', cursive",
  },
  placeholderText: {
    fontSize: "12px",
    letterSpacing: "4px",
    color: "#2a2019",
  },
  infoPanel: {
    flex: "0 0 340px",
    maxWidth: "340px",
  },
  teamBadge: {
    display: "inline-block",
    padding: "4px 14px",
    fontSize: "11px",
    fontWeight: 400,
    letterSpacing: "3px",
    color: "#fff",
    borderRadius: "2px",
    marginBottom: "12px",
    fontFamily: "'Trade Winds', cursive",
  },
  charName: {
    fontSize: "36px",
    fontWeight: 400,
    letterSpacing: "4px",
    color: "#e8dcc8",
    margin: "0 0 4px 0",
    fontFamily: "'Creepster', cursive",
  },
  charTitle: {
    fontSize: "14px",
    fontStyle: "italic",
    color: "#8a7a60",
    margin: "0 0 16px 0",
    fontFamily: "'Trade Winds', cursive",
  },
  divider: {
    width: "60px",
    height: "1px",
    backgroundColor: "#3d2e1a",
    marginBottom: "16px",
  },
  charDesc: {
    fontSize: "14px",
    lineHeight: "1.7",
    color: "#9a8a70",
    margin: "0 0 20px 0",
    fontFamily: "'Trade Winds', cursive",
  },
  abilityBox: {
    padding: "16px",
    backgroundColor: "rgba(201,168,76,0.05)",
    border: "1px solid #2a2019",
    borderRadius: "4px",
  },
  abilityLabel: {
    display: "block",
    fontSize: "12px",
    fontWeight: 400,
    letterSpacing: "4px",
    color: "#c9a84c",
    marginBottom: "8px",
    fontFamily: "'Creepster', cursive",
  },
  abilityText: {
    fontSize: "13px",
    lineHeight: "1.6",
    color: "#b0a080",
    margin: 0,
    fontFamily: "'Trade Winds', cursive",
  },
  selectBar: {
    position: "relative",
    zIndex: 10,
    padding: "16px 40px 24px",
    borderTop: "1px solid #1a1510",
    background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
  },
  selectGrid: {
    display: "flex",
    gap: "8px",
    justifyContent: "center",
    flexWrap: "wrap" as const,
  },
  gridSlot: {
    width: "80px",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "6px",
    padding: "4px",
    backgroundColor: "transparent",
    border: "2px solid #2a2a2a",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  gridImg: {
    width: "72px",
    height: "72px",
    objectFit: "cover" as const,
    borderRadius: "2px",
  },
  gridPlaceholder: {
    width: "72px",
    height: "72px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f0d0a",
    borderRadius: "2px",
    border: "1px solid #1a1510",
  },
  gridPlaceholderText: {
    fontSize: "24px",
    color: "#2a2019",
    fontFamily: "'Creepster', cursive",
    fontWeight: 400,
  },
  gridLabel: {
    fontSize: "10px",
    fontWeight: 400,
    letterSpacing: "1px",
    textTransform: "uppercase" as const,
    fontFamily: "'Creepster', cursive",
    textAlign: "center" as const,
  },
  overlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    backgroundColor: "#0f0d0a",
    border: "1px solid #2a2019",
    borderRadius: "4px",
    padding: "32px",
    width: "340px",
  },
  modalTitle: {
    fontSize: "24px",
    fontWeight: 400,
    letterSpacing: "4px",
    textAlign: "center" as const,
    marginBottom: "24px",
    color: "#c9a84c",
    fontFamily: "'Creepster', cursive",
  },
  input: {
    width: "100%",
    padding: "12px",
    fontSize: "14px",
    backgroundColor: "#1a1510",
    color: "#e8dcc8",
    border: "1px solid #2a2019",
    borderRadius: "4px",
    marginBottom: "12px",
    fontFamily: "'Trade Winds', cursive",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  error: {
    color: "#c41e1e",
    fontSize: "13px",
    marginBottom: "12px",
    fontFamily: "'Trade Winds', cursive",
  },
  modalButtons: {
    display: "flex",
    gap: "12px",
    marginTop: "8px",
  },
  cancelBtn: {
    flex: 1,
    padding: "12px",
    fontSize: "14px",
    fontWeight: 400,
    letterSpacing: "2px",
    backgroundColor: "transparent",
    color: "#6b5a3a",
    border: "1px solid #2a2019",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "'Creepster', cursive",
  },
  confirmBtn: {
    flex: 1,
    padding: "12px",
    fontSize: "14px",
    fontWeight: 400,
    letterSpacing: "2px",
    backgroundColor: "#c9a84c",
    color: "#0a0a0a",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "'Creepster', cursive",
  },
};

export default HomePage;
