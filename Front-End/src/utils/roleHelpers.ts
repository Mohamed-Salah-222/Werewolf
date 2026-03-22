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

/** Calculate circle positions for N players, with self at the top */
export function getCirclePositions(count: number, selfIndex: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const angleStep = 360 / count;

  const radiusX = 44;
  const radiusY = 42;
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
