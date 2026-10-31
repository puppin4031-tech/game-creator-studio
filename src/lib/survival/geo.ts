import type { LatLng } from './types';
import type { Biome } from './entities';

/** Shared world seed: every player sees the same resource layout in the same place. */
export const WORLD_SEED = 0x5a17_c0de;

export const M_PER_DEG_LAT = 111_320;
/** Fixed reference latitude (Korea) so the grid is identical for every player. */
const REF_COS = Math.cos((37.5 * Math.PI) / 180);
export const M_PER_DEG_LNG = M_PER_DEG_LAT * REF_COS;

/** Fast local distance in metres (equirectangular, accurate well below 0.1% at game ranges). */
export function distanceM(a: LatLng, b: LatLng): number {
  const cos = Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  const dy = (b.lat - a.lat) * M_PER_DEG_LAT;
  const dx = (b.lng - a.lng) * M_PER_DEG_LAT * cos;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Move a point by metres east (dx) / north (dy). */
export function offsetM(p: LatLng, dxM: number, dyM: number): LatLng {
  const cos = Math.cos((p.lat * Math.PI) / 180);
  return { lat: p.lat + dyM / M_PER_DEG_LAT, lng: p.lng + dxM / (M_PER_DEG_LAT * cos) };
}

/** Global planar grid coordinates (metres) used for deterministic spawning. */
export const toGrid = (p: LatLng) => ({ x: p.lng * M_PER_DEG_LNG, y: p.lat * M_PER_DEG_LAT });
export const fromGrid = (x: number, y: number): LatLng => ({ lat: y / M_PER_DEG_LAT, lng: x / M_PER_DEG_LNG });

/** Deterministic 0..1 hash of up to four integers. */
export function hash01(a: number, b: number, c = 0, d = 0): number {
  let h = (2166136261 ^ WORLD_SEED) >>> 0;
  const vals = [a, b, c, d];
  for (let i = 0; i < 4; i++) {
    h = Math.imul(h ^ (vals[i] | 0), 16777619);
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** Smooth 2D value noise in 0..1. */
export function valueNoise(x: number, y: number, salt: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smooth(x - x0);
  const ty = smooth(y - y0);
  const v00 = hash01(x0, y0, salt);
  const v10 = hash01(x0 + 1, y0, salt);
  const v01 = hash01(x0, y0 + 1, salt);
  const v11 = hash01(x0 + 1, y0 + 1, salt);
  const a = v00 + (v10 - v00) * tx;
  const b = v01 + (v11 - v01) * tx;
  return a + (b - a) * ty;
}

const BIOME_SCALE_M = 240;

/** Biome at a point — a blend of "moisture" and "rockiness" noise fields. */
export function biomeAt(p: LatLng): Biome {
  const { x, y } = toGrid(p);
  const nx = x / BIOME_SCALE_M;
  const ny = y / BIOME_SCALE_M;
  const moist = valueNoise(nx, ny, 11) * 0.7 + valueNoise(nx * 2.3, ny * 2.3, 12) * 0.3;
  const rock = valueNoise(nx * 0.8 + 50, ny * 0.8 + 50, 23) * 0.7 + valueNoise(nx * 2.1, ny * 2.1, 24) * 0.3;
  if (rock > 0.6) return 'rocky';
  if (moist > 0.6) return 'wetland';
  if (moist > 0.42) return 'forest';
  return 'plains';
}

/** Pick a key from a weight table with a 0..1 roll. */
export function pickWeighted<K extends string>(weights: [K, number][], roll: number): K | null {
  const total = weights.reduce((s, [, w]) => s + Math.max(0, w), 0);
  if (total <= 0) return null;
  let r = roll * total;
  for (const [k, w] of weights) {
    if (w <= 0) continue;
    r -= w;
    if (r <= 0) return k;
  }
  return weights[weights.length - 1][0];
}
