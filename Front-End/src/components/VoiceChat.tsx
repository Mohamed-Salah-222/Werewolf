import { useVoice } from "../contexts/VoiceConext"
import "./VoiceChat.css"

interface VoiceChatProps {
  gameCode: string
  playerId: string
}

export default function VoiceChat({ gameCode, playerId }: VoiceChatProps) {
  const { joined, muted, error, joinVoice, leaveVoice, toggleMute } = useVoice()

  const handleJoinOrLeave = async () => {
    if (joined) {
      leaveVoice()
    } else {
      try {
        await joinVoice(gameCode, playerId)
      } catch (err) {
        console.error("Failed to join voice:", err)
      }
    }
  }

  return (
    <div className="voice-chat-container">
      <button
        className={`voice-btn ${joined ? "voice-joined" : "voice-idle"}`}
        onClick={handleJoinOrLeave}
        title={joined ? "Leave voice chat" : "Join voice chat"}
      >
        <span className="voice-icon">
          {joined ? "🎤" : "🔇"}
        </span>
        {joined ? "Leave Voice" : "Join Voice"}
      </button>

      {joined && (
        <button
          className={`mute-btn ${muted ? "muted" : "unmuted"}`}
          onClick={toggleMute}
          title={muted ? "Unmute" : "Mute"}
        >
          <span className="mute-icon">
            {muted ? "🔇" : "🎤"}
          </span>
        </button>
      )}

      {error && <div className="voice-error">{error}</div>}
    </div>
  )
}
