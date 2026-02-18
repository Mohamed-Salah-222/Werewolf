import { useState } from "react";
import "./HowToPlay.css";

interface Props {
  onClose: () => void;
}

type Tab = "howto" | "order" | "roles";

const ROLE_ORDER = ["Werewolf", "Minion", "Clone", "Seer", "Mason", "Robber", "Troublemaker", "Drunk", "Insomniac", "Joker"];

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
];

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
            NIGHT ORDER
          </button>
          <button className={`htp-tab ${activeTab === "roles" ? "htp-tab--active" : ""}`} onClick={() => setActiveTab("roles")}>
            ROLE SETUP
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
                    {i < ROLE_ORDER.length - 1 && <span className="htp-order-arrow">↓</span>}
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
        </div>
      </div>
    </div>
  );
}

export default HowToPlay;
