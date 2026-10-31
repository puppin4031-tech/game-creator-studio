import { fromGrid, hash01, toGrid } from './geo';
import type { LatLng } from './types';

export type SceneryKind = 'grass' | 'pebbles' | 'shrub';
export interface TerrainDecoration extends LatLng { id: string; kind: SceneryKind; variant: number }
const CELL_M = 16;

/** Visual-only scenery uses its own salt; it never changes harvestable world entities. */
export function terrainDecorations(sw: LatLng, ne: LatLng): TerrainDecoration[] {
  const a = toGrid(sw), b = toGrid(ne);
  const result: TerrainDecoration[] = [];
  for (let x = Math.floor(a.x / CELL_M); x <= Math.floor(b.x / CELL_M); x++) {
    for (let y = Math.floor(a.y / CELL_M); y <= Math.floor(b.y / CELL_M); y++) {
      if (result.length >= 650) return result;
      if (hash01(x, y, 701) > 0.72) continue;
      const roll = hash01(x, y, 702);
      result.push({
        ...fromGrid((x + 0.15 + hash01(x, y, 703) * 0.7) * CELL_M, (y + 0.15 + hash01(x, y, 704) * 0.7) * CELL_M),
        id: `deco:${x}:${y}`, kind: roll < 0.7 ? 'grass' : roll < 0.9 ? 'pebbles' : 'shrub',
        variant: Math.floor(hash01(x, y, 705) * 3),
      });
    }
  }
  return result;
}