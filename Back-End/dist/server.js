"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.io = void 0;
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const app_1 = __importDefault(require("./app"));
const dotenv_1 = __importDefault(require("dotenv"));
// import { Manager } from './entities/Manager';
// import { initializeSocketHandlers } from './socket/socketHandlers';
// import { connectDatabase } from './config/database';
dotenv_1.default.config();
const PORT = process.env.PORT || 3000;
const server = http_1.default.createServer(app_1.default);
exports.server = server;
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*", // In production, specify your frontend URL
        methods: ["GET", "POST"],
    },
});
exports.io = io;
// Create Manager instance ( uncomment this later)
// const manager = new Manager();
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
