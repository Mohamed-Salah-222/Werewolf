import { Router } from "express";
import { createGame, getGameByCode, checkGameExists, getAllGames, deleteGame } from "../controllers/gameController";


const router = Router();


router.post("/create", createGame);


router.get("/", getAllGames);


router.get("/:code/check", checkGameExists);

router.get("/:code", getGameByCode);

router.delete("/:code", deleteGame);

export default router;
