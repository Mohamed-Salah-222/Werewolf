import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import { error, timeStamp } from "node:console";

import gameRoutes from "./routes/gameRoutes";
// import { errorHandler } from './utils/errorHandler';
// import Logger from './utils/Logger';

const app: Application = express();

// Initialize logger (create this later)
// const logger = Logger.getInstance();

app.use(
  cors({
    origin: process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : ["http://localhost:5173", process.env.FRONTEND_URL].filter(Boolean),
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true })); //* Not needed but why not

app.use((req: Request, res: Response, next: NextFunction) => {
  //*---- debug
  // console.log(`${req.method} ${req.url}`);

  // if (req.method === "POST" || req.method === "PUT") {
  //   console.log("Body:", JSON.stringify(req.body));
  // }

  next();
});

app.use("/api/games", gameRoutes);

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    message: "Werewolf server is running",
    timeStamp: new Date().toISOString(),
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
    path: req.url,
  });
});

// Error handling middleware (create this later)
// app.use(errorHandler);

export default app;
