import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGameStore } from "../store/gameStore";

const PHASE_TO_PATH: Record<string, string> = {
  waiting: "/waiting/",
  role: "/role-reveal/",
  night: "/night/",
  discussion: "/discussion/",
  vote: "/vote/",
  results: "/results/",
};

function GlobalPhaseRouter() {
  const phase = useGameStore((s) => s.phase);
  const gameCode = useGameStore((s) => s.gameCode);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const basePath = PHASE_TO_PATH[phase];
    if (!basePath || !gameCode) return;
    const expected = `${basePath}${gameCode}`;
    if (pathname !== expected) {
      navigate(expected, { replace: true });
    }
  }, [phase, gameCode, navigate, pathname]);

  return null;
}

export default GlobalPhaseRouter;
