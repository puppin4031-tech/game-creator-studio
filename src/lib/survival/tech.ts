import { ITEMS, type ItemId } from './items';
import { removeStacks } from './inventory';
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
  { id: 'fire', name: '불 다루기', desc: '나뭇가지를 모아 불씨를 지키는 법.', requires: [], inspire: { itemId: 'branch', count: 6 }, recipes: ['cooked_meat', 'jerky'] },
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
  { id: 'beast_mastery', name: '야수 교감', desc: '늑대 테이밍 연구와 올가미·미끼 제작을 해금한다.', requires: [], recipes: ['taming_snare', 'beast_bait'], bookOnly: true },
  { id: 'stone_barrage', name: '돌팔매 연타', desc: '25m 안 가까운 짐승 1마리에 18 피해. 부싯돌 1 · 대기 12초.', requires: ['knapping', 'binding'], research: [{ itemId: 'flint', count: 4 }, { itemId: 'cordage', count: 2 }], recipes: [] },
  { id: 'roar', name: '포효', desc: '25m 안 일반 짐승을 20초간 진정. 우두머리 제외. 허기 1 · 대기 30초.', requires: ['primal_strike'], research: [{ itemId: 'bone', count: 4 }, { itemId: 'ancient_fang', count: 1 }], recipes: [] },
  { id: 'ember_scatter', name: '불씨 뿌리기', desc: '거점 안에서 사용. 내 주변 25m 짐승에 12 피해. 송진 1·나뭇가지 1 · 대기 20초.', requires: ['fire', 'pottery'], research: [{ itemId: 'resin', count: 3 }, { itemId: 'clay_pot', count: 1 }], recipes: [] },
  { id: 'hut_building', name: '움집', desc: '2단계 거점 발전 해금. 발전 후 배낭 용량 +10kg.', requires: ['binding', 'fire'], research: [{ itemId: 'log', count: 4 }, { itemId: 'cordage', count: 2 }], recipes: [] },
  { id: 'palisade', name: '목책', desc: '설치 후 거점 반경 +15m, 거점 안 짐승 반격 피해 -3.', requires: ['hut_building'], research: [{ itemId: 'log', count: 4 }, { itemId: 'flint', count: 2 }], recipes: [] },
  { id: 'outpost', name: '전진기지', desc: '본거지에서 150m 이상 떨어진 곳에 1개. 반경 30m 안에서 공용 창고·제작·연구.', requires: ['hut_building'], research: [{ itemId: 'hide', count: 2 }, { itemId: 'cordage', count: 2 }], recipes: [] },
  { id: 'wolf_taming', name: '늑대 길들이기', desc: '체력 절반 이하 일반 늑대: 미끼 1·올가미 1·날고기 2. 성공률 70%, 실패에도 재료 소비. 펫 1마리, 공격 +3.', requires: ['beast_mastery', 'binding'], research: [{ itemId: 'hide', count: 2 }, { itemId: 'bone', count: 2 }], recipes: [] },
  { id: 'recruitment', name: '부족원 모집', desc: '샤먼 곁 NPC 모집: 조개 10·구운 고기 2. 거점 작업 5분마다 나뭇가지 2·섬유 1.', requires: ['hut_building'], research: [{ itemId: 'cooked_meat', count: 2 }, { itemId: 'hide', count: 2 }], recipes: [] },
  { id: 'rescue', name: '포로 구출', desc: '우두머리 처치 후 NPC 구조: 연고 1·말린 고기 2. 거점 작업 5분마다 뼈 1·흙 1. 동료 총 2명.', requires: ['recruitment', 'herbalism'], research: [{ itemId: 'salve', count: 1 }, { itemId: 'cordage', count: 2 }], recipes: [] },
  { id: 'keen_eye', name: '시야 확장', desc: '안개 속 시야 반경 +15m (낮·밤 모두).', requires: ['fire'], research: [{ itemId: 'resin', count: 2 }, { itemId: 'quartz', count: 1 }], recipes: [] },
  { id: 'long_reach', name: '습득 범위 향상', desc: '채집·사냥·상호작용 반경 25m → 35m.', requires: ['hafting'], research: [{ itemId: 'branch', count: 6 }, { itemId: 'cordage', count: 2 }], recipes: [] },
  { id: 'auto_pickup', name: '자동 획득', desc: '내 주변 10m 안의 자원을 4초마다 자동으로 채집.', requires: ['long_reach'], research: [{ itemId: 'fiber', count: 6 }, { itemId: 'hide', count: 2 }, { itemId: 'bone', count: 2 }], recipes: [] },
  { id: 'pocket_1', name: '아공간 주머니 Lv.1', desc: '배낭 최대 무게 +30kg.', requires: ['tanning'], research: [{ itemId: 'leather', count: 2 }, { itemId: 'cordage', count: 3 }], recipes: [] },
  { id: 'pocket_2', name: '아공간 주머니 Lv.2', desc: '배낭 최대 무게 +60kg (Lv.1 대체).', requires: ['pocket_1'], research: [{ itemId: 'leather', count: 4 }, { itemId: 'quartz', count: 2 }, { itemId: 'ochre', count: 2 }], recipes: [] },
  { id: 'pocket_3', name: '아공간 주머니 Lv.3', desc: '배낭 최대 무게 +100kg (Lv.2 대체).', requires: ['pocket_2'], research: [{ itemId: 'prime_pelt', count: 1 }, { itemId: 'jade', count: 1 }, { itemId: 'obsidian', count: 3 }], recipes: [] },
];

export const PRIMAL_STRIKE_MULT = 1.3;
export const IRON_SKIN_DEF = 2;

export const techById = (id: string) => TECHS.find((t) => t.id === id);

/** Read one book from the accessible inventory without consuming known skills. */
export function readSkillBook(stacks: Stack[], itemId: ItemId, known: string[]): { remaining: Stack[]; tech: TechDef } | null {
  const book = ITEMS[itemId].book;
  const tech = book ? techById(book.techId) : undefined;
  if (!tech || known.includes(tech.id)) return null;
  const remaining = removeStacks(stacks, [{ itemId, count: 1 }]);
  return remaining ? { remaining, tech } : null;
}

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
