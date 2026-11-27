import {
  buildingFootprintCells,
  VILLAGE_BUILDINGS,
  type PlacedVillageBuilding,
  type VillageBuildingId,
} from '@/lib/survival/village';
import type { TerrainTileKind } from './state';

/**
 * Builds a single shared Flow Field (Dijkstra cost distance map) from every cell
 * on the (gridSize + 4) x (gridSize + 4) total map toward the goal (campfire/center).
 *
 * Walls are NOT impassable Infinity: their traversal cost scales with current HP (`1 + hp / 12`),
 * so raiders naturally path toward open gaps or the weakest wall segment!
 */
export function buildFlowField(
  totalSize: number,
  goal: { x: number; y: number },
  tileCost: (x: number, y: number) => number
): Float32Array {
  const dist = new Float32Array(totalSize * totalSize).fill(Infinity);
  const gx = Math.max(0, Math.min(totalSize - 1, Math.round(goal.x)));
  const gy = Math.max(0, Math.min(totalSize - 1, Math.round(goal.y)));
  const start = gy * totalSize + gx;
  dist[start] = 0;
  const open: number[] = [start];

  const DIRS = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, 1.414],
    [-1, 1, 1.414],
    [1, -1, 1.414],
    [-1, -1, 1.414],
  ] as const;

  while (open.length > 0) {
    open.sort((a, b) => dist[b] - dist[a]);
    const cur = open.pop()!;
    const cx = cur % totalSize;
    const cy = (cur / totalSize) | 0;
    const baseDist = dist[cur];

    for (const [dx, dy, stepMult] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= totalSize || ny >= totalSize) continue;
      const ni = ny * totalSize + nx;
      const c = tileCost(nx, ny);
      if (!Number.isFinite(c)) continue;
      const nd = baseDist + c * stepMult;
      if (nd < dist[ni]) {
        dist[ni] = nd;
        if (!open.includes(ni)) open.push(ni);
      }
    }
  }

  return dist;
}

/**
 * Picks the neighbor cell in total-grid coordinates (0 .. totalSize-1) with lowest flow cost.
 */
export function pickNextFlowCell(
  flow: Float32Array,
  totalSize: number,
  tx: number,
  ty: number
): { nx: number; ny: number } {
  const cx = Math.max(0, Math.min(totalSize - 1, Math.round(tx)));
  const cy = Math.max(0, Math.min(totalSize - 1, Math.round(ty)));
  let bestX = cx;
  let bestY = cy;
  let bestVal = flow[cy * totalSize + cx] ?? Infinity;

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= totalSize || ny >= totalSize) continue;
      const val = flow[ny * totalSize + nx];
      if (val < bestVal) {
        bestVal = val;
        bestX = nx;
        bestY = ny;
      }
    }
  }
  return { nx: bestX, ny: bestY };
}

export interface BuildingSynergyReport {
  efficiencyMult: number;
  tags: string[];
}

/**
 * Evaluates SimCity positional synergies for a building placed at (bx, by) on the inner grid.
 */
export function evaluateBuildingSynergy(
  buildingId: VillageBuildingId,
  bx: number,
  by: number,
  buildings: PlacedVillageBuilding[],
  terrain: TerrainTileKind[],
  gridSize: number
): BuildingSynergyReport {
  const def = VILLAGE_BUILDINGS[buildingId];
  const w = def?.widthTiles ?? 1;
  const h = def?.heightTiles ?? 1;
  const cx = bx + w / 2;
  const cy = by + h / 2;
  let mult = 1.0;
  const tags: string[] = [];

  // Check nearby terrain within radius 2.5
  let nearForest = 0;
  let nearRock = 0;
  let nearWater = 0;
  let onOrAdjPath = false;

  for (let ty = Math.max(0, by - 2); ty < Math.min(gridSize, by + h + 2); ty++) {
    for (let tx = Math.max(0, bx - 2); tx < Math.min(gridSize, bx + w + 2); tx++) {
      const t = terrain[ty * gridSize + tx];
      const d = Math.hypot(tx + 0.5 - cx, ty + 0.5 - cy);
      if (d <= 2.6) {
        if (t === 'forest') nearForest++;
        else if (t === 'rock') nearRock++;
        else if (t === 'water') nearWater++;
      }
      if (d <= 1.6 && t === 'path') {
        onOrAdjPath = true;
      }
    }
  }

  if (onOrAdjPath && def?.category === 'facility') {
    mult += 0.15;
    tags.push('🛣️ 오솔길 연결 (운반 속도 +60%)');
  }

  if (buildingId === 'lumber_hut') {
    if (nearForest > 0) {
      const bonus = Math.min(0.6, nearForest * 0.2);
      mult += bonus;
      tags.push(`🌲 숲 타일 ${nearForest}칸 인접 (목재 생산 +${Math.round(bonus * 100)}%)`);
    } else {
      mult *= 0.75;
      tags.push('⚠️ 주변에 숲 타일 없음 (생산 -25%)');
    }
  }

  if (buildingId === 'stone_smeltery' || buildingId === 'build_workshop') {
    if (nearRock > 0) {
      const bonus = Math.min(0.6, nearRock * 0.2);
      mult += bonus;
      tags.push(`🪨 암석 타일 ${nearRock}칸 인접 (채석·제련 +${Math.round(bonus * 100)}%)`);
    }
  }

  // Building-to-Building adjacency checks
  for (const other of buildings) {
    if (other.x === bx && other.y === by && other.buildingId === buildingId) continue;
    const oDef = VILLAGE_BUILDINGS[other.buildingId];
    const ocx = other.x + (oDef?.widthTiles ?? 1) / 2;
    const ocy = other.y + (oDef?.heightTiles ?? 1) / 2;
    const dist = Math.hypot(ocx - cx, ocy - cy);

    if (buildingId === 'smokehouse' && other.buildingId === 'primitive_storage' && dist <= 3.5) {
      mult += 0.35;
      tags.push('📦 창고 인접 (식량 부패 -50% · 즉시 보관)');
    }
    if (buildingId === 'primitive_storage' && other.buildingId === 'smokehouse' && dist <= 3.5) {
      mult += 0.2;
      tags.push('♨️ 훈제소 인접 (보존 효율 상승)');
    }
    if (
      buildingId === 'primitive_tavern' &&
      (other.buildingId === 'tribe_shelter' || other.buildingId === 'campfire') &&
      dist <= 3.8
    ) {
      mult += 0.3;
      tags.push('⛺ 쉼터·모닥불 상권 (주민 행복도·사기 +30%)');
    }
    if (
      buildingId === 'tribe_shelter' &&
      (other.buildingId === 'campfire' || other.buildingId === 'brazier') &&
      dist <= 4.0
    ) {
      mult += 0.25;
      tags.push('🔥 모닥불 온기 범위 (야간 체력 회복·온기 충족)');
    }
    if (
      (other.buildingId === 'golden_totem' || other.buildingId === 'rex_skull') &&
      dist <= 3.8 &&
      buildingId !== 'golden_totem' &&
      buildingId !== 'rex_skull'
    ) {
      mult += 0.2;
      tags.push('🗿 토템 성역 버프 (+20% 효율·방어)');
    }
  }

  if (nearWater > 0 && (buildingId === 'primitive_tavern' || buildingId === 'tribe_shelter' || buildingId === 'flower_bed')) {
    mult += 0.2;
    tags.push('💧 맑은 샘물 인접 (청결·생기 +20%)');
  }

  return { efficiencyMult: Math.round(mult * 100) / 100, tags };
}

/**
 * Returns the active influence radius (in tiles) for a building type when selected or previewed.
 */
export function getBuildingInfluenceRadius(buildingId: VillageBuildingId): {
  radius: number;
  color: string;
  label: string;
} | null {
  switch (buildingId) {
    case 'campfire':
      return { radius: 4.2, color: 'rgba(251, 146, 60, 0.35)', label: '🔥 온기·조명 반경 (야간 명중률 +25%)' };
    case 'brazier':
      return { radius: 3.4, color: 'rgba(249, 115, 22, 0.32)', label: '🔥 화로 조명·화염 반경' };
    case 'golden_totem':
    case 'rex_skull':
      return { radius: 3.8, color: 'rgba(250, 204, 21, 0.32)', label: '🗿 토템 사기·방어 오라 반경' };
    case 'smokehouse':
      return { radius: 3.5, color: 'rgba(163, 230, 53, 0.3)', label: '♨️ 창고 인접 시너지 반경' };
    case 'primitive_tavern':
      return { radius: 3.8, color: 'rgba(244, 63, 94, 0.3)', label: '🍖 쉼터 행복도 상권 반경' };
    case 'lumber_hut':
      return { radius: 2.6, color: 'rgba(34, 197, 94, 0.32)', label: '🌲 숲 타일 벌목 채집 반경' };
    case 'stone_smeltery':
    case 'build_workshop':
      return { radius: 2.6, color: 'rgba(148, 163, 184, 0.35)', label: '🪨 암석 타일 채석 반경' };
    case 'custom_intent_building':
      return { radius: 4.0, color: 'rgba(56, 189, 248, 0.32)', label: '🏹 방어 타워 사격·효과 반경' };
    default:
      return null;
  }
}

export interface InfluenceHeatmaps {
  light: Float32Array;
  defense: Float32Array;
  happiness: Float32Array;
  traffic: Float32Array;
}

export function computeVillageHeatmaps(
  gridSize: number,
  buildings: PlacedVillageBuilding[],
  terrain: TerrainTileKind[],
  trafficCounts: Float32Array
): InfluenceHeatmaps {
  const n = gridSize * gridSize;
  const light = new Float32Array(n);
  const defense = new Float32Array(n);
  const happiness = new Float32Array(n);
  const traffic = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const t = terrain[i];
    if (t === 'path') traffic[i] = Math.min(1, 0.45 + (trafficCounts[i] ?? 0) * 0.08);
    else traffic[i] = Math.min(1, (trafficCounts[i] ?? 0) * 0.08);
  }

  for (const b of buildings) {
    const def = VILLAGE_BUILDINGS[b.buildingId];
    const w = def?.widthTiles ?? 1;
    const h = def?.heightTiles ?? 1;
    const cx = b.x + w / 2;
    const cy = b.y + h / 2;

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const idx = y * gridSize + x;
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);

        // 1. Light & Warmth
        if (b.buildingId === 'campfire' && d <= 4.5) {
          light[idx] = Math.min(1, light[idx] + Math.max(0, 1 - d / 4.5));
        } else if (b.buildingId === 'brazier' && d <= 3.5) {
          light[idx] = Math.min(1, light[idx] + Math.max(0, 0.85 * (1 - d / 3.5)));
        }

        // 2. Defense coverage
        if (def?.category === 'wall' && d <= 2.2) {
          defense[idx] = Math.min(1, defense[idx] + Math.max(0, 0.65 * (1 - d / 2.2)));
        } else if (
          (b.buildingId === 'expedition_barracks' ||
            b.buildingId === 'golden_totem' ||
            b.buildingId === 'rex_skull' ||
            b.buildingId === 'custom_intent_building') &&
          d <= 4.2
        ) {
          defense[idx] = Math.min(1, defense[idx] + Math.max(0, 0.85 * (1 - d / 4.2)));
        }

        // 3. Happiness & Comfort
        if (
          (b.buildingId === 'campfire' ||
            b.buildingId === 'primitive_tavern' ||
            b.buildingId === 'tribe_shelter' ||
            b.buildingId === 'flower_bed' ||
            b.buildingId === 'golden_totem') &&
          d <= 4.0
        ) {
          happiness[idx] = Math.min(1, happiness[idx] + Math.max(0, 0.75 * (1 - d / 4.0)));
        }
      }
    }
  }

  // Occupied footprint cells lookup helper
  for (const b of buildings) {
    for (const c of buildingFootprintCells(b.buildingId, b.x, b.y)) {
      if (c.x >= 0 && c.y >= 0 && c.x < gridSize && c.y < gridSize) {
        const idx = c.y * gridSize + c.x;
        if (VILLAGE_BUILDINGS[b.buildingId]?.category === 'wall') {
          defense[idx] = 1;
        }
      }
    }
  }

  return { light, defense, happiness, traffic };
}
