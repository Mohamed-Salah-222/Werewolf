import http from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import dotenv from "dotenv";

// import { Manager } from "./entities/Manager";
import { setManager } from "./controllers/gameController";

// import { connectDatabase } from './config/database';

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: "*", // In production, specify your frontend URL
    methods: ["GET", "POST"],
  },
});

// const manager = new Manager();

// setManager(manager);

// Initialize socket handlers ( uncomment this later)
// initializeSocketHandlers(io, manager);

// Basic socket connection test
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Connect to MongoDB (optional, add this later)
// connectDatabase();

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
