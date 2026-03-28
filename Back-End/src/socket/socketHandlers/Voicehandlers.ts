import { voiceRooms } from "../../types/voice.types";
import { SocketContext } from "./Shared";

export function registerVoiceHandlers(ctx: SocketContext): void {
  const { socket, io, manager } = ctx;

  // VOICE JOIN
  socket.on("voiceJoin", ({ gameCode, playerId }) => {
    const game = manager.getGameByCode(gameCode);
    if (!game) {
      socket.emit("error", { message: "Game not found" });
      return;
    }

    // Find player in game
    const player = game.getPlayerById(playerId);
    if (!player) {
      socket.emit("error", { message: "Player not found in this game" });
      return;
    }

    let room = voiceRooms.get(gameCode);

    if (!room) {
      room = { players: new Map() };
      voiceRooms.set(gameCode, room);
    }

    // Check max players (14)
    if (room.players.size >= 14) {
      socket.emit("error", { message: "Voice chat is full (max 14 players)" });
      return;
    }

    // store mapping
    room.players.set(playerId, socket.id);

    socket.join(`voice:${gameCode}`);

    // notify others to create peer
    socket.to(`voice:${gameCode}`).emit("voiceNewPeer", {
      playerId,
    });

    console.log(`🎤 ${playerId} (${player.name}) joined voice ${gameCode}. Total voice participants: ${room.players.size}`);
  });

  // VOICE LEAVE
  socket.on("voiceLeave", ({ playerId }) => {
    for (const [gameCode, room] of voiceRooms) {
      if (room.players.has(playerId)) {
        room.players.delete(playerId);

        io.to(`voice:${gameCode}`).emit("voiceLeave", { playerId });

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
  socket.on("voiceOffer", ({ to, offer }) => {
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
        io.to(targetSocketId).emit("voiceOffer", {
          from: to === to ? senderPlayerId : to,
          offer,
        });
        break;
      }
    }
  });

  // ANSWER RELAY
  socket.on("voiceAnswer", ({ to, answer }) => {
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
        io.to(targetSocketId).emit("voiceAnswer", {
          from: senderPlayerId,
          answer,
        });
        break;
      }
    }
  });

  // ICE RELAY
  socket.on("voiceIce", ({ to, candidate }) => {
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
        io.to(targetSocketId).emit("voiceIce", {
          from: senderPlayerId,
          candidate,
        });
        break;
      }
    }
  });
}
