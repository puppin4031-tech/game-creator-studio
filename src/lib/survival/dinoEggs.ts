import { hash01 } from './geo';
import type { LatLng } from './types';

/** Explored walking step size in meters (matches useSurvivalWorld EXPLORE_STEP_M). */
export const WALK_STEP_M = 20;
/** Average footstep length used to convert admin step targets to meters. */
export const STRIDE_M = 0.7;
export const MAX_WALK_KMH = 13;
export const EGG_HATCH_M = 300;
export const EGG_SPAWN_RADIUS_M = 100;
export const EGG_PICK_RADIUS_M = 20;
export const EGG_RESPAWN_MS = 24 * 3600_000;
const CELL_DEG = 0.0006; // ~60m cells
const SPAWN_CHANCE = 0.06;
const SALT = 7717;

export interface PetDef { id: string; name: string; needM: number; maxKmh: number; weight: number; custom?: boolean; mode?: 'steps' | 'distance'; steps?: number }

export const BABY_DINOS: PetDef[] = [
  { id: 'baby_raptor', name: '아기 랩터', needM: EGG_HATCH_M, maxKmh: MAX_WALK_KMH, weight: 1 },
  { id: 'mini_triceratops', name: '미니 트리케라톱스', needM: EGG_HATCH_M, maxKmh: MAX_WALK_KMH, weight: 1 },
  { id: 'baby_stego', name: '아기 스테고사우루스', needM: EGG_HATCH_M, maxKmh: MAX_WALK_KMH, weight: 1 },
  { id: 'baby_ptera', name: '아기 프테라노돈', needM: EGG_HATCH_M, maxKmh: MAX_WALK_KMH, weight: 1 },
];
export type BabyDinoId = string;

/** Admin-made pets, registered at runtime from the catalog. */
let customPets: PetDef[] = [];
export function registerCustomPets(list: PetDef[]) { customPets = list; }
export const petPool = (): PetDef[] => [...BABY_DINOS, ...customPets].filter(p => p.weight > 0);
export const petById = (id: string) => petPool().find(p => p.id === id) ?? [...BABY_DINOS, ...customPets].find(p => p.id === id);

/** Convert an admin pet row into hatch rules: steps mode uses stride length, speed capped at walking pace. */
export function petFromRow(r: { pet_id: string; name: string; hatch_mode: string; hatch_steps: number; hatch_meters: number; max_speed_kmh: number; weight: number }): PetDef {
  const steps = r.hatch_mode === 'steps';
  return { id: r.pet_id, name: r.name, custom: true, weight: r.weight, mode: steps ? 'steps' : 'distance', steps: r.hatch_steps,
    needM: Math.round(steps ? r.hatch_steps * STRIDE_M : r.hatch_meters), maxKmh: Math.min(MAX_WALK_KMH, Math.max(3, r.max_speed_kmh)) };
}

export interface CarriedEgg { id: string; startSteps: number; petId?: string; needM?: number; maxKmh?: number; walkedM?: number }
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

/** Weighted pet pick for a newly collected egg. */
export function choosePet(roll: number, pool = petPool()): PetDef {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = roll * total;
  for (const p of pool) { r -= p.weight; if (r < 0) return p; }
  return pool[pool.length - 1] ?? BABY_DINOS[0];
}

export function newEgg(id: string, walkSteps: number, roll: number, pool?: PetDef[]): CarriedEgg {
  const pet = choosePet(roll, pool);
  return { id, startSteps: walkSteps, petId: pet.id, needM: pet.needM, maxKmh: pet.maxKmh, walkedM: 0 };
}

/** Credit one explored step to eggs whose speed limit the move respected. */
export function advanceEggs(eggs: CarriedEgg[], meters: number, elapsedMs: number): CarriedEgg[] {
  if (elapsedMs <= 0) return eggs;
  const kmh = (meters / (elapsedMs / 1000)) * 3.6;
  return eggs.map(e => e.walkedM === undefined || kmh > (e.maxKmh ?? MAX_WALK_KMH) ? e : { ...e, walkedM: e.walkedM + WALK_STEP_M });
}

export const eggNeedM = (egg: CarriedEgg) => egg.needM ?? EGG_HATCH_M;
export const eggWalkedM = (egg: CarriedEgg, walkSteps: number) => egg.walkedM ?? Math.max(0, walkSteps - egg.startSteps) * WALK_STEP_M;
export const eggReady = (egg: CarriedEgg, walkSteps: number) => eggWalkedM(egg, walkSteps) >= eggNeedM(egg);
export const babyFor = (egg: CarriedEgg): PetDef => (egg.petId && petById(egg.petId)) || BABY_DINOS[Math.floor(hash01(egg.id.length, [...egg.id].reduce((a, c) => a + c.charCodeAt(0), 0), SALT) * BABY_DINOS.length)];
