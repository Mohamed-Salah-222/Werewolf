import { useState } from "react";
import "./HowToPlay.css";

interface Props {
  onClose: () => void;
}

type Tab = "howto" | "order" | "roles" | "characters";

const ROLE_ORDER = ["Werewolf", "Minion", "Clone", "Seer", "Mason", "Robber", "Troublemaker", "Drunk", "Warlock", "Insomniac", "Joker", "Oracle"];

const BASE_ROLES = [
  { name: "Werewolf", count: 2 },
  { name: "Minion", count: 1 },
  { name: "Mason", count: 2 },
  { name: "Seer", count: 1 },
  { name: "Robber", count: 1 },
  { name: "Troublemaker", count: 1 },
  { name: "Drunk", count: 1 },
];

const EXPANSION_ORDER = [
  { player: "7th", role: "Clone" },
  { player: "8th", role: "Insomniac" },
  { player: "9th", role: "Joker" },
  { player: "10th", role: "Werewolf" },
  { player: "11th", role: "Warlock" },
  { player: "12th", role: "Oracle" },
];

const CHARACTER_INFO = [
  { name: "Werewolf", team: "villain", ability: "See other Werewolves. If alone, peek one ground card." },
  { name: "Minion", team: "villain", ability: "Know the Werewolves. They don't know you. If you die, Werewolf team wins." },
  { name: "Clone", team: "village", ability: "Copy another player's role and perform their night action." },
  { name: "Seer", team: "village", ability: "View one player's role or two ground cards." },
  { name: "Mason", team: "village", ability: "Wake with the other Mason and recognize each other." },
  { name: "Robber", team: "village", ability: "Steal a player's role. You see it and become that role." },
  { name: "Troublemaker", team: "village", ability: "Swap two other players' roles without looking." },
  { name: "Drunk", team: "village", ability: "Swap your role with a random ground card. You don't see it." },
  { name: "Warlock", team: "village", ability: "Pick a player — their role is swapped with a random ground card. Blind swap." },
  { name: "Insomniac", team: "village", ability: "Check your card at end of night to see if it changed." },
  { name: "Joker", team: "neutral", ability: "Peek one ground card. You win if the village votes to eliminate you." },
  { name: "Oracle", team: "village", ability: "Receive a random vision from another player's night action." },
];

function teamColor(team: string): string {
  if (team === "villain") return "var(--color-villain)";
  if (team === "neutral") return "var(--color-neutral)";
  return "var(--color-village)";
}

function teamLabel(team: string): string {
  if (team === "villain") return "WEREWOLF";
  if (team === "neutral") return "NEUTRAL";
  return "VILLAGE";
}

function HowToPlay({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("howto");

  return (
    <div className="htp-overlay" onClick={onClose}>
      <div className="htp-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="htp-header">
          <h2 className="htp-title">☽ HOW TO PLAY</h2>
          <button className="htp-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="htp-tabs">
          <button className={`htp-tab ${activeTab === "howto" ? "htp-tab--active" : ""}`} onClick={() => setActiveTab("howto")}>
            GUIDE
          </button>
          <button className={`htp-tab ${activeTab === "order" ? "htp-tab--active" : ""}`} onClick={() => setActiveTab("order")}>
            ROLE ORDER
          </button>
          <button className={`htp-tab ${activeTab === "roles" ? "htp-tab--active" : ""}`} onClick={() => setActiveTab("roles")}>
            ROLE SETUP
          </button>
          <button className={`htp-tab ${activeTab === "characters" ? "htp-tab--active" : ""}`} onClick={() => setActiveTab("characters")}>
            CHARACTERS
          </button>
        </div>

        {/* Content */}
        <div className="htp-content">
          {activeTab === "howto" && (
            <div className="htp-section">
              <p className="htp-flavor">Welcome to the village... where not everyone is who they claim to be.</p>

              <div className="htp-step">
                <span className="htp-step-num">1</span>
                <div>
                  <span className="htp-step-title">GATHER YOUR PACK</span>
                  <p className="htp-step-desc">You need at least 6 players to start.</p>
                </div>
              </div>

              <div className="htp-step">
                <span className="htp-step-num">2</span>
                <div>
                  <span className="htp-step-title">ROLES ARE ASSIGNED</span>
                  <p className="htp-step-desc">Each player secretly receives a role. 3 extra cards go to the ground. Don't reveal your role to anyone.</p>
                </div>
              </div>

              <div className="htp-step">
                <span className="htp-step-num">3</span>
                <div>
                  <span className="htp-step-title">THE NIGHT PHASE</span>
                  <p className="htp-step-desc">Roles wake up one by one in order and perform their special actions. Some peek, some swap, some steal. Pay attention to what you learn.</p>
                </div>
              </div>

              <div className="htp-step">
                <span className="htp-step-num">4</span>
                <div>
                  <span className="htp-step-title">DISCUSSION</span>
                  <p className="htp-step-desc">Everyone opens their eyes and talks. Accuse, defend, lie, bluff use whatever you learned (or didn't) to figure out who the werewolves are.</p>
                </div>
              </div>

              <div className="htp-step">
                <span className="htp-step-num">5</span>
                <div>
                  <span className="htp-step-title">THE VOTE</span>
                  <p className="htp-step-desc">Everyone votes for who to eliminate. The player with the most votes is out.</p>
                </div>
              </div>

              <div className="htp-win-box">
                <span className="htp-win-label">WIN CONDITIONS</span>
                <p className="htp-win-item">
                  <span className="htp-win-team htp-win-team--village">VILLAGE</span>
                  wins if a Werewolf is eliminated.
                </p>
                <p className="htp-win-item">
                  <span className="htp-win-team htp-win-team--villain">WEREWOLVES</span>
                  win if they all survive the vote.
                </p>
                <p className="htp-win-item">
                  <span className="htp-win-team htp-win-team--neutral">JOKER</span>
                  wins alone if the village votes to eliminate them.
                </p>
              </div>
            </div>
          )}

          {activeTab === "order" && (
            <div className="htp-section">
              <p className="htp-flavor">During the night, roles act in this exact order. Each role has a limited time to perform their action.</p>
              <div className="htp-order-list">
                {ROLE_ORDER.map((role, i) => (
                  <div key={role} className="htp-order-item">
                    <span className="htp-order-num">{i + 1}</span>
                    <span className="htp-order-name">{role}</span>
                  </div>
                ))}
              </div>
              <p className="htp-note">Only roles that are in the current game will be called. Roles not in play are skipped.</p>
            </div>
          )}

          {activeTab === "roles" && (
            <div className="htp-section">
              <div className="htp-roles-block">
                <span className="htp-roles-heading">BASE GAME — 6 PLAYERS + 3 GROUND</span>
                <div className="htp-roles-list">
                  {BASE_ROLES.map((r) => (
                    <div key={r.name} className="htp-role-row">
                      <span className="htp-role-name">{r.name}</span>
                      <span className="htp-role-count">×{r.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="htp-roles-block">
                <span className="htp-roles-heading">EXPANSION — ADDED PER PLAYER</span>
                <div className="htp-roles-list">
                  {EXPANSION_ORDER.map((e) => (
                    <div key={e.player} className="htp-role-row">
                      <span className="htp-role-player">{e.player} player</span>
                      <span className="htp-role-arrow">→</span>
                      <span className="htp-role-name">{e.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="htp-note">There are always 3 more cards than players. The extra cards go face-down in the center as ground cards.</p>
            </div>
          )}

          {activeTab === "characters" && (
            <div className="htp-section">
              <div className="htp-char-list">
                {CHARACTER_INFO.map((char) => (
                  <div key={char.name} className="htp-char-row">
                    <div className="htp-char-header">
                      <span className="htp-char-name">{char.name}</span>
                      <span className="htp-char-team" style={{ color: teamColor(char.team) }}>
                        {teamLabel(char.team)}
                      </span>
                    </div>
                    <p className="htp-char-ability">{char.ability}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HowToPlay;
