"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
// import gameRoutes from './routes/gameRoutes';
// import { errorHandler } from './utils/errorHandler';
// import Logger from './utils/Logger';
const app = (0, express_1.default)();
// Initialize logger (create this later)
// const logger = Logger.getInstance();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true })); //* Not needed but why not 
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    if (req.method === "POST" || req.method === "PUT") {
        console.log("Body:", JSON.stringify(req.body));
    }
    next();
});
// Routes
// Later we'll add: app.use('/api/games', gameRoutes);
app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        message: "Wereworlf server is running",
        timeStamp: new Date().toISOString(),
    });
});
app.use((req, res) => {
    res.status(404).json({
        error: "Route not found",
        path: req.url,
    });
});
// Error handling middleware (create this later)
// app.use(errorHandler);
exports.default = app;
