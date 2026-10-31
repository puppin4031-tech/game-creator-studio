import type { ItemId } from './items';
import type { Stack } from './types';

export type MinigameKind = 'knap' | 'bind' | 'fire';

export const MINIGAME_LABEL: Record<MinigameKind, string> = { knap: '석기 떼기', bind: '묶기', fire: '굽기' };

export interface Recipe {
  id: string;
  result: ItemId;
  /** Units produced for stackable results (gear always yields 1). */
  count: number;
  ingredients: Stack[];
  minigame: MinigameKind;
  /** 1 (easy) .. 3 (hard). */
  difficulty: 1 | 2 | 3;
  /** Minimum base level. */
  baseLevel: 1 | 2 | 3;
  /** Real-time processing (s). 0 = instant after the minigame. */
  processSec: number;
}

export const RECIPES: Recipe[] = [
  // Level 1 — campfire
  { id: 'cordage', result: 'cordage', count: 2, ingredients: [{ itemId: 'fiber', count: 3 }], minigame: 'bind', difficulty: 1, baseLevel: 1, processSec: 0 },
  { id: 'hand_axe', result: 'hand_axe', count: 1, ingredients: [{ itemId: 'flint', count: 3 }, { itemId: 'branch', count: 1 }], minigame: 'knap', difficulty: 1, baseLevel: 1, processSec: 0 },
  { id: 'wooden_club', result: 'wooden_club', count: 1, ingredients: [{ itemId: 'branch', count: 4 }, { itemId: 'fiber', count: 2 }], minigame: 'bind', difficulty: 1, baseLevel: 1, processSec: 0 },
  { id: 'stone_pickaxe', result: 'stone_pickaxe', count: 1, ingredients: [{ itemId: 'flint', count: 4 }, { itemId: 'branch', count: 2 }, { itemId: 'cordage', count: 1 }], minigame: 'knap', difficulty: 2, baseLevel: 1, processSec: 0 },
  { id: 'flint_spear', result: 'flint_spear', count: 1, ingredients: [{ itemId: 'flint', count: 2 }, { itemId: 'branch', count: 3 }, { itemId: 'cordage', count: 1 }], minigame: 'knap', difficulty: 2, baseLevel: 1, processSec: 0 },
  { id: 'cooked_meat', result: 'cooked_meat', count: 1, ingredients: [{ itemId: 'raw_meat', count: 1 }, { itemId: 'branch', count: 1 }], minigame: 'fire', difficulty: 1, baseLevel: 1, processSec: 30 },
  { id: 'clay_pot', result: 'clay_pot', count: 1, ingredients: [{ itemId: 'clay', count: 3 }, { itemId: 'branch', count: 2 }], minigame: 'fire', difficulty: 2, baseLevel: 1, processSec: 120 },
  // Level 2 — hut
  { id: 'leather', result: 'leather', count: 1, ingredients: [{ itemId: 'hide', count: 2 }, { itemId: 'resin', count: 1 }], minigame: 'fire', difficulty: 2, baseLevel: 2, processSec: 90 },
  { id: 'salve', result: 'salve', count: 1, ingredients: [{ itemId: 'herb', count: 3 }, { itemId: 'resin', count: 1 }], minigame: 'fire', difficulty: 2, baseLevel: 2, processSec: 60 },
  { id: 'sling', result: 'sling', count: 1, ingredients: [{ itemId: 'leather', count: 1 }, { itemId: 'cordage', count: 2 }], minigame: 'bind', difficulty: 2, baseLevel: 2, processSec: 0 },
  { id: 'bone_bow', result: 'bone_bow', count: 1, ingredients: [{ itemId: 'bone', count: 4 }, { itemId: 'cordage', count: 3 }, { itemId: 'resin', count: 2 }], minigame: 'bind', difficulty: 3, baseLevel: 2, processSec: 0 },
  { id: 'hide_armor', result: 'hide_armor', count: 1, ingredients: [{ itemId: 'hide', count: 5 }, { itemId: 'cordage', count: 3 }, { itemId: 'bone', count: 2 }], minigame: 'bind', difficulty: 2, baseLevel: 2, processSec: 0 },
  // Level 3 — cave
  { id: 'obsidian_spear', result: 'obsidian_spear', count: 1, ingredients: [{ itemId: 'obsidian', count: 3 }, { itemId: 'branch', count: 2 }, { itemId: 'leather', count: 1 }], minigame: 'knap', difficulty: 3, baseLevel: 3, processSec: 0 },
  { id: 'obsidian_pickaxe', result: 'obsidian_pickaxe', count: 1, ingredients: [{ itemId: 'obsidian', count: 4 }, { itemId: 'bone', count: 2 }, { itemId: 'leather', count: 2 }], minigame: 'knap', difficulty: 3, baseLevel: 3, processSec: 0 },
  { id: 'fur_cloak', result: 'fur_cloak', count: 1, ingredients: [{ itemId: 'hide', count: 6 }, { itemId: 'leather', count: 2 }, { itemId: 'bone', count: 2 }], minigame: 'bind', difficulty: 3, baseLevel: 3, processSec: 0 },
  { id: 'jade_amulet', result: 'jade_amulet', count: 1, ingredients: [{ itemId: 'jade', count: 1 }, { itemId: 'cordage', count: 1 }, { itemId: 'quartz', count: 1 }], minigame: 'knap', difficulty: 3, baseLevel: 3, processSec: 0 },
];

export const recipeById = (id: string) => RECIPES.find((r) => r.id === id);
