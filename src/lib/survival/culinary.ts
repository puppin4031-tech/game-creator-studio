import type { ItemId } from './items';
import type { Stack } from './types';
import { addStacks, countOf, removeStacks } from './inventory';

/** Perishable raw foods that rot into green-mold `spoiled_food` if left unpreserved. */
export const PERISHABLE_FOOD_IDS: ItemId[] = [
  'raw_meat',
  'apple',
  'pear',
  'berry',
  'coconut',
];

export interface SmokehouseBatch {
  id: string;
  inputItemId: ItemId;
  inputCount: number;
  outputItemId: 'jerky' | 'dried_fruit';
  outputCount: number;
  startedAt: number;
  readyAt: number;
}

/** 3 minutes per smoking batch so players can experience auto-smoking quickly or finish immediately. */
export const SMOKE_CURING_MS = 3 * 60_000;

/** Freshness decays over 30 minutes of unpreserved storage before spoiling 1 raw food into `spoiled_food`. */
export const FRESHNESS_SPOIL_INTERVAL_MS = 30 * 60_000;

export function isPerishableFood(itemId: ItemId): boolean {
  return PERISHABLE_FOOD_IDS.includes(itemId);
}

export function countPerishables(stacks: Stack[]): number {
  return stacks
    .filter(s => isPerishableFood(s.itemId))
    .reduce((sum, s) => sum + s.count, 0);
}

/**
 * Advances perishable food freshness across elapsed time.
 * If raw meat, apples, pears, or berries sit unpreserved past the spoil threshold,
 * a portion turns green (`spoiled_food`) and must be discarded.
 */
export function settleFoodSpoilage(
  backpack: Stack[],
  storage: Stack[],
  lastFreshnessCheckAt: number | undefined,
  now: number
): {
  backpack: Stack[];
  storage: Stack[];
  spoiledCount: number;
  nextCheckAt: number;
  freshnessPct: number;
} {
  const totalRaw = countPerishables(backpack) + countPerishables(storage);
  if (totalRaw === 0) {
    return {
      backpack,
      storage,
      spoiledCount: 0,
      nextCheckAt: now,
      freshnessPct: 100,
    };
  }
  const anchor = lastFreshnessCheckAt ?? now;
  const elapsed = Math.max(0, now - anchor);
  const cycles = Math.floor(elapsed / FRESHNESS_SPOIL_INTERVAL_MS);
  if (cycles <= 0) {
    const remPct = Math.max(
      10,
      Math.min(100, Math.round(100 - (elapsed / FRESHNESS_SPOIL_INTERVAL_MS) * 90))
    );
    return {
      backpack,
      storage,
      spoiledCount: 0,
      nextCheckAt: anchor,
      freshnessPct: remPct,
    };
  }

  let nextBag = [...backpack];
  let nextStore = [...storage];
  let spoiled = 0;
  const maxSpoil = Math.min(totalRaw, Math.max(1, Math.min(4, cycles)));

  for (let i = 0; i < maxSpoil; i++) {
    const targetInStore = nextStore.find(s => isPerishableFood(s.itemId) && s.count > 0);
    if (targetInStore) {
      nextStore = removeStacks(nextStore, [{ itemId: targetInStore.itemId, count: 1 }]) ?? nextStore;
      nextStore = addStacks(nextStore, [{ itemId: 'spoiled_food', count: 1 }]);
      spoiled++;
      continue;
    }
    const targetInBag = nextBag.find(s => isPerishableFood(s.itemId) && s.count > 0);
    if (targetInBag) {
      nextBag = removeStacks(nextBag, [{ itemId: targetInBag.itemId, count: 1 }]) ?? nextBag;
      nextBag = addStacks(nextBag, [{ itemId: 'spoiled_food', count: 1 }]);
      spoiled++;
    }
  }

  return {
    backpack: nextBag,
    storage: nextStore,
    spoiledCount: spoiled,
    nextCheckAt: now,
    freshnessPct: 85,
  };
}

export interface TavernRecipeDef {
  id: string;
  result: ItemId;
  name: string;
  desc: string;
  effectSummary: string;
  ingredients: Stack[];
  xp: number;
}

export const TAVERN_RECIPES: TavernRecipeDef[] = [
  {
    id: 'tavern_bone_stew',
    result: 'bone_stew',
    name: '진한 뼈 고기 스튜',
    desc: '사골 뼈와 날고기, 야생 향신초를 토기에 푹 끓여낸 원시 주막 대표 보양 스튜.',
    effectSummary: '허기 +55 · 체력 +30 · 부패하지 않음',
    ingredients: [
      { itemId: 'raw_meat', count: 1 },
      { itemId: 'bone', count: 1 },
      { itemId: 'wild_spice', count: 1 },
    ],
    xp: 25,
  },
  {
    id: 'tavern_spice_roast',
    result: 'spice_roast',
    name: '향신료 통고기 구이',
    desc: '날고기에 천연 암염과 야생 향신초를 문질러 참나무 불에 노릇하게 구운 일품 요리.',
    effectSummary: '허기 +65 · 체력 +35 · 부패하지 않음',
    ingredients: [
      { itemId: 'raw_meat', count: 2 },
      { itemId: 'rock_salt', count: 1 },
      { itemId: 'wild_spice', count: 1 },
    ],
    xp: 35,
  },
  {
    id: 'tavern_fruit_skewers',
    result: 'sweet_fruit_skewers',
    name: '달콤 과일 구이 꼬치',
    desc: '사과와 돌배, 산딸기를 나뭇가지에 꿰어 향신료와 함께 구워낸 향긋한 별미.',
    effectSummary: '허기 +45 · 체력 +25 · 부패하지 않음',
    ingredients: [
      { itemId: 'apple', count: 1 },
      { itemId: 'pear', count: 1 },
      { itemId: 'berry', count: 2 },
    ],
    xp: 20,
  },
  {
    id: 'tavern_dino_steak',
    result: 'dino_tail_steak',
    name: '우두머리 스테이크 정식',
    desc: '두툼한 고기에 매운 후추열매와 암염, 향신초를 아낌없이 넣은 최고급 족장 만찬.',
    effectSummary: '허기 +90 · 체력 +60 · 부패하지 않음',
    ingredients: [
      { itemId: 'raw_meat', count: 3 },
      { itemId: 'pepper_berry', count: 1 },
      { itemId: 'rock_salt', count: 1 },
    ],
    xp: 60,
  },
];

export function countSpoiledFood(backpack: Stack[], storage: Stack[]): number {
  return countOf(backpack, 'spoiled_food') + countOf(storage, 'spoiled_food');
}
