import { useEffect, useRef, useState } from "react"
import socket from "../socket"


const servers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
  ],
}

export default function Rtc({ socket, roomId, myId }) {
  const [isAudioMuted, setIsAudioMuted] = useState(false)

  // ---------- Persistent runtime objects ----------
  const localStreamRef = useRef(null)
  const peersRef = useRef(new Map()) // playerId -> RTCPeerConnection
  const audioElementsRef = useRef(new Map())

  // =================================================
  // JOIN VOICE CHAT
  // =================================================
  const handleJoin = async () => {
    if (localStreamRef.current) return

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    })

    localStreamRef.current = stream

    // notify server we joined voice
    socket.emit("voice:join", { roomId })
  }

  // =================================================
  // CREATE PEER CONNECTION
  // =================================================
  const createPeer = (playerId, initiator) => {
    const pc = new RTCPeerConnection(servers)

    peersRef.current.set(playerId, pc)

    // add local tracks
    localStreamRef.current
      ?.getTracks()
      .forEach(track => pc.addTrack(track, localStreamRef.current))

    // receive remote audio
    pc.ontrack = (event) => {
      const stream = event.streams[0]

      let audio = audioElementsRef.current.get(playerId)

      if (!audio) {
        audio = document.createElement("audio")
        audio.autoplay = true
        audioElementsRef.current.set(playerId, audio)
      }

      audio.srcObject = stream
    }

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("voice:ice", {
          to: playerId,
          candidate: event.candidate,
        })
      }
    }

    // initiator creates offer
    if (initiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socket.emit("voice:offer", {
            to: playerId,
            offer: pc.localDescription,
          })
        })
    }

    return pc
  }

  // =================================================
  // SOCKET SIGNALING
  // =================================================
  useEffect(() => {

    // someone joined voice
    socket.on("voice:new-peer", ({ playerId }) => {
      createPeer(playerId, true)
    })

    socket.on("voice:offer", async ({ from, offer }) => {
      const pc = createPeer(from, false)

      await pc.setRemoteDescription(offer)

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      socket.emit("voice:answer", {
        to: from,
        answer,
      })
    })

    socket.on("voice:answer", async ({ from, answer }) => {
      const pc = peersRef.current.get(from)
      await pc.setRemoteDescription(answer)
    })

    socket.on("voice:ice", async ({ from, candidate }) => {
      const pc = peersRef.current.get(from)
      if (pc) await pc.addIceCandidate(candidate)
    })

    socket.on("voice:leave", ({ playerId }) => {
      const pc = peersRef.current.get(playerId)
      pc?.close()
      peersRef.current.delete(playerId)
    })

    return () => {
      socket.off("voice:new-peer")
      socket.off("voice:offer")
      socket.off("voice:answer")
      socket.off("voice:ice")
      socket.off("voice:leave")
    }
  }, [socket])

  // =================================================
  // MUTE / UNMUTE (WW GAME READY)
  // =================================================
  const toggleAudio = () => {
    const enabled = isAudioMuted

    localStreamRef.current
      ?.getAudioTracks()
      .forEach(track => (track.enabled = enabled))

    setIsAudioMuted(!isAudioMuted)
  }

  // =================================================
  // CLEANUP
  // =================================================
  useEffect(() => {
    return () => {
      peersRef.current.forEach(pc => pc.close())
      localStreamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  return (
    <div className="rtc-container">
      <button onClick={toggleAudio}>
        {isAudioMuted ? "Unmute Audio" : "Mute Audio"}
      </button>

      <button onClick={handleJoin}>
        Join Voice Chat
      </button>
    </div>
  )
}
