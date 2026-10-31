// Pure game rules for the survival prototype (no React, easy to test)
export type ItemId =
  | 'wood_branch' | 'flint' | 'clay' | 'berry' | 'log' | 'plant_fiber'
  | 'raw_meat' | 'hide' | 'bone' | 'obsidian_shard'
  | 'hand_axe' | 'stone_pickaxe' | 'wooden_club' | 'obsidian_spear';

export type EntityType = 'BRANCH_PILE' | 'FLINT_ROCK' | 'CLAY_PIT' | 'OAK_TREE' | 'OBSIDIAN_ROCK' | 'RAPTOR' | 'BOAR';

export interface ItemDef { name: string; weight: number; color: string }

export const ITEMS: Record<ItemId, ItemDef> = {
  wood_branch: { name: '나뭇가지', weight: 1, color: '#8b5a2b' },
  flint: { name: '부싯돌', weight: 2, color: '#6b7280' },
  clay: { name: '진흙', weight: 2, color: '#a0522d' },
  berry: { name: '열매', weight: 1, color: '#c0392b' },
  log: { name: '통나무', weight: 4, color: '#6d4c2f' },
  plant_fiber: { name: '식물 줄기', weight: 1, color: '#4d7c0f' },
  raw_meat: { name: '생고기', weight: 3, color: '#dc2626' },
  hide: { name: '가죽', weight: 2, color: '#b45309' },
  bone: { name: '뼈', weight: 2, color: '#e5e7eb' },
  obsidian_shard: { name: '흑요석 파편', weight: 2, color: '#1f2937' },
  hand_axe: { name: '주먹도끼', weight: 3, color: '#9ca3af' },
  stone_pickaxe: { name: '돌곡괭이', weight: 4, color: '#78716c' },
  wooden_club: { name: '나무 몽둥이', weight: 4, color: '#92400e' },
  obsidian_spear: { name: '흑요석 단창', weight: 4, color: '#111827' },
};

export interface LootEntry { itemId: ItemId; min: number; max: number; chance: number }
export interface EntityDef {
  name: string; requiredToolTier: number; hp: number; atk: number;
  isCreature: boolean; loot: LootEntry[]; color: string;
}

export const ENTITIES: Record<EntityType, EntityDef> = {
  BRANCH_PILE: { name: '나뭇가지 더미', requiredToolTier: 0, hp: 2, atk: 0, isCreature: false, color: '#8b5a2b',
    loot: [{ itemId: 'wood_branch', min: 1, max: 3, chance: 1 }, { itemId: 'plant_fiber', min: 1, max: 2, chance: 0.6 }] },
  FLINT_ROCK: { name: '부싯돌 바위', requiredToolTier: 0, hp: 3, atk: 0, isCreature: false, color: '#6b7280',
    loot: [{ itemId: 'flint', min: 1, max: 2, chance: 1 }] },
  CLAY_PIT: { name: '진흙 구덩이', requiredToolTier: 0, hp: 2, atk: 0, isCreature: false, color: '#a0522d',
    loot: [{ itemId: 'clay', min: 1, max: 3, chance: 1 }, { itemId: 'berry', min: 1, max: 2, chance: 0.4 }] },
  OAK_TREE: { name: '참나무', requiredToolTier: 1, hp: 4, atk: 0, isCreature: false, color: '#166534',
    loot: [{ itemId: 'log', min: 1, max: 2, chance: 1 }, { itemId: 'plant_fiber', min: 1, max: 2, chance: 0.8 }] },
  OBSIDIAN_ROCK: { name: '흑요석 광맥', requiredToolTier: 2, hp: 5, atk: 0, isCreature: false, color: '#111827',
    loot: [{ itemId: 'obsidian_shard', min: 1, max: 2, chance: 1 }] },
  BOAR: { name: '멧돼지', requiredToolTier: 0, hp: 20, atk: 4, isCreature: true, color: '#78350f',
    loot: [{ itemId: 'raw_meat', min: 1, max: 2, chance: 1 }, { itemId: 'hide', min: 1, max: 1, chance: 0.7 }] },
  RAPTOR: { name: '랩터', requiredToolTier: 0, hp: 40, atk: 10, isCreature: true, color: '#15803d',
    loot: [{ itemId: 'raw_meat', min: 2, max: 3, chance: 1 }, { itemId: 'bone', min: 1, max: 2, chance: 1 }, { itemId: 'hide', min: 1, max: 2, chance: 0.8 }] },
};

export const SURVIVAL_CONFIG = {
  tickMs: 60_000,
  scanRadiusM: 100,
  interactRadiusM: 60,
  baseRadiusM: 50,
  backpackMaxWeight: 50,
  deathDropRatio: 0.3,
  bareHandHpPenalty: 5,
};

export type Quality = 'CRUDE' | 'NORMAL' | 'MASTERWORK';
export interface Stack { itemId: ItemId; count: number }

export interface GearItem {
  instanceId: string; itemId: ItemId; quality: Quality;
  atk: number; gatherTier: number; durability: number; maxDurability: number;
}

export interface Recipe {
  resultItemId: ItemId; kind: 'TOOL' | 'WEAPON';
  ingredients: Stack[]; atk: number; gatherTier: number; maxDurability: number; difficulty: number;
}

export const RECIPES: Recipe[] = [
  { resultItemId: 'hand_axe', kind: 'TOOL', ingredients: [{ itemId: 'flint', count: 2 }, { itemId: 'wood_branch', count: 1 }], atk: 5, gatherTier: 1, maxDurability: 50, difficulty: 1 },
  { resultItemId: 'stone_pickaxe', kind: 'TOOL', ingredients: [{ itemId: 'flint', count: 2 }, { itemId: 'log', count: 1 }, { itemId: 'plant_fiber', count: 2 }], atk: 6, gatherTier: 2, maxDurability: 80, difficulty: 2 },
  { resultItemId: 'wooden_club', kind: 'WEAPON', ingredients: [{ itemId: 'log', count: 2 }], atk: 8, gatherTier: 0, maxDurability: 60, difficulty: 1 },
  { resultItemId: 'obsidian_spear', kind: 'WEAPON', ingredients: [{ itemId: 'obsidian_shard', count: 2 }, { itemId: 'log', count: 1 }, { itemId: 'hide', count: 2 }], atk: 22, gatherTier: 0, maxDurability: 100, difficulty: 3 },
];

export const QUALITY_LABEL: Record<Quality, string> = { CRUDE: '조잡한', NORMAL: '일반', MASTERWORK: '명품' };

export function stackWeight(stacks: Stack[]): number {
  return stacks.reduce((s, x) => s + ITEMS[x.itemId].weight * x.count, 0);
}

export function countOf(stacks: Stack[], id: ItemId): number {
  return stacks.find((s) => s.itemId === id)?.count ?? 0;
}

export function addStacks(stacks: Stack[], add: Stack[]): Stack[] {
  const out = stacks.map((s) => ({ ...s }));
  for (const a of add) {
    const ex = out.find((s) => s.itemId === a.itemId);
    if (ex) ex.count += a.count; else out.push({ ...a });
  }
  return out.filter((s) => s.count > 0);
}

/** Adds loot to backpack until weight cap; returns accepted + rejected loot. */
export function addToBackpack(backpack: Stack[], loot: Stack[], maxWeight = SURVIVAL_CONFIG.backpackMaxWeight) {
  let weight = stackWeight(backpack);
  const accepted: Stack[] = [];
  let rejected = 0;
  for (const l of loot) {
    const w = ITEMS[l.itemId].weight;
    const fit = Math.max(0, Math.min(l.count, Math.floor((maxWeight - weight) / w)));
    if (fit > 0) { accepted.push({ itemId: l.itemId, count: fit }); weight += fit * w; }
    rejected += l.count - fit;
  }
  return { backpack: addStacks(backpack, accepted), accepted, rejected };
}

/** On death: drop ratio (rounded up) of each stack. */
export function splitDeathDrop(backpack: Stack[], ratio = SURVIVAL_CONFIG.deathDropRatio) {
  const dropped: Stack[] = [];
  const kept: Stack[] = [];
  for (const s of backpack) {
    const d = Math.ceil(s.count * ratio);
    if (d > 0) dropped.push({ itemId: s.itemId, count: d });
    if (s.count - d > 0) kept.push({ itemId: s.itemId, count: s.count - d });
  }
  return { dropped, kept };
}

export function canCraft(storage: Stack[], recipe: Recipe): boolean {
  return recipe.ingredients.every((i) => countOf(storage, i.itemId) >= i.count);
}

export type StrikeResult = 'CRIT' | 'HIT' | 'MISS';
export function qualityFromStrikes(r: StrikeResult[]): Quality {
  if (r.length >= 3 && r.every((x) => x === 'CRIT')) return 'MASTERWORK';
  if (r.filter((x) => x === 'MISS').length >= 2) return 'CRUDE';
  return 'NORMAL';
}

export function buildGear(recipe: Recipe, quality: Quality, instanceId: string): GearItem {
  const atkMul = quality === 'MASTERWORK' ? 1.3 : quality === 'CRUDE' ? 0.8 : 1;
  const maxDur = quality === 'MASTERWORK' ? Math.round(recipe.maxDurability * 1.5) : recipe.maxDurability;
  const dur = quality === 'CRUDE' ? Math.round(recipe.maxDurability * 0.4) : maxDur;
  return { instanceId, itemId: recipe.resultItemId, quality, atk: Math.round(recipe.atk * atkMul), gatherTier: recipe.gatherTier, durability: dur, maxDurability: maxDur };
}

export function rollLoot(loot: LootEntry[], rand: () => number = Math.random): Stack[] {
  const out: Stack[] = [];
  for (const l of loot) {
    if (rand() > l.chance) continue;
    out.push({ itemId: l.itemId, count: l.min + Math.floor(rand() * (l.max - l.min + 1)) });
  }
  return out;
}
