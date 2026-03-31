import { characters, allCards, backCardImage } from "../characters";

/** Get the square/thumbnail image for a role (used in circle layout) */
export function getSquareImage(roleName: string): string {
  const char = characters.find((c) => c.name.toLowerCase() === roleName.toLowerCase());
  return char?.square || backCardImage;
}

/** Get the full card image for a role (used in modals) */
export function getFullCardImage(roleName: string): string {
  const card = allCards.find((c) => c.name.toLowerCase() === roleName.toLowerCase());
  return card?.image || backCardImage;
}

/**
 * Calculate circle positions for N players, with self at the top.
 *
 * The radius shrinks for higher player counts so that cards at the
 * extreme left/right (positions 3 & 9 on a 12-player clock) stay
 * within the container bounds even after the CSS translate(-50%, -50%)
 * and the card's own width are accounted for.
 *
 * Safe zone: cards should land between ~10% and ~90% on both axes.
 * With cx/cy at 50, that means max radius = 40.
 * We use 40 for 10+ players and 42 for smaller lobbies.
 */
export function getCirclePositions(count: number, selfIndex: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const angleStep = 360 / count;

  // Adaptive radius — tighter for 10+ players to prevent edge clipping
  const radiusX = count >= 10 ? 46 : 42;
  const radiusY = count >= 10 ? 50 : 40;
  const cx = 50;
  const cy = 50;

  for (let i = 0; i < count; i++) {
    const offset = (i - selfIndex + count) % count;
    const angleDeg = 270 + offset * angleStep;
    const angleRad = (angleDeg * Math.PI) / 180;

    positions.push({
      x: cx + radiusX * Math.cos(angleRad),
      y: cy + radiusY * Math.sin(angleRad),
    });
  }

  return positions;
}
