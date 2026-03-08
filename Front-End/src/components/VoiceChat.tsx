import { useVoice } from "../contexts/VoiceConext";
import "./VoiceChat.css";

interface VoiceChatProps {
  gameCode: string;
  playerId: string;
}

export default function VoiceChat({ gameCode, playerId }: VoiceChatProps) {
  const { joined, muted, error, joinVoice, leaveVoice, toggleMute } = useVoice();

  const handleJoinOrLeave = async () => {
    if (joined) {
      leaveVoice();
    } else {
      try {
        await joinVoice(gameCode, playerId);
      } catch (err) {
        console.error("Failed to join voice:", err);
      }
    }
  };

  return (
    <div className="voice-chat-container">
      <button className={`wr-ready-btn ${joined ? "wr-ready-btn--active" : ""}`} onClick={handleJoinOrLeave} title={joined ? "Leave voice chat" : "Join voice chat"}>
        {joined ? "LEAVE VOICE" : "JOIN VOICE"}
      </button>

      {joined && (
        <button className={`wr-ready-btn ${muted ? "" : "wr-ready-btn--active"}`} onClick={toggleMute} title={muted ? "Unmute" : "Mute"}>
          {muted ? "UNMUTE" : "MUTE"}
        </button>
      )}

      {error && <div className="voice-error">{error}</div>}
    </div>
  );
}
// Hello Hello 