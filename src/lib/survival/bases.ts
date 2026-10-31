import type { Stack } from './types';
import type { SpriteKey } from './spriteMeta';

export interface BaseLevelDef {
  level: 1 | 2 | 3;
  name: string;
  sprite: SpriteKey;
  radiusM: number;
  /** Parallel processing slots. */
  queueSlots: number;
  /** HP regenerated per survival tick while inside. */
  regenPerTick: number;
  /** Cost to upgrade INTO this level (paid from storage). */
  cost: Stack[];
  unlocks: string;
}

export const BASE_LEVELS: Record<1 | 2 | 3, BaseLevelDef> = {
  1: {
    level: 1, name: '모닥불 야영지', sprite: 'base-campfire', radiusM: 50, queueSlots: 1, regenPerTick: 4, cost: [],
    unlocks: '석기 제작 · 요리 · 노끈',
  },
  2: {
    level: 2, name: '뼈 움막', sprite: 'base-hut', radiusM: 60, queueSlots: 2, regenPerTick: 8,
    cost: [{ itemId: 'log', count: 12 }, { itemId: 'hide', count: 4 }, { itemId: 'cordage', count: 4 }, { itemId: 'bone', count: 6 }],
    unlocks: '무두질 · 연고 · 활 · 가죽 갑옷',
  },
  3: {
    level: 3, name: '동굴 거처', sprite: 'base-cave', radiusM: 70, queueSlots: 3, regenPerTick: 12,
    cost: [{ itemId: 'log', count: 20 }, { itemId: 'clay_pot', count: 4 }, { itemId: 'leather', count: 6 }, { itemId: 'ochre', count: 4 }, { itemId: 'tusk', count: 2 }],
    unlocks: '흑요석 도구 · 털망토 · 옥 목걸이',
  },
};

/** Initial camp / relocation cost (paid from backpack). */
export const CAMP_COST: Stack[] = [{ itemId: 'branch', count: 3 }];
export const OUTPOST_COST: Stack[] = [{ itemId: 'branch', count: 6 }, { itemId: 'fiber', count: 4 }, { itemId: 'hide', count: 1 }];
