import { useContext } from "react";
import { GameContext } from "../contexts/GameContextType";

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
