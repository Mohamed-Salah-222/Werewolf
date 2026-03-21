import http from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import dotenv from "dotenv";

import { Manager } from "./entities/Manager";
import { setManager } from "./controllers/gameController";
import { initializeSocketHandlers } from "./socket/socketHandlers";
import { ClientToServerEvents, ServerToClientEvents } from "./types/socket.types";

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : ["http://localhost:5173", process.env.FRONTEND_URL].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Create manager instance
const manager = new Manager();
manager.startCleanupJob();
manager.setSocketIO(io);

// Set manager for controllers
setManager(manager);

// Initialize socket handlers
initializeSocketHandlers(io, manager);

// Start server
server.listen(PORT, () => {
  console.log("=================================");
  console.log(`Werewolf Server Started`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log("=================================");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

export { io, server };
