import type { LatLng } from './types';
import { distanceM } from './geo';

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

export function shouldBroadcast(last: { pos: LatLng; at: number } | null, pos: LatLng, now: number): boolean {
  if (!last) return true;
  const elapsed = now - last.at;
  if (elapsed >= PRESENCE_HEARTBEAT_MS) return true;
  return elapsed >= PRESENCE_MIN_INTERVAL_MS && distanceM(last.pos, pos) >= PRESENCE_MIN_MOVE_M;
}

export type EmoteId = 'love' | 'good' | 'bad' | 'hello';
export const EMOTES: { id: EmoteId; label: string; text: string }[] = [
  { id: 'hello', label: '인사', text: '우가!' },
  { id: 'love', label: '사랑 표현', text: '♥ 좋아!' },
  { id: 'good', label: '긍정', text: '좋다!' },
  { id: 'bad', label: '불쾌', text: '싫다!' },
];
