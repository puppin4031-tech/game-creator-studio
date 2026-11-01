import type { ItemId } from './items';
import type { Stack } from './types';
import { RECIPES, type Recipe } from './recipes';

/**
 * Tool-making knowledge. Players start knowing nothing: recipes stay locked
 * until the tech that teaches them is learned.
 * - inspire: learned automatically once the player has gathered enough of an item.
 * - research: learned at the base by spending materials from storage.
 */
export interface TechDef {
  id: string;
  name: string;
  desc: string;
  requires: string[];
  inspire?: { itemId: ItemId; count: number };
  research?: Stack[];
  recipes: string[];
  /** Learned only by reading a skill book dropped by park bosses. */
  bookOnly?: boolean;
}

export const TECHS: TechDef[] = [
  { id: 'knapping', name: '돌 떼기', desc: '부싯돌을 쳐서 날을 세우는 법을 깨우친다.', requires: [], inspire: { itemId: 'flint', count: 2 }, recipes: ['hand_axe'] },
  { id: 'binding', name: '끈 꼬기', desc: '섬유를 꼬아 묶는 법을 깨우친다.', requires: [], inspire: { itemId: 'fiber', count: 3 }, recipes: ['cordage', 'wooden_club'] },
  { id: 'fire', name: '불 다루기', desc: '나뭇가지를 모아 불씨를 지키는 법.', requires: [], inspire: { itemId: 'branch', count: 6 }, recipes: ['cooked_meat'] },
  { id: 'hafting', name: '자루 끼우기', desc: '돌날을 나무 자루에 묶어 창과 곡괭이를 만든다.', requires: ['knapping', 'binding'], research: [{ itemId: 'branch', count: 3 }, { itemId: 'flint', count: 2 }, { itemId: 'cordage', count: 1 }], recipes: ['flint_spear', 'stone_pickaxe'] },
  { id: 'pottery', name: '토기 굽기', desc: '흙과 점토를 반죽해 불에 굽는다.', requires: ['fire'], research: [{ itemId: 'soil', count: 3 }, { itemId: 'clay', count: 2 }], recipes: ['clay_pot'] },
  { id: 'herbalism', name: '약초학', desc: '약초를 짓이겨 상처에 바르는 법.', requires: [], inspire: { itemId: 'herb', count: 3 }, recipes: ['salve'] },
  { id: 'tanning', name: '무두질', desc: '날가죽을 송진과 연기로 질기게 만든다.', requires: ['fire', 'binding'], research: [{ itemId: 'hide', count: 2 }, { itemId: 'resin', count: 1 }], recipes: ['leather', 'sling', 'hide_armor'] },
  { id: 'bonecraft', name: '뼈 공예', desc: '뼈를 휘어 활대를 만든다.', requires: ['binding'], inspire: { itemId: 'bone', count: 4 }, recipes: ['bone_bow'] },
  { id: 'obsidian', name: '흑요석 가공', desc: '유리 같은 돌을 다루는 비법.', requires: ['hafting'], inspire: { itemId: 'obsidian', count: 1 }, recipes: ['obsidian_spear', 'obsidian_pickaxe'] },
  { id: 'furcraft', name: '털옷 짓기', desc: '두꺼운 털가죽으로 망토를 짓는다.', requires: ['tanning'], research: [{ itemId: 'hide', count: 4 }, { itemId: 'bone', count: 2 }], recipes: ['fur_cloak'] },
  { id: 'jadework', name: '옥 세공', desc: '옥을 갈아 부적을 만든다.', requires: ['obsidian'], inspire: { itemId: 'jade', count: 1 }, recipes: ['jade_amulet'] },
  { id: 'primal_strike', name: '원시 일격', desc: '짐승을 공격할 때 공격력 +30%.', requires: [], recipes: [], bookOnly: true },
  { id: 'iron_skin', name: '바위 피부', desc: '받는 피해 -2.', requires: [], recipes: [], bookOnly: true },
  { id: 'beast_mastery', name: '야수 교감', desc: '짐승 길들이기의 기초. (테이밍은 준비 중)', requires: [], recipes: [], bookOnly: true },
];

export const PRIMAL_STRIKE_MULT = 1.3;
export const IRON_SKIN_DEF = 2;

export const techById = (id: string) => TECHS.find((t) => t.id === id);

export const prerequisitesMet = (t: TechDef, known: string[]) => t.requires.every((r) => known.includes(r));

/** Techs newly learned by inspiration given lifetime gathered counts. */
export function checkInspiration(gathered: Partial<Record<ItemId, number>>, known: string[]): TechDef[] {
  const learned: TechDef[] = [];
  const k = [...known];
  // Loop so chained inspirations unlock in one pass.
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of TECHS) {
      if (k.includes(t.id) || !t.inspire || !prerequisitesMet(t, k)) continue;
      if ((gathered[t.inspire.itemId] ?? 0) >= t.inspire.count) {
        k.push(t.id);
        learned.push(t);
        changed = true;
      }
    }
  }
  return learned;
}

export const isRecipeUnlocked = (r: Recipe, known: string[]) =>
  TECHS.some((t) => known.includes(t.id) && t.recipes.includes(r.id));

export const unlockedRecipes = (known: string[]) => RECIPES.filter((r) => isRecipeUnlocked(r, known));

export const techForRecipe = (recipeId: string) => TECHS.find((t) => t.recipes.includes(recipeId));
