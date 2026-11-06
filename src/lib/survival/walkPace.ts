/** Max pace counted as walking/running for reward walks: 13 km/h. Faster (scooter, bike, car) is ignored. */
export const MAX_WALK_KMH = 13;
export const MAX_WALK_MPS = MAX_WALK_KMH / 3.6;

/** True when moving `meters` over `elapsedMs` is at or below the walking pace limit. */
export function isWalkingPace(meters: number, elapsedMs: number): boolean {
  if (elapsedMs <= 0) return meters <= 0;
  return meters / (elapsedMs / 1000) <= MAX_WALK_MPS;
}
