import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";

const servers = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

interface RtcProps {
  socket: Socket;
  roomId: string;
}

export default function Rtc({ socket, roomId }: RtcProps) {
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  const audioElementsRef = useRef(new Map<string, HTMLAudioElement>());

  const handleJoin = async () => {
    if (localStreamRef.current) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    localStreamRef.current = stream;
    socket.emit("voice:join", { roomId });
  };

  const createPeer = (playerId: string, initiator: boolean) => {
    const pc = new RTCPeerConnection(servers);

    peersRef.current.set(playerId, pc);

    localStreamRef.current?.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      let audio = audioElementsRef.current.get(playerId);

      if (!audio) {
        audio = document.createElement("audio");
        audio.autoplay = true;
        audioElementsRef.current.set(playerId, audio);
      }

      audio.srcObject = stream;
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("voice:ice", { to: playerId, candidate: event.candidate });
      }
    };

    if (initiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          socket.emit("voice:offer", { to: playerId, offer: pc.localDescription });
        });
    }

    return pc;
  };

  useEffect(() => {
    socket.on("voice:new-peer", ({ playerId }: { playerId: string }) => {
      createPeer(playerId, true);
    });

    socket.on("voice:offer", async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      const pc = createPeer(from, false);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("voice:answer", { to: from, answer });
    });

    socket.on("voice:answer", async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      const pc = peersRef.current.get(from);
      await pc?.setRemoteDescription(answer);
    });

    socket.on("voice:ice", async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = peersRef.current.get(from);
      if (pc) await pc.addIceCandidate(candidate);
    });

    socket.on("voice:leave", ({ playerId }: { playerId: string }) => {
      const pc = peersRef.current.get(playerId);
      pc?.close();
      peersRef.current.delete(playerId);
    });

    return () => {
      socket.off("voice:new-peer");
      socket.off("voice:offer");
      socket.off("voice:answer");
      socket.off("voice:ice");
      socket.off("voice:leave");
    };
  }, [socket]);

  const toggleAudio = () => {
    localStreamRef.current?.getAudioTracks().forEach((track) => (track.enabled = isAudioMuted));

    setIsAudioMuted(!isAudioMuted);
  };

  useEffect(() => {
    return () => {
      peersRef.current.forEach((pc) => pc.close());
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="rtc-container">
      <button onClick={toggleAudio}>{isAudioMuted ? "Unmute Audio" : "Mute Audio"}</button>
      <button onClick={handleJoin}>Join Voice Chat</button>
    </div>
  );
}
