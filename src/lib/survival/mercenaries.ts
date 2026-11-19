import type { Stack } from './types';
import { DEFAULT_TRIBE_CLASS, getTribeClass, type TribeClassId } from '../../data/tribeClasses';

/** Mercenary contract rules (pure). A hired mercenary runs observed expeditions instead of the player. */
export interface MercenaryContract { name: string; hiredAt: number; until: number; classId?: TribeClassId }

export const MERC_CONTRACT_MS = 24 * 60 * 60 * 1000;
export const MERC_COST: Stack[] = [{ itemId: 'raw_meat', count: 3 }, { itemId: 'hide', count: 1 }, { itemId: 'apple', count: 2 }];
const NAMES = ['거친 송곳니', '외눈 바위', '붉은 흉터', '늑대 사냥꾼', '돌주먹'];

export const mercActive = (m: MercenaryContract | null | undefined, now: number) => !!m && now < m.until;
export function hireMercenary(now: number, seed = now): MercenaryContract {
  return { name: NAMES[Math.abs(Math.floor(seed / 1000)) % NAMES.length], hiredAt: now, until: now + MERC_CONTRACT_MS };
}

/* ---------- Tribe roster (pure) ---------- */
export const TRIBE_MAX = 10;
/** Tribe members fight, gather, defend and endure at 1/6 of the player; walking players stay the stars. */
export const TRIBE_RATIO = 1 / 6;
export const TRIBE_INJURY_MS = 30 * 60 * 1000;
export const TRIBE_TREAT_COST: Stack[] = [{ itemId: 'herb', count: 2 }, { itemId: 'spring_water', count: 1 }];
export const TRIBE_TRAIN_MAX = 5;
/** Upkeep window: every hour at base, each resident eats from storage. */
export const UPKEEP_MS = 60 * 60 * 1000;

export interface TribeState { count: number; trainLevel: number; injuredUntil?: number; upkeepAt?: number; starving?: boolean; escort?: boolean; classId?: TribeClassId; classCounts?: Partial<Record<TribeClassId, number>> }
export { DEFAULT_TRIBE_CLASS, getTribeClass, type TribeClassId };

const S = (itemId: Stack['itemId'], count: number): Stack => ({ itemId, count });
/** Cost to recruit member number (current count + 1). */
export const TRIBE_HIRE_COSTS: Stack[][] = [
  [S('raw_meat', 3), S('hide', 1), S('apple', 2)],
  [S('cooked_meat', 2), S('flint', 5), S('clay', 5)],
  [S('cooked_meat', 4), S('jerky', 2), S('resin', 3), S('spring_water', 3)],
  [S('cooked_meat', 5), S('jerky', 4), S('clay_pot', 2), S('ancient_fang', 1), S('leather', 2)],
  [S('wood_mallet', 1), S('stone_maul', 1), S('frost_shard', 2), S('obsidian', 3), S('log', 5)],
  [S('jerky', 6), S('flint_hatchet', 1), S('bone_dagger', 1), S('leather', 4), S('hide', 3)],
  [S('jerky', 8), S('obsidian_axe', 1), S('bark_vest', 1), S('quartz', 3), S('ochre', 3)],
  [S('jerky', 10), S('bone_plate', 1), S('bone_charm', 1), S('prime_pelt', 2), S('tusk', 3)],
  [S('jerky', 12), S('quartz_charm', 1), S('frost_pelt', 3), S('ancient_fang', 2), S('jade', 2)],
  [S('jerky', 15), S('obsidian_axe', 2), S('bone_plate', 2), S('ancient_fang', 3), S('jade', 4)],
];
export const tribeHireCost = (count: number): Stack[] | null => count >= TRIBE_MAX ? null : TRIBE_HIRE_COSTS[count];
/** Training raises every member's ratio by +1/30 per level (1/6 → max 1/3). */
export const tribeTrainCost = (level: number): Stack[] | null => level >= TRIBE_TRAIN_MAX ? null
  : [S('cooked_meat', 2 + level * 2), S('leather', 1 + level), S('bone', 3 + level * 2)];
export const tribeRatio = (t: TribeState | null | undefined) => TRIBE_RATIO + (t?.trainLevel ?? 0) / 30 - (t?.starving ? TRIBE_RATIO / 2 : 0);
export const tribeInjured = (t: TribeState | null | undefined, now: number) => !!t?.injuredUntil && now < t.injuredUntil;

// Storage foods that satisfy tribe & pet hunger
export const EDIBLE_STORAGE_FOODS: Stack['itemId'][] = [
  'cooked_meat',
  'jerky',
  'dried_fruit',
  'bone_stew',
  'spice_roast',
  'sweet_fruit_skewers',
  'dino_tail_steak',
  'sacred_bread',
  'purify_dew',
  'raw_meat',
  'apple',
  'pear',
  'berry',
  'coconut',
];

/** Check if storage has any edible food available. */
export function hasEdibleFoodInStorage(storage: Stack[]): boolean {
  return storage.some(s => EDIBLE_STORAGE_FOODS.includes(s.itemId) && s.count > 0);
}

/**
 * Daily upkeep rate: 1~2 items per tribe member & pet per day (~1.5 items/24h).
 * Missing food marks the tribe starving (no heal, half power).
 * As long as ANY edible food (jerky, cooked meat, dried fruit, dishes, etc.) exists in storage, hunger is resolved.
 */
export function upkeepDemand(tribe: number, dinos: number, pets: number) {
  const residents = tribe + dinos + pets;
  // Per-hour rate: 1.5 units / 24h per resident
  const hourlyRate = (residents * 1.5) / 24;
  return {
    residents,
    hourlyRate,
    dailyRate: Math.round(residents * 1.5),
  };
}

/** Consume upkeep from storage based on elapsed hours. */
export function settleUpkeep(
  storage: Stack[],
  demand: ReturnType<typeof upkeepDemand> | { fruit?: number; meal?: number; raw?: number },
  hours: number
): { storage: Stack[]; starving: boolean; consumedCount: number } {
  let left = storage.map(s => ({ ...s }));
  const h = Math.min(Math.max(1, hours), 48);

  // If old-style demand was passed or new demand:
  let residents = 0;
  if ('residents' in demand) {
    residents = demand.residents;
  } else {
    residents = (demand.meal ?? 0) + (demand.raw ?? 0) + (demand.fruit ?? 0);
  }

  if (residents <= 0) {
    return { storage: left, starving: false, consumedCount: 0 };
  }

  // 1~2 food items per resident per day (1.5 average)
  // Calculate total food items needed for elapsed hours
  let needed = Math.floor((residents * 1.5 * h) / 24);
  if (needed <= 0 && h >= 16) needed = 1;

  let consumed = 0;
  // Food priority: Cooked/preserved meats -> Cooked dishes -> Dried fruits -> Fresh fruits -> Raw meats
  const PRIORITY_ORDER: Stack['itemId'][] = [
    'cooked_meat',
    'jerky',
    'bone_stew',
    'spice_roast',
    'dino_tail_steak',
    'sweet_fruit_skewers',
    'dried_fruit',
    'sacred_bread',
    'apple',
    'pear',
    'berry',
    'coconut',
    'raw_meat',
  ];

  for (const id of PRIORITY_ORDER) {
    if (needed <= 0) break;
    const st = left.find(s => s.itemId === id && s.count > 0);
    if (!st) continue;
    const take = Math.min(st.count, needed);
    st.count -= take;
    needed -= take;
    consumed += take;
  }

  left = left.filter(s => s.count > 0);

  // If there is ANY edible food remaining in storage, tribe & pets are NOT starving!
  const hasRemainingEdible = left.some(s => EDIBLE_STORAGE_FOODS.includes(s.itemId) && s.count > 0);
  const starving = needed > 0 && !hasRemainingEdible && consumed === 0;

  return { storage: left, starving, consumedCount: consumed };
}

/* ---------- Walking escort (real GPS only) ---------- */
/** A tribe member walking with the player speeds gathering and fends off beast ambushes. */
export const ESCORT_GATHER_MULT = 1.3;
export const ESCORT_BLOCK_CHANCE = 0.35;
export const escortReady = (t: TribeState | null | undefined, now: number, onExpedition: boolean) => !!t?.escort && (t.count ?? 0) > 0 && !tribeInjured(t, now) && !onExpedition;
/** Ambush damage with an escort: sometimes fully blocked, otherwise halved (tank tribe boosts block & reduction). */
export const escortAmbushDamage = (dmg: number, roll: number, classId?: TribeClassId) => {
  if (classId === 'tank') return roll < 0.6 ? 0 : Math.ceil(dmg * 0.35);
  return roll < ESCORT_BLOCK_CHANCE ? 0 : Math.ceil(dmg / 2);
};
