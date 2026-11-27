import type { TribeClassId } from '@/data/tribeClasses';
import type { ItemId } from '@/lib/survival/items';
import type { PlacedVillageBuilding, VillageState } from '@/lib/survival/village';
import { buildingAtTile, VILLAGE_BUILDINGS } from '@/lib/survival/village';
import type { ShamanClassId } from '@/lib/survival/shamanEvolution';

export type TerrainTileKind = 'grass' | 'forest' | 'rock' | 'water' | 'path';
export type HeatmapOverlayKind = 'none' | 'light' | 'defense' | 'happiness' | 'traffic';
export type SimDayPhase = 'day' | 'dusk' | 'night' | 'dawn';
export type CardinalDir = '북(N)' | '북동(NE)' | '동(E)' | '남동(SE)' | '남(S)' | '남서(SW)' | '서(W)' | '북서(NW)';

export interface SimResident {
  id: string;
  kind: 'tribe' | 'extra' | 'pet' | 'class_npc' | 'shaman';
  role: 'hauler' | 'wall_patrol' | 'archer_guard' | 'campfire_social' | 'shelter_rest' | 'class_npc';
  label: string;
  tribeClass?: TribeClassId;
  speciesId?: string;
  classNpc?: {
    id: string;
    name: string;
    role: string;
    dialogue: string;
    tapRewardDesc: string;
  };
  /** Coordinates in inner village grid (0 .. gridSize) */
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  facing: 1 | -1;
  moving: boolean;
  insideShelter: boolean;
  bubble: string | null;
  bubbleUntil: number;
  /** Hauler logistics state: carries produced items from facility to primitive_storage */
  carrying?: {
    itemId: ItemId;
    icon: string;
    label: string;
    count: number;
    fromUid: string;
  } | null;
  waitTimerSec: number;
}

export interface SimEnemy {
  id: string;
  species: 'wolf' | 'boar' | 'raptor' | 'mammoth';
  name: string;
  /** Coordinates in inner village grid space (-2 .. gridSize + 2, where -2..-1 and gridSize..gridSize+1 are outer forest) */
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  speed: number;
  facing: 1 | -1;
  attackCooldownSec: number;
  hitFlashSec: number;
  spawnDir: CardinalDir;
}

export interface SimProjectile {
  id: string;
  fromX: number;
  fromY: number;
  x: number;
  y: number;
  targetEnemyId: string;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  kind: 'arrow' | 'stone' | 'fireball' | 'lightning';
}

export interface SimFloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  ttlSec: number;
}

export interface SiegeBattleReport {
  dayNumber: number;
  timestamp: number;
  direction: CardinalDir;
  totalRaiders: number;
  defeatedRaiders: number;
  breachedWalls: { name: string; dir: CardinalDir; x: number; y: number }[];
  damagedWallsCount: number;
  totalWallDamage: number;
  repairBranchCost: number;
  lootProtectedPct: number;
  summaryTitle: string;
  summaryDetail: string;
  victory: boolean;
}

export interface VillageSimState {
  gridSize: number;
  totalSize: number;
  terrain: TerrainTileKind[];
  trafficCounts: Float32Array;
  flowField: Float32Array;
  flowDirty: boolean;
  /** Dynamic wall/building HP during night siege, keyed by placed building uid */
  buildingHpMap: Record<string, number>;
  /** Pending production output at work buildings waiting for a hauler to transport to storage */
  workOutputBuffer: Record<string, { itemId: ItemId; icon: string; label: string; count: number }>;
  /** Total resources delivered to storage by haulers during this session */
  hauledCountTotal: number;
  residents: SimResident[];
  enemies: SimEnemy[];
  projectiles: SimProjectile[];
  floats: SimFloatingText[];
  phase: SimDayPhase;
  phaseTimerSec: number;
  dayNumber: number;
  upcomingRaidDir: CardinalDir;
  activeSiegeTotalRaiders: number;
  activeSiegeDefeated: number;
  activeSiegeWallDamage: number;
  activeSiegeBreaches: { name: string; dir: CardinalDir; x: number; y: number }[];
  lastSiegeReport: SiegeBattleReport;
  needs: {
    foodPct: number;
    warmthPct: number;
    shelterPct: number;
    happinessPct: number;
  };
  blessingActiveUntil: number;
}

const terrainStorageKey = (gridSize: number) => `colonion_village_terrain_v1_${gridSize}`;

/**
 * Generates deterministic SimCity-style natural terrain (forest groves, rocky veins, a spring pond, and starter dirt paths)
 * without overlapping existing placed buildings.
 */
export function createInitialTerrain(
  gridSize: number,
  buildings: PlacedVillageBuilding[]
): TerrainTileKind[] {
  try {
    const raw = localStorage.getItem(terrainStorageKey(gridSize));
    if (raw) {
      const parsed = JSON.parse(raw) as TerrainTileKind[];
      if (Array.isArray(parsed) && parsed.length === gridSize * gridSize) {
        return parsed;
      }
    }
  } catch {}

  const arr: TerrainTileKind[] = new Array(gridSize * gridSize).fill('grass');
  const mid = Math.floor(gridSize / 2);

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const idx = y * gridSize + x;
      // Keep center 4x4 clear for campfire & starter buildings, add dirt paths around center
      const distCenter = Math.hypot(x - mid + 0.5, y - mid + 0.5);
      if (distCenter >= 1.4 && distCenter <= 2.4 && (x === mid - 1 || y === mid)) {
        arr[idx] = 'path';
        continue;
      }
      if (distCenter < 2.8) continue;

      // Deterministic hash
      const h = ((x * 73856093) ^ (y * 19349663) ^ 0x9e3779b9) >>> 0;
      const roll = h % 100;

      // Northwest & Northeast lush forest pockets
      if ((x <= 2 || x >= gridSize - 3) && y <= 4 && roll < 42) {
        arr[idx] = 'forest';
      } else if ((y >= gridSize - 3) && (x <= 3 || x >= gridSize - 3) && roll < 38) {
        // Southern rocky vein outcrops
        arr[idx] = 'rock';
      } else if (x === 1 && y === Math.floor(gridSize / 2) + 1) {
        // Natural spring water tile
        arr[idx] = 'water';
      } else if (roll < 11) {
        arr[idx] = 'forest';
      } else if (roll >= 11 && roll < 18) {
        arr[idx] = 'rock';
      }
    }
  }

  // Ensure any tile occupied by an existing building is cleared to grass/path
  for (const b of buildings) {
    const def = VILLAGE_BUILDINGS[b.buildingId];
    const w = def?.widthTiles ?? 1;
    const h = def?.heightTiles ?? 1;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const tx = b.x + dx;
        const ty = b.y + dy;
        if (tx >= 0 && ty >= 0 && tx < gridSize && ty < gridSize) {
          if (arr[ty * gridSize + tx] !== 'path') {
            arr[ty * gridSize + tx] = 'grass';
          }
        }
      }
    }
  }

  return arr;
}

export function persistTerrain(gridSize: number, terrain: TerrainTileKind[]) {
  try {
    localStorage.setItem(terrainStorageKey(gridSize), JSON.stringify(terrain));
  } catch {}
}

export function directionFromTile(x: number, y: number, gridSize: number): CardinalDir {
  const mid = gridSize / 2;
  const dx = x - mid;
  const dy = y - mid;
  if (dy < -mid * 0.35) {
    if (dx < -mid * 0.35) return '북서(NW)';
    if (dx > mid * 0.35) return '북동(NE)';
    return '북(N)';
  }
  if (dy > mid * 0.35) {
    if (dx < -mid * 0.35) return '남서(SW)';
    if (dx > mid * 0.35) return '남동(SE)';
    return '남(S)';
  }
  return dx < 0 ? '서(W)' : '동(E)';
}

export function createInitialSimState(
  vState: VillageState,
  gridSize: number,
  shamanClass?: ShamanClassId | null
): VillageSimState {
  const totalSize = gridSize + 4;
  const terrain = createInitialTerrain(gridSize, vState.buildings);
  const buildingHpMap: Record<string, number> = {};
  for (const b of vState.buildings) {
    buildingHpMap[b.uid] = b.hp ?? VILLAGE_BUILDINGS[b.buildingId]?.maxHp ?? 200;
  }

  const defaultReport: SiegeBattleReport = {
    dayNumber: 1,
    timestamp: Date.now(),
    direction: '북동(NE)',
    totalRaiders: 5,
    defeatedRaiders: 5,
    breachedWalls: [],
    damagedWallsCount: 1,
    totalWallDamage: 35,
    repairBranchCost: 0,
    lootProtectedPct: 100,
    summaryTitle: '🛡️ 첫날 밤 정찰 방어 완료 (창고 피해 0%)',
    summaryDetail:
      '북동(NE) 외곽 경계림에서 정찰 늑대 5마리가 접근했으나, 모닥불 불빛과 성벽 보초병이 격퇴했습니다. [⚔️ 밤 습격 시작] 버튼으로 언제든 실시간 방어전을 시뮬레이션할 수 있습니다.',
    victory: true,
  };

  return {
    gridSize,
    totalSize,
    terrain,
    trafficCounts: new Float32Array(gridSize * gridSize),
    flowField: new Float32Array(totalSize * totalSize).fill(0),
    flowDirty: true,
    buildingHpMap,
    workOutputBuffer: {},
    hauledCountTotal: 0,
    residents: [],
    enemies: [],
    projectiles: [],
    floats: [],
    phase: 'day',
    phaseTimerSec: 45,
    dayNumber: 1,
    upcomingRaidDir: '북동(NE)',
    activeSiegeTotalRaiders: 0,
    activeSiegeDefeated: 0,
    activeSiegeWallDamage: 0,
    activeSiegeBreaches: [],
    lastSiegeReport: defaultReport,
    needs: {
      foodPct: 90,
      warmthPct: 88,
      shelterPct: 85,
      happinessPct: 88,
    },
    blessingActiveUntil: 0,
  };
}
