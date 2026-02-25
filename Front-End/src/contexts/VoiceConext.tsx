import { createContext, useContext, useEffect, useRef, useState } from "react"
import socket from "../socket"

const servers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
}

// Optimize audio constraints for better quality
const audioConstraints: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    // Prefer higher sample rate for better quality
    sampleRate: { ideal: 48000, min: 16000 },
    // Prefer higher bitrate
    sampleSize: { ideal: 16 },
  },
  video: false,
}

interface VoiceContextType {
  joinVoice: (gameCode: string, playerId: string) => Promise<void>
  leaveVoice: () => void
  toggleMute: () => void
  muted: boolean
  joined: boolean
  error: string | null
}

const VoiceContext = createContext<VoiceContextType | null>(null)

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef(new Map<string, RTCPeerConnection>())
  const audioRefs = useRef(new Map<string, HTMLAudioElement>())
  const currentGameCodeRef = useRef<string | null>(null)
  const currentPlayerIdRef = useRef<string | null>(null)

  const [joined, setJoined] = useState(false)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // =============================
  // JOIN VOICE
  // =============================
  const joinVoice = async (gameCode: string, playerId: string) => {
    if (joined) return

    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints)

      localStreamRef.current = stream
      currentGameCodeRef.current = gameCode
      currentPlayerIdRef.current = playerId
      setJoined(true)
      setMuted(false)

      socket.emit("voiceJoin", { gameCode, playerId })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to access microphone"
      setError(message)
      console.error("Error joining voice:", message)
    }
  }

  // =============================
  // LEAVE VOICE
  // =============================
  const leaveVoice = () => {
    if (!joined) return

    const playerId = currentPlayerIdRef.current
    if (playerId) {
      socket.emit("voiceLeave", { playerId })
    }

    // Close all peer connections
    peersRef.current.forEach((pc) => {
      pc.close()
    })
    peersRef.current.clear()

    // Clean up all audio elements
    audioRefs.current.forEach((audio) => {
      audio.pause()
      audio.srcObject = null
      if (audio.parentNode) {
        audio.parentNode.removeChild(audio)
      }
    })
    audioRefs.current.clear()

    // Stop local stream tracks
    localStreamRef.current?.getTracks().forEach((track) => {
      track.stop()
    })
    localStreamRef.current = null

    currentGameCodeRef.current = null
    currentPlayerIdRef.current = null
    setJoined(false)
    setMuted(false)
  }

  // =============================
  // CREATE PEER
  // =============================
  const createPeer = (playerId: string, initiator: boolean) => {
    const pc = new RTCPeerConnection({
      iceServers: servers.iceServers,
    })

    // Optimize connection for audio quality
    pc.onconnectionstatechange = () => {
      console.log(`🔗 Peer connection state: ${pc.connectionState}`)
    }

    peersRef.current.set(playerId, pc)

    localStreamRef.current?.getTracks().forEach((track) => {
      // Optimize audio track settings
      const sender = pc.addTrack(track, localStreamRef.current!)
      if (sender && sender.getParameters) {
        const params = sender.getParameters()
        if (!params.encodings) {
          params.encodings = [{}]
        }
        // Set optimal bitrate for audio (128 kbps is good for voice)
        params.encodings[0].maxBitrate = 128000 // 128 kbps
        try {
          sender.setParameters(params)
        } catch (err) {
          console.log("Could not set sender parameters:", err)
        }
      }
    })

    pc.ontrack = (event) => {
      const stream = event.streams[0]

      let audio = audioRefs.current.get(playerId)
      if (!audio) {
        audio = document.createElement("audio")
        audio.autoplay = true
        // Prevent echo by not playing local tracks through speakers in some cases
        audio.muted = false
        audioRefs.current.set(playerId, audio)
        document.body.appendChild(audio) // Append to DOM so audio actually plays
      }

      audio.srcObject = stream
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("voiceIce", {
          to: playerId,
          candidate: e.candidate,
        })
      }
    }

    if (initiator) {
      pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      })
        .then((o) => pc.setLocalDescription(o))
        .then(() =>
          socket.emit("voiceOffer", {
            to: playerId,
            offer: pc.localDescription,
          })
        )
        .catch((err) => console.error("Error creating offer:", err))
    }

    return pc
  }

  // =============================
  // SIGNALING
  // =============================
  useEffect(() => {
    const handleNewPeer = ({ playerId }: { playerId: string }) => {
      if (!peersRef.current.has(playerId)) {
        createPeer(playerId, true)
      }
    }

    const handleOffer = async ({ from, offer }: { from: string; offer: any }) => {
      try {
        let pc = peersRef.current.get(from)
        if (!pc) {
          pc = createPeer(from, false)
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        })
        await pc.setLocalDescription(answer)

        socket.emit("voiceAnswer", { to: from, answer })
      } catch (err) {
        console.error("Error handling offer:", err)
      }
    }

    const handleAnswer = async ({ from, answer }: { from: string; answer: any }) => {
      try {
        const pc = peersRef.current.get(from)
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer))
        }
      } catch (err) {
        console.error("Error handling answer:", err)
      }
    }

    const handleIce = async ({ from, candidate }: { from: string; candidate: any }) => {
      try {
        const pc = peersRef.current.get(from)
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        }
      } catch (err) {
        console.error("Error adding ICE candidate:", err)
      }
    }

    const handlePeerLeave = ({ playerId }: { playerId: string }) => {
      const pc = peersRef.current.get(playerId)
      if (pc) {
        pc.close()
        peersRef.current.delete(playerId)
      }

      const audio = audioRefs.current.get(playerId)
      if (audio) {
        audio.pause()
        audio.srcObject = null
        if (audio.parentNode) {
          audio.parentNode.removeChild(audio)
        }
        audioRefs.current.delete(playerId)
      }
    }

    socket.on("voiceNewPeer", handleNewPeer)
    socket.on("voiceOffer", handleOffer)
    socket.on("voiceAnswer", handleAnswer)
    socket.on("voiceIce", handleIce)
    socket.on("voiceLeave", handlePeerLeave)

    return () => {
      socket.off("voiceNewPeer", handleNewPeer)
      socket.off("voiceOffer", handleOffer)
      socket.off("voiceAnswer", handleAnswer)
      socket.off("voiceIce", handleIce)
      socket.off("voiceLeave", handlePeerLeave)
    }
  }, [])

  // =============================
  // MUTE CONTROL
  // =============================
  const toggleMute = () => {
    const newMutedState = !muted

    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !newMutedState))

    setMuted(newMutedState)
  }

  return (
    <VoiceContext.Provider
      value={{
        joinVoice,
        leaveVoice,
        toggleMute,
        muted,
        joined,
        error,
      }}
    >
      {children}
    </VoiceContext.Provider>
  )
}

export const useVoice = () => {
  const context = useContext(VoiceContext)
  if (!context) {
    throw new Error("useVoice must be used within VoiceProvider")
  }
  return context
}
