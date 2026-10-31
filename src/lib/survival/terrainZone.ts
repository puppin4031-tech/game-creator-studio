import type { Biome } from './entities';
import { toGrid } from './geo';
import type { LatLng } from './types';

/** Real-world terrain zone sampled from map surfaces around the player. */
export type TerrainZone = 'riverside' | 'highland' | 'plains';
export const TERRAIN_ZONES: TerrainZone[] = ['riverside', 'highland', 'plains'];
export const TERRAIN_ZONE_LABEL: Record<TerrainZone, string> = { riverside: '하천가', highland: '산지', plains: '평지' };

/** Zones are stored per coarse cell so resource ratios stay stable once a place is sampled. */
export const ZONE_CELL_M = 120;
export const zoneCellKey = (p: LatLng) => {
  const { x, y } = toGrid(p);
  return `${Math.floor(x / ZONE_CELL_M)}:${Math.floor(y / ZONE_CELL_M)}`;
};

export interface SurfaceSample {
  /** Share (0..1) of probe points landing on water/waterway. */
  water: number;
  /** Share (0..1) of probe points landing on wood/forest/rock/scree. */
  rugged: number;
}

export function classifyTerrain(s: SurfaceSample): TerrainZone {
  if (s.water >= 0.12) return 'riverside';
  if (s.rugged >= 0.35) return 'highland';
  return 'plains';
}

/** Biome whose spawn table a zone leans toward. */
const ZONE_BIOMES: Record<TerrainZone, Partial<Record<Biome, number>>> = {
  riverside: { wetland: 1 },
  highland: { rocky: 0.6, forest: 0.4 },
  plains: { plains: 1 },
};
/** How strongly the real terrain overrides the procedural biome. */
export const ZONE_BLEND = 0.6;

/** Blend a spawn table's biome weights with the zone's preferred biomes. */
export function zoneWeight(table: Partial<Record<Biome, number>>, biome: Biome, zone: TerrainZone | undefined): number {
  const base = table[biome] ?? 0;
  if (!zone) return base;
  let z = 0;
  for (const [b, share] of Object.entries(ZONE_BIOMES[zone]) as [Biome, number][]) z += (table[b] ?? 0) * share;
  return base * (1 - ZONE_BLEND) + z * ZONE_BLEND;
}
