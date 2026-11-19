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

/* ==========================================================================
   4-Tier Wandering Shaman Cuisine & Health Tonic System
   기초 요리 / 일반식 / 특별식 / 건강식(보약)
   ========================================================================== */

export type ShamanCuisineCategory = 'basic' | 'regular' | 'special' | 'tonic';

export interface ShamanDishBuff {
  id: string;
  name: string;
  icon: string;
  desc: string;
  durationSec: number;
  atkBonusPct?: number;
  defBonusPct?: number;
  speedBonusPct?: number;
  regenHpPer5s?: number;
}

export interface ShamanDishPermStats {
  maxHpBonus?: number; // e.g. +10 (체력 스탯 +1)
  atkBonus?: number;   // e.g. +1
  defBonus?: number;   // e.g. +1
  carryBonus?: number; // e.g. +2kg
}

export interface ShamanDishDef {
  id: string;
  name: string;
  category: ShamanCuisineCategory;
  icon: string;
  tagline: string;
  desc: string;
  cookTimeSec: number; // 0 for instant, 45~60s for health tonics
  ingredients: Stack[];
  resultItemId?: ItemId;
  resultCount?: number;
  hungerRestore?: number;
  hpRestore?: number;
  buff?: ShamanDishBuff;
  permStats?: ShamanDishPermStats;
}

export interface CookingJob {
  id: string;
  recipeId: string;
  startedAt: number;
  readyAt: number;
  claimed?: boolean;
}

export interface ActiveFoodBuff {
  id: string;
  name: string;
  icon: string;
  desc: string;
  expiresAt: number;
  effects: {
    atkBonusPct?: number;
    defBonusPct?: number;
    speedBonusPct?: number;
    regenHpPer5s?: number;
  };
}

export const SHAMAN_CUISINE_RECIPES: ShamanDishDef[] = [
  /* ---------------- 1. 기초 요리 (창고 비축용 주식 & 훈연 보존식) ---------------- */
  {
    id: 'basic_cooked_meat',
    name: '모닥불 직화 구운 고기',
    category: 'basic',
    icon: '🍖',
    tagline: '원시 생존의 기본 주식',
    desc: '신선한 날고기를 모닥불 화로에 직화로 구워냅니다. 창고에 비축하면 부족민과 공룡이 섭취하여 굶주림을 해소합니다.',
    cookTimeSec: 0,
    ingredients: [
      { itemId: 'raw_meat', count: 1 },
      { itemId: 'branch', count: 1 },
    ],
    resultItemId: 'cooked_meat',
    resultCount: 1,
    hungerRestore: 35,
    hpRestore: 10,
  },
  {
    id: 'basic_jerky',
    name: '훈연 건조 말린 고기 (육포)',
    category: 'basic',
    icon: '🥓',
    tagline: '썩지 않는 장기 비축 보존식',
    desc: '날고기에 천연 암염과 향신초를 발라 훈연 건조한 영구 보존 육포입니다.',
    cookTimeSec: 0,
    ingredients: [
      { itemId: 'raw_meat', count: 2 },
      { itemId: 'wild_spice', count: 1 },
    ],
    resultItemId: 'jerky',
    resultCount: 2,
    hungerRestore: 28,
    hpRestore: 5,
  },
  {
    id: 'basic_dried_fruit',
    name: '모닥불 훈연 말린 과일',
    category: 'basic',
    icon: '🍎',
    tagline: '상큼한 비타민 보존식',
    desc: '야생 사과와 산딸기를 건조하여 부패하지 않게 가공한 과일 식량입니다.',
    cookTimeSec: 0,
    ingredients: [
      { itemId: 'apple', count: 1 },
      { itemId: 'berry', count: 2 },
    ],
    resultItemId: 'dried_fruit',
    resultCount: 2,
    hungerRestore: 22,
    hpRestore: 10,
  },

  /* ---------------- 2. 일반식 (체력과 허기 대폭 즉시 회복) ---------------- */
  {
    id: 'reg_bone_stew',
    name: '진한 사골 뼈 고기 스튜',
    category: 'regular',
    icon: '🍲',
    tagline: '허기 +65 · 체력 +45 즉시 대량 회복',
    desc: '사골 뼈와 신선한 고기, 향신초와 샘물을 토기에 넣고 진하게 고아낸 영양 스튜입니다.',
    cookTimeSec: 0,
    ingredients: [
      { itemId: 'bone', count: 2 },
      { itemId: 'raw_meat', count: 2 },
      { itemId: 'wild_spice', count: 1 },
      { itemId: 'spring_water', count: 1 },
    ],
    resultItemId: 'bone_stew',
    resultCount: 1,
    hungerRestore: 65,
    hpRestore: 45,
  },
  {
    id: 'reg_spice_roast',
    name: '향신료 암염 통고기 구이',
    category: 'regular',
    icon: '🥩',
    tagline: '허기 +80 · 체력 +50 즉시 대량 회복',
    desc: '암염과 향신초를 듬뿍 바른 뒤 참나무 숯불에 구워낸 최고급 포만감 일품 요리입니다.',
    cookTimeSec: 0,
    ingredients: [
      { itemId: 'raw_meat', count: 3 },
      { itemId: 'rock_salt', count: 1 },
      { itemId: 'wild_spice', count: 2 },
    ],
    resultItemId: 'spice_roast',
    resultCount: 1,
    hungerRestore: 80,
    hpRestore: 50,
  },
  {
    id: 'reg_fruit_skewers',
    name: '달콤 과일 구이 꼬치',
    category: 'regular',
    icon: '🍢',
    tagline: '허기 +55 · 체력 +40 즉시 대량 회복',
    desc: '사과, 돌배, 산딸기를 나뭇가지에 꿰어 불에 살짝 구워 과즙의 풍미를 극대화했습니다.',
    cookTimeSec: 0,
    ingredients: [
      { itemId: 'apple', count: 1 },
      { itemId: 'pear', count: 1 },
      { itemId: 'berry', count: 3 },
      { itemId: 'branch', count: 1 },
    ],
    resultItemId: 'sweet_fruit_skewers',
    resultCount: 1,
    hungerRestore: 55,
    hpRestore: 40,
  },

  /* ---------------- 3. 특별식 (일정시간 20~30분 지속 특수 버프 · 중복 불가) ---------------- */
  {
    id: 'spec_dino_steak',
    name: '포식자의 티라노 스테이크',
    category: 'special',
    icon: '🦖',
    tagline: '20분간 공격력 +10% · 공격속도 +5% 특수 버프',
    desc: '맹수의 육질을 후추열매와 암염으로 숙성시켜 포식자의 날카로운 기운을 깨웁니다.',
    cookTimeSec: 15,
    ingredients: [
      { itemId: 'raw_meat', count: 3 },
      { itemId: 'pepper_berry', count: 2 },
      { itemId: 'rock_salt', count: 1 },
    ],
    resultItemId: 'dino_tail_steak',
    resultCount: 1,
    hungerRestore: 90,
    hpRestore: 60,
    buff: {
      id: 'predator_might',
      name: '포식자의 투지',
      icon: '🦖',
      desc: '공격력 +10% · 공격 속도 +5%',
      durationSec: 20 * 60,
      atkBonusPct: 10,
      speedBonusPct: 5,
    },
  },
  {
    id: 'spec_herb_broth',
    name: '신비 약초 영양탕',
    category: 'special',
    icon: '🌿',
    tagline: '30분간 5초당 HP+2 자동 재생 · 허기 소모 -10%',
    desc: '깊은 숲 약초와 맑은 샘물을 달여내 몸속의 독소를 몰아내고 생명력을 완만히 재생시킵니다.',
    cookTimeSec: 15,
    ingredients: [
      { itemId: 'herb', count: 4 },
      { itemId: 'spring_water', count: 2 },
      { itemId: 'bone', count: 1 },
      { itemId: 'wild_spice', count: 1 },
    ],
    resultItemId: 'bone_stew',
    resultCount: 1,
    hungerRestore: 50,
    hpRestore: 60,
    buff: {
      id: 'healing_aura',
      name: '치유의 오라',
      icon: '🌿',
      desc: '5초당 체력 +2 자동 재생 · 허기 소모 10% 둔화',
      durationSec: 30 * 60,
      regenHpPer5s: 2,
    },
  },
  {
    id: 'spec_iron_shell',
    name: '강철 거북 등껍질 탕',
    category: 'special',
    icon: '🛡️',
    tagline: '20분간 받는 피해 -10% 충격 흡수 · 방어력 +10%',
    desc: '단단한 뼈와 부싯돌, 암염을 우려내어 피부를 단단한 갑각처럼 강화합니다.',
    cookTimeSec: 15,
    ingredients: [
      { itemId: 'bone', count: 3 },
      { itemId: 'flint', count: 3 },
      { itemId: 'rock_salt', count: 1 },
      { itemId: 'spring_water', count: 1 },
    ],
    resultItemId: 'bone_stew',
    resultCount: 1,
    hungerRestore: 55,
    hpRestore: 50,
    buff: {
      id: 'iron_shell_buff',
      name: '강철 피부',
      icon: '🛡️',
      desc: '피격 피해 10% 흡수 · 방어력 +10%',
      durationSec: 20 * 60,
      defBonusPct: 10,
    },
  },
  {
    id: 'spec_fiery_steam',
    name: '용암 고추 불사조 찜',
    category: 'special',
    icon: '🌶️',
    tagline: '20분간 이동 속도 +10% · 피격 데미지 5% 반사',
    desc: '매운 후추열매를 듬뿍 넣고 쪄내어 피를 끓어오르게 하고 민첩성을 극대화합니다.',
    cookTimeSec: 15,
    ingredients: [
      { itemId: 'raw_meat', count: 2 },
      { itemId: 'pepper_berry', count: 3 },
      { itemId: 'wild_spice', count: 2 },
    ],
    resultItemId: 'spice_roast',
    resultCount: 1,
    hungerRestore: 70,
    hpRestore: 40,
    buff: {
      id: 'fiery_steam_buff',
      name: '열혈 돌격',
      icon: '🌶️',
      desc: '이동 속도 +10% · 피격 반사 5%',
      durationSec: 20 * 60,
      speedBonusPct: 10,
    },
  },

  /* ---------------- 4. 건강식 / 보약 (가마솥 1시간 푹 고아내기 → 영구 스탯 +0.5 ~ +1 상승!) ---------------- */
  {
    id: 'tonic_dragon_soup',
    name: '태고 거수 백년 영양탕 (건강식)',
    category: 'tonic',
    icon: '🍲',
    tagline: '조리 시간 1시간 가마솥 끓이기 → 영구 최대 체력 +10 (HP 스탯 +1) 상승!',
    desc: '공룡 뼈와 신선한 고기, 깊은 숲 약초와 대지의 비취를 가마솥에 정성껏 달여낸 불로의 보약입니다. 섭취 시 최대 체력이 영구히 +10 상승합니다.',
    cookTimeSec: 3600,
    ingredients: [
      { itemId: 'bone', count: 3 },
      { itemId: 'raw_meat', count: 4 },
      { itemId: 'herb', count: 4 },
      { itemId: 'jade', count: 1 },
      { itemId: 'spring_water', count: 2 },
    ],
    hungerRestore: 50,
    hpRestore: 100,
    permStats: {
      maxHpBonus: 10, // Max HP +10 (Stat +1)
    },
  },
  {
    id: 'tonic_obsidian_marrow',
    name: '흑요석 흑호랑이 골수찜 (건강식)',
    category: 'tonic',
    icon: '🥩',
    tagline: '조리 시간 1시간 가마솥 끓이기 → 영구 공격력 +1 (ATK 스탯 +1) 상승!',
    desc: '흑요석의 고열로 흑호랑이의 뼈 골수를 진하게 우려낸 비전 건강식입니다. 근육과 신경이 영구히 강화되어 기본 타격 공격력이 +1 상승합니다.',
    cookTimeSec: 3600,
    ingredients: [
      { itemId: 'raw_meat', count: 5 },
      { itemId: 'obsidian', count: 2 },
      { itemId: 'wild_spice', count: 3 },
      { itemId: 'rock_salt', count: 2 },
    ],
    hungerRestore: 60,
    hpRestore: 80,
    permStats: {
      atkBonus: 1, // ATK +1
    },
  },
  {
    id: 'tonic_tortoise_essence',
    name: '고대 현무 등껍질 진액 (건강식)',
    category: 'tonic',
    icon: '🐢',
    tagline: '조리 시간 1시간 가마솥 끓이기 → 영구 방어력 +1 (DEF 스탯 +1) 상승!',
    desc: '고대 거북의 등껍질 뼈와 투명한 석영 결정을 달여낸 불괴의 진액입니다. 골밀도가 강철처럼 단단해져 기본 방어력이 영구히 +1 상승합니다.',
    cookTimeSec: 3600,
    ingredients: [
      { itemId: 'bone', count: 4 },
      { itemId: 'quartz', count: 2 },
      { itemId: 'herb', count: 4 },
      { itemId: 'spring_water', count: 2 },
    ],
    hungerRestore: 50,
    hpRestore: 80,
    permStats: {
      defBonus: 1, // DEF +1
    },
  },
  {
    id: 'tonic_jade_dew',
    name: '영혼의 비취 이슬 환 (건강식)',
    category: 'tonic',
    icon: '✨',
    tagline: '조리 시간 1시간 가마솥 끓이기 → 모든 스탯 +0.5 & 배낭 무게 +2kg 영구 상승!',
    desc: '대지의 영기 비취 2개와 석영, 말린 과일의 단맛을 조화시켜 빚은 최고급 신선단입니다. 체력(+5), 공격(+0.5), 방어(+0.5), 배낭 무게(+2kg)가 모두 영구 상승합니다.',
    cookTimeSec: 3600,
    ingredients: [
      { itemId: 'jade', count: 2 },
      { itemId: 'quartz', count: 2 },
      { itemId: 'dried_fruit', count: 4 },
      { itemId: 'spring_water', count: 2 },
    ],
    hungerRestore: 70,
    hpRestore: 100,
    permStats: {
      maxHpBonus: 5,
      atkBonus: 0.5,
      defBonus: 0.5,
      carryBonus: 2,
    },
  },
];

