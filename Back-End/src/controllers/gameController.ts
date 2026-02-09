import { Request, Response } from "express";
import { Manager } from "../entities/Manager";
import { VALIDATION, ERROR_MESSAGES } from "../config/constants";


// We'll get the manager instance from server.ts
// For now, we'll create a temporary one (we'll fix this when we wire everything together)
let manager: Manager;

export const setManager = (managerInstance: Manager) => {
  manager = managerInstance;
};


export const createGame = (req: Request, res: Response): void => {
  try {
    const game = manager.createGame();

    res.status(201).json({
      success: true,
      message: "Game created successfully",
      data: {
        code: game.code,
        phase: game.phase,
      },
    });
  } catch (error) {
    console.error("Error creating game:", error);
    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.UNKNOWN_ERROR,
    });
  }
};


export const getGameByCode = (req: Request, res: Response): void => {
  try {
    const { code } = req.params;

    // Validate code format
    if (!code || code.length !== VALIDATION.GAME_CODE_LENGTH) {
      res.status(400).json({
        success: false,
        error: "Invalid game code format",
      });
      return;
    }

    if (typeof code !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid game code',
      });
      return;
    }

    const game = manager.getGameByCode(code);

    if (!game) {
      res.status(404).json({
        success: false,
        error: ERROR_MESSAGES.GAME_NOT_FOUND,
      });
      return;
    }

    // Return safe game data (don't expose roles during game)
    res.status(200).json({
      success: true,
      data: {
        code: game.code,
        phase: game.phase,
        playerCount: game.players.length,
        players: game.players.map((p) => ({
          id: p.id,
          name: p.name,
          // Don't send roles unless game is finished
          ...(game.phase === "endGame" && { role: p.getRole().name }),
        })),
        timer: game.timer,
      },
    });
  } catch (error) {
    console.error("Error getting game:", error);
    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.UNKNOWN_ERROR,
    });
  }
};


export const checkGameExists = (req: Request, res: Response): void => {
  try {
    const { code } = req.params;

    // Validate code format
    if (!code || code.length !== VALIDATION.GAME_CODE_LENGTH) {
      res.status(400).json({
        success: false,
        error: "Invalid game code format",
      });
      return;
    }
    if (typeof code !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid game code',
      });
      return;
    }

    const canJoin = manager.canJoinGame(code);
    const game = manager.getGameByCode(code);

    res.status(200).json({
      success: true,
      data: {
        exists: game !== null,
        canJoin: canJoin,
        phase: game?.phase || null,
        playerCount: game?.players.length || 0,
      },
    });
  } catch (error) {
    console.error("Error checking game:", error);
    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.UNKNOWN_ERROR,
    });
  }
};


export const getAllGames = (req: Request, res: Response): void => {
  try {
    const games = manager.games.map((game) => ({
      code: game.code,
      phase: game.phase,
      playerCount: game.players.length,
    }));

    res.status(200).json({
      success: true,
      data: {
        count: games.length,
        games: games,
      },
    });
  } catch (error) {
    console.error("Error getting all games:", error);
    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.UNKNOWN_ERROR,
    });
  }
};


export const deleteGame = (req: Request, res: Response): void => {
  try {
    const { code } = req.params;

    if (typeof code !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Invalid game code',
      });
      return;
    }

    const game = manager.getGameByCode(code);

    if (!game) {
      res.status(404).json({
        success: false,
        error: ERROR_MESSAGES.GAME_NOT_FOUND,
      });
      return;
    }

    // Only allow deletion if game hasn't started
    if (game.phase !== "waiting") {
      res.status(400).json({
        success: false,
        error: "Cannot delete a game that has already started",
      });
      return;
    }

    manager.deleteGame(game);

    res.status(200).json({
      success: true,
      message: "Game deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting game:", error);
    res.status(500).json({
      success: false,
      error: ERROR_MESSAGES.UNKNOWN_ERROR,
    });
  }
};
