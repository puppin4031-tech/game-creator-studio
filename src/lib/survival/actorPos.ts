import { distanceM, type LatLng } from './world';

/** Visual-only actor offset: the sprite walks to a tapped object while GPS position stays put. */
export interface ActorTarget { lat: number; lng: number; anchor: LatLng }

export const ACTOR_IDLE_RETURN_MS = 3000;
export const ACTOR_GPS_MOVE_RETURN_M = 3;

/** Return true when the sprite must walk back to the real GPS center. */
export function shouldReturnToCenter(pos: LatLng, target: ActorTarget, radiusM: number): boolean {
  if (distanceM(pos, target.anchor) >= ACTOR_GPS_MOVE_RETURN_M) return true;
  return distanceM(pos, target) > radiusM;
}
