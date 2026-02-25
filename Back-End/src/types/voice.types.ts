type VoiceRoom = {
  players: Map<string, string> // playerId -> socketId
}

export const voiceRooms = new Map<string, VoiceRoom>()
