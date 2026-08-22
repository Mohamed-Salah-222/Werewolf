import { SOCKET_EVENTS } from "@werewolf/shared";
import { voiceRooms } from "../../types/voice.types";
import { SocketContext } from "./shared";

export function registerVoiceHandlers(ctx: SocketContext): void {
  const { socket, io, manager } = ctx;

  // VOICE JOIN
  socket.on(SOCKET_EVENTS.CLIENT.VOICE_JOIN, ({ gameCode, playerId }) => {
    const game = manager.getGameByCode(gameCode);
    if (!game) {
      socket.emit(SOCKET_EVENTS.SERVER.ERROR, { message: "اللعبة مش موجودة" });
      return;
    }

    const player = game.getPlayerById(playerId);
    if (!player) {
      socket.emit(SOCKET_EVENTS.SERVER.ERROR, { message: "اللاعب مش في اللعبة دي" });
      return;
    }

    let room = voiceRooms.get(gameCode);

    if (!room) {
      room = { players: new Map() };
      voiceRooms.set(gameCode, room);
    }

    if (room.players.size >= 14) {
      socket.emit(SOCKET_EVENTS.SERVER.ERROR, { message: "غرفة الصوت مليانة (14 حد كحد أقصى)" });
      return;
    }

    room.players.set(playerId, socket.id);

    socket.join(`voice:${gameCode}`);

    socket.to(`voice:${gameCode}`).emit(SOCKET_EVENTS.SERVER.VOICE_NEW_PEER, {
      playerId,
    });

    console.log(`🎤 ${playerId} (${player.name}) joined voice ${gameCode}. Total voice participants: ${room.players.size}`);
  });

  // VOICE LEAVE
  socket.on(SOCKET_EVENTS.CLIENT.VOICE_LEAVE, ({ playerId }) => {
    for (const [gameCode, room] of voiceRooms) {
      if (room.players.has(playerId)) {
        room.players.delete(playerId);

        io.to(`voice:${gameCode}`).emit(SOCKET_EVENTS.SERVER.VOICE_LEAVE, { playerId });

        console.log(`🔇 ${playerId} left voice ${gameCode}. Total voice participants: ${room.players.size}`);

        if (room.players.size === 0) {
          voiceRooms.delete(gameCode);
          console.log(`Voice room ${gameCode} deleted (no participants)`);
        }

        return;
      }
    }
  });

  // OFFER RELAY
  socket.on(SOCKET_EVENTS.CLIENT.VOICE_OFFER, ({ to, offer }) => {
    let senderPlayerId: string | null = null;
    let gameCode: string | null = null;

    for (const [gCode, room] of voiceRooms) {
      for (const [pId, sId] of room.players) {
        if (sId === socket.id) {
          senderPlayerId = pId;
          gameCode = gCode;
          break;
        }
      }
      if (senderPlayerId) break;
    }

    for (const [, room] of voiceRooms) {
      const targetSocketId = room.players.get(to);

      if (targetSocketId) {
        io.to(targetSocketId).emit(SOCKET_EVENTS.SERVER.VOICE_OFFER, {
          from: to === to ? senderPlayerId : to,
          offer,
        });
        break;
      }
    }
  });

  // ANSWER RELAY
  socket.on(SOCKET_EVENTS.CLIENT.VOICE_ANSWER, ({ to, answer }) => {
    let senderPlayerId: string | null = null;

    for (const [, room] of voiceRooms) {
      for (const [pId, sId] of room.players) {
        if (sId === socket.id) {
          senderPlayerId = pId;
          break;
        }
      }
      if (senderPlayerId) break;
    }

    for (const [, room] of voiceRooms) {
      const targetSocketId = room.players.get(to);

      if (targetSocketId) {
        io.to(targetSocketId).emit(SOCKET_EVENTS.SERVER.VOICE_ANSWER, {
          from: senderPlayerId,
          answer,
        });
        break;
      }
    }
  });

  // ICE RELAY
  socket.on(SOCKET_EVENTS.CLIENT.VOICE_ICE, ({ to, candidate }) => {
    let senderPlayerId: string | null = null;

    for (const [, room] of voiceRooms) {
      for (const [pId, sId] of room.players) {
        if (sId === socket.id) {
          senderPlayerId = pId;
          break;
        }
      }
      if (senderPlayerId) break;
    }

    for (const [, room] of voiceRooms) {
      const targetSocketId = room.players.get(to);

      if (targetSocketId) {
        io.to(targetSocketId).emit(SOCKET_EVENTS.SERVER.VOICE_ICE, {
          from: senderPlayerId,
          candidate,
        });
        break;
      }
    }
  });
}
