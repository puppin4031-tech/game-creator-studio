import type { LatLng } from './types';
import { distanceM, M_PER_DEG_LAT, M_PER_DEG_LNG } from './geo';

/** ~1.1km presence cells: players only join the room for their own cell to cap realtime traffic. */
export const PRESENCE_CELL_DEG = 0.01;
/** Minimum movement before re-broadcasting position. */
export const PRESENCE_MIN_MOVE_M = 5;
/** Minimum interval between position broadcasts. */
export const PRESENCE_MIN_INTERVAL_MS = 3000;
/** Heartbeat even when standing still so peers know we're alive. */
export const PRESENCE_HEARTBEAT_MS = 20000;
/** Damage dealt by a bare-handed player attack before weapon bonus. */
export const PVP_BASE_DAMAGE = 4;

export const presenceCell = (p: LatLng) =>
  `${Math.floor(p.lat / PRESENCE_CELL_DEG)}_${Math.floor(p.lng / PRESENCE_CELL_DEG)}`;

/** Round to ~1m so we never leak sub-meter precision. */
export const roundCoord = (v: number) => Math.round(v * 1e5) / 1e5;

/** Grid snap (meters) applied to every position shared with other players. */
export const PUBLIC_GRID_M = 10;
/** Coarser grid used near the player's own base (often their home). */
export const HOME_GRID_M = 50;
/** Radius around the base where the coarse grid applies. */
export const HOME_PRIVACY_RADIUS_M = 200;

const snap = (v: number, step: number) => Math.round(Math.round(v / step) * step * 1e6) / 1e6;

/** Position other players may see: snapped to a grid, coarser near the base so a home cannot be pinpointed. */
export function publicPosition(pos: LatLng, base: LatLng | null): LatLng {
  const nearHome = !!base && distanceM(pos, base) <= HOME_PRIVACY_RADIUS_M;
  const gridM = nearHome ? HOME_GRID_M : PUBLIC_GRID_M;
  const latStep = gridM / M_PER_DEG_LAT;
  const lngStep = gridM / M_PER_DEG_LNG;
  return { lat: snap(pos.lat, latStep), lng: snap(pos.lng, lngStep) };
}

export function shouldBroadcast(last: { pos: LatLng; at: number } | null, pos: LatLng, now: number): boolean {
  if (!last) return true;
  const elapsed = now - last.at;
  if (elapsed >= PRESENCE_HEARTBEAT_MS) return true;
  return elapsed >= PRESENCE_MIN_INTERVAL_MS && distanceM(last.pos, pos) >= PRESENCE_MIN_MOVE_M;
}

export type EmoteId = 'love' | 'good' | 'bad' | 'hello';
export const EMOTES: { id: EmoteId; label: string; text: string }[] = [
  { id: 'hello', label: '우우', text: '우우!' },
  { id: 'love', label: '호감', text: '좋아!' },
];
/** A PK duel ends once the two players are farther apart than this. */
export const DUEL_MAX_DISTANCE_M = 100;
