import { BOSS_TYPES, CREATURES, NODES, type CreatureType, type NodeType } from './entities';
import { biomeAt, distanceM, fromGrid, hash01, pickWeighted, toGrid } from './geo';
import { zoneCellKey, zoneWeight, type TerrainZone } from './terrainZone';
import { PARK_CREATURE_MULT, SANCTUARY_RADIUS_M } from './landmarks';
import type { LatLng, WorldCreature, WorldEntity, WorldNode } from './types';

export const NODE_CELL_M = 24;
export const NODE_DENSITY = 0.75;
export const CREATURE_CELL_M = 36;
/** Creatures re-roll their position every epoch, so herds appear to roam. */
export const CREATURE_EPOCH_MS = 8 * 60_000;
export const CREATURE_DENSITY_DAY = 0.65;
export const CREATURE_DENSITY_NIGHT = 0.78;
/** Minimum separation between any two spawned creatures so mobs don't overlap or cluster too closely. */
export const MIN_CREATURE_DISTANCE_M = 20;
/** Chance that a spawned creature is accompanied by close packmates (disabled to strictly enforce >= 20m separation). */
export const PACK_CLUSTER_CHANCE = 0;
/** Creatures never spawn this close to the base edge (safe zone). */
export const SAFE_MARGIN_M = 15;
/** Chance a park creature cell hosts a boss this epoch. */
export const PARK_BOSS_CHANCE = 0.12;

export interface WorldQuery {
  center: LatLng;
  radiusM: number;
  now: number;
  isNight: boolean;
  depleted: Record<string, number>;
  safeZone?: { center: LatLng; radiusM: number } | null;
  /** Sampled real-world terrain per zone cell; absent cells use the procedural biome only. */
  terrainZones?: Record<string, TerrainZone>;
  /** Zone cells sampled as parks; creatures crowd there. */
  parkCells?: Record<string, boolean>;
  /** Shaman sanctuary centers; creatures never spawn within SANCTUARY_RADIUS_M. */
  sanctuaries?: LatLng[];
  /** Current player level for tier-based node/resource unlocks */
  playerLevel?: number;
}

export const creatureEpoch = (now: number) => Math.floor(now / CREATURE_EPOCH_MS);

export function isNodeAvailable(id: string, type: NodeType, depleted: Record<string, number>, now: number) {
  const at = depleted[id];
  return !at || now >= at + NODES[type].respawnMin * 60_000;
}

export function generateNodes(q: WorldQuery): WorldNode[] {
  const { x, y } = toGrid(q.center);
  const r = q.radiusM;
  const cx0 = Math.floor((x - r) / NODE_CELL_M);
  const cx1 = Math.floor((x + r) / NODE_CELL_M);
  const cy0 = Math.floor((y - r) / NODE_CELL_M);
  const cy1 = Math.floor((y + r) / NODE_CELL_M);
  const out: WorldNode[] = [];
  const pLv = q.playerLevel ?? 1;
  const types = (Object.keys(NODES) as NodeType[]).filter(
    (t) => ((NODES[t] as { minPlayerLevel?: number }).minPlayerLevel ?? 1) <= pLv
  );
  for (let cx = cx0; cx <= cx1; cx++) {
    for (let cy = cy0; cy <= cy1; cy++) {
      if (hash01(cx, cy, 1) > NODE_DENSITY) continue;
      const gx = (cx + 0.15 + hash01(cx, cy, 2) * 0.7) * NODE_CELL_M;
      const gy = (cy + 0.15 + hash01(cx, cy, 3) * 0.7) * NODE_CELL_M;
      const pos = fromGrid(gx, gy);
      if (distanceM(pos, q.center) > r) continue;
      const biome = biomeAt(pos);
      const type = pickWeighted(types.map((t) => [t, zoneWeight(NODES[t].biomes, biome, q.terrainZones?.[zoneCellKey(pos)])] as [NodeType, number]), hash01(cx, cy, 4));
      if (!type) continue;
      const id = `n:${cx}:${cy}`;
      if (!isNodeAvailable(id, type, q.depleted, q.now)) continue;
      out.push({ id, kind: 'node', type, lat: pos.lat, lng: pos.lng });
    }
  }
  return out;
}

export function generateCreatures(q: WorldQuery): WorldCreature[] {
  const { x, y } = toGrid(q.center);
  const r = q.radiusM;
  const epoch = creatureEpoch(q.now);
  const density = q.isNight ? CREATURE_DENSITY_NIGHT : CREATURE_DENSITY_DAY;
  const cx0 = Math.floor((x - r) / CREATURE_CELL_M);
  const cx1 = Math.floor((x + r) / CREATURE_CELL_M);
  const cy0 = Math.floor((y - r) / CREATURE_CELL_M);
  const cy1 = Math.floor((y + r) / CREATURE_CELL_M);
  const types = Object.keys(CREATURES) as CreatureType[];
  const out: WorldCreature[] = [];

  // Sort candidate cells from closest to furthest from query center so closest mobs spawn cleanly first
  const cells: { cx: number; cy: number; d2: number }[] = [];
  for (let cx = cx0; cx <= cx1; cx++) {
    for (let cy = cy0; cy <= cy1; cy++) {
      const gx = (cx + 0.5) * CREATURE_CELL_M;
      const gy = (cy + 0.5) * CREATURE_CELL_M;
      const d2 = (gx - x) * (gx - x) + (gy - y) * (gy - y);
      cells.push({ cx, cy, d2 });
    }
  }
  cells.sort((a, b) => a.d2 - b.d2 || (a.cx * 10000 + a.cy) - (b.cx * 10000 + b.cy));

  for (const { cx, cy } of cells) {
    const gx = (cx + 0.1 + hash01(cx, cy, epoch, 8) * 0.8) * CREATURE_CELL_M;
    const gy = (cy + 0.1 + hash01(cx, cy, epoch, 9) * 0.8) * CREATURE_CELL_M;
    const pos = fromGrid(gx, gy);
    const inPark = !!q.parkCells?.[zoneCellKey(pos)];
    if (hash01(cx, cy, epoch, 7) > (inPark ? Math.min(0.95, density * PARK_CREATURE_MULT) : density)) continue;
    if (distanceM(pos, q.center) > r) continue;
    if (q.safeZone && distanceM(pos, q.safeZone.center) < q.safeZone.radiusM + SAFE_MARGIN_M) continue;
    if (q.sanctuaries?.some((c) => distanceM(pos, c) < SANCTUARY_RADIUS_M)) continue;

    // "몹들 지금 너무 붙어있는 애들이 있어서... 20m 수준으로 떨어져있게 해줘."
    // Enforce strictly at least 20m separation between any two spawned creatures
    if (out.some((other) => distanceM(pos, other) < MIN_CREATURE_DISTANCE_M)) continue;

    const biome = biomeAt(pos);
    const pLv = q.playerLevel ?? 1;
    const isBeginner = pLv <= 1;

    const weights = types.map((t) => {
      const d = CREATURES[t];
      const bw = zoneWeight(d.biomes, biome, q.terrainZones?.[zoneCellKey(pos)]);
      let w = bw * (q.isNight ? d.nightWeight : 1);

      // 초심자의 축복/버프: 레벨1일 때 토끼(식량/가죽)와 늑대(뼈/털/길들이기) 출현 빈도 대폭 증가
      if (isBeginner) {
        if (t === 'rabbit') {
          w *= 3.5;
        } else if (t === 'wolf') {
          w *= 2.5;
        } else if (t === 'raptor' || t === 'mammoth') {
          w *= 0.35; // 초심자 구간 고위험 맹수 급사 방지
        }
      }

      return [t, w] as [CreatureType, number];
    });
    const bossRoll = hash01(cx, cy, epoch, 11);
    const type = inPark && bossRoll < PARK_BOSS_CHANCE
      ? BOSS_TYPES[Math.floor((bossRoll / PARK_BOSS_CHANCE) * BOSS_TYPES.length) % BOSS_TYPES.length]
      : pickWeighted(weights, hash01(cx, cy, epoch, 10));
    if (!type) continue;
    const id = `c:${cx}:${cy}:${epoch}`;
    if (!q.depleted[id]) {
      out.push({ id, kind: 'creature', type, lat: pos.lat, lng: pos.lng });
    }
  }
  return out;
}

/** All entities within the radius, nearest first. */
export function generateWorld(q: WorldQuery): WorldEntity[] {
  const all: WorldEntity[] = [...generateNodes(q), ...generateCreatures(q)];
  return all
    .map((e) => ({ e, d: distanceM(q.center, e) }))
    .sort((a, b) => a.d - b.d)
    .map(({ e }) => e);
}
