import { hash01 } from './geo';
import type { LatLng } from './types';

/** Explored walking step size in meters (matches useSurvivalWorld EXPLORE_STEP_M). */
export const WALK_STEP_M = 20;
export const EGG_HATCH_M = 300;
export const EGG_SPAWN_RADIUS_M = 100;
export const EGG_PICK_RADIUS_M = 20;
export const EGG_RESPAWN_MS = 24 * 3600_000;
const CELL_DEG = 0.0006; // ~60m cells
const SPAWN_CHANCE = 0.06;
const SALT = 7717;

export const BABY_DINOS = [
  { id: 'baby_raptor', name: '아기 랩터' },
  { id: 'mini_triceratops', name: '미니 트리케라톱스' },
  { id: 'baby_stego', name: '아기 스테고사우루스' },
  { id: 'baby_ptera', name: '아기 프테라노돈' },
] as const;
export type BabyDinoId = (typeof BABY_DINOS)[number]['id'];

export interface CarriedEgg { id: string; startSteps: number }
export interface EggSpawn extends LatLng { id: string }

/** Deterministic geographic egg spawns near a point, excluding recently collected ones. */
export function eggSpawnsNear(center: LatLng, depleted: Record<string, number>, now: number): EggSpawn[] {
  const out: EggSpawn[] = [];
  const cx = Math.floor(center.lat / CELL_DEG), cy = Math.floor(center.lng / CELL_DEG);
  for (let i = cx - 2; i <= cx + 2; i++) for (let j = cy - 2; j <= cy + 2; j++) {
    if (hash01(i, j, SALT) >= SPAWN_CHANCE) continue;
    const id = `egg:${i}:${j}`;
    if (now - (depleted[id] ?? -Infinity) < EGG_RESPAWN_MS) continue;
    out.push({ id, lat: (i + hash01(i, j, SALT, 1)) * CELL_DEG, lng: (j + hash01(i, j, SALT, 2)) * CELL_DEG });
  }
  return out;
}

export const eggWalkedM = (egg: CarriedEgg, walkSteps: number) => Math.max(0, walkSteps - egg.startSteps) * WALK_STEP_M;
export const eggReady = (egg: CarriedEgg, walkSteps: number) => eggWalkedM(egg, walkSteps) >= EGG_HATCH_M;
export const babyFor = (eggId: string) => BABY_DINOS[Math.floor(hash01(eggId.length, [...eggId].reduce((a, c) => a + c.charCodeAt(0), 0), SALT) * BABY_DINOS.length)];
