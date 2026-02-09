const API_BASE_URL = "http://localhost:3000/api";

interface CreateGameResponse {
  success: boolean;
  message: string;
  data?: {
    code: string;
    phase: string;
  };
  error?: string;
}

interface CheckGameResponse {
  success: boolean;
  data?: {
    exists: boolean;
    canJoin: boolean;
    phase: string | null;
    playerCount: number;
  };
  error?: string;
}

export const api = {
  // Create a new game
  createGame: async (): Promise<CreateGameResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/games/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      return await response.json();
    } catch (error) {
      console.error("Error creating game:", error);
      return {
        success: false,
        message: "Failed to create game",
        error: "Network error",
      };
    }
  },

  // Check if game exists and can be joined
  checkGame: async (code: string): Promise<CheckGameResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/games/${code}/check`);
      return await response.json();
    } catch (error) {
      console.error("Error checking game:", error);
      return {
        success: false,
        error: "Network error",
      };
    }
  },
};
