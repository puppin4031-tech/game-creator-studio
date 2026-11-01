import type { SpriteKey } from './spriteMeta';

export type ItemCategory = 'material' | 'ore' | 'food' | 'processed' | 'tool' | 'weapon' | 'armor' | 'trinket';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic';

export interface ItemDef {
  name: string;
  desc: string;
  category: ItemCategory;
  rarity: Rarity;
  /** kg per unit (or per gear piece). */
  weight: number;
  sprite: SpriteKey;
  /** Edible effect. */
  food?: { hunger: number; hp: number };
  /** Medicine (non-food heal). */
  heal?: number;
  /** Gathering power: chop (trees) and mine (rocks/ores). */
  tool?: { chop: number; mine: number; power: number };
  weapon?: { atk: number; ranged?: boolean };
  armor?: { def: number };
  trinket?: { lootBonus: number; xpBonus: number };
  /** Base durability for gear (0 = indestructible). */
  durability?: number;
}

// Widen values to ItemDef (keeps literal keys for ItemId) so gear fields
// (tool/weapon/armor/trinket) are readable on any item lookup.
const def = <T extends Record<string, ItemDef>>(t: T): { [K in keyof T]: ItemDef } => t;

export const ITEMS = def({
  // ── Raw materials
  branch: { name: '나뭇가지', desc: '불쏘시개와 손잡이의 기본 재료.', category: 'material', rarity: 'common', weight: 1, sprite: 'item-branch' },
  log: { name: '통나무', desc: '움막의 기둥. 돌도끼로 베어야 얻는다.', category: 'material', rarity: 'common', weight: 4, sprite: 'item-log' },
  fiber: { name: '식물 섬유', desc: '꼬아서 끈을 만든다.', category: 'material', rarity: 'common', weight: 0.5, sprite: 'item-fiber' },
  flint: { name: '부싯돌', desc: '떼어내면 날카로운 날이 된다.', category: 'material', rarity: 'common', weight: 2, sprite: 'item-flint' },
  clay: { name: '점토', desc: '불에 구우면 단단한 토기가 된다.', category: 'material', rarity: 'common', weight: 3, sprite: 'item-clay' },
  herb: { name: '약초', desc: '상처를 다스리는 풀.', category: 'material', rarity: 'uncommon', weight: 0.5, sprite: 'item-herb' },
  bone: { name: '뼈', desc: '단단하고 가벼운 손잡이 재료.', category: 'material', rarity: 'common', weight: 1, sprite: 'item-bone' },
  hide: { name: '날가죽', desc: '무두질하면 질긴 가죽이 된다.', category: 'material', rarity: 'common', weight: 2, sprite: 'item-hide' },
  tusk: { name: '엄니', desc: '거대한 짐승의 상아. 귀한 건축 재료.', category: 'material', rarity: 'rare', weight: 5, sprite: 'item-tusk' },
  resin: { name: '송진', desc: '끈적한 접착제. 무두질과 활에 쓰인다.', category: 'material', rarity: 'uncommon', weight: 0.5, sprite: 'item-resin' },
  soil: { name: '흙', desc: '부드러운 흙. 토기와 화덕을 다지는 재료.', category: 'material', rarity: 'common', weight: 2, sprite: 'item-soil' },
  // ── Ores & gems
  obsidian: { name: '흑요석', desc: '유리처럼 깨지는 화산석. 최상급 날.', category: 'ore', rarity: 'rare', weight: 3, sprite: 'item-obsidian' },
  quartz: { name: '석영', desc: '빛을 머금은 투명한 결정.', category: 'ore', rarity: 'uncommon', weight: 2, sprite: 'item-quartz' },
  ochre: { name: '황토 안료', desc: '적철석을 빻은 붉은 안료.', category: 'ore', rarity: 'uncommon', weight: 2, sprite: 'item-ochre' },
  jade: { name: '옥', desc: '깊은 곳에서만 캐는 신비한 녹색 돌.', category: 'ore', rarity: 'epic', weight: 3, sprite: 'item-jade' },
  // ── Food
  berry: { name: '산딸기', desc: '허기 +8 · 체력 +2', category: 'food', rarity: 'common', weight: 0.5, sprite: 'item-berry', food: { hunger: 8, hp: 2 } },
  apple: { name: '사과', desc: '허기 +12 · 체력 +4', category: 'food', rarity: 'common', weight: 0.5, sprite: 'item-apple', food: { hunger: 12, hp: 4 } },
  pear: { name: '돌배', desc: '허기 +10 · 체력 +6', category: 'food', rarity: 'common', weight: 0.5, sprite: 'item-pear', food: { hunger: 10, hp: 6 } },
  raw_meat: { name: '날고기', desc: '허기 +12 · 체력 -5 (배탈 주의)', category: 'food', rarity: 'common', weight: 2, sprite: 'item-raw-meat', food: { hunger: 12, hp: -5 } },
  cooked_meat: { name: '구운 고기', desc: '허기 +35 · 체력 +10', category: 'food', rarity: 'uncommon', weight: 1.5, sprite: 'item-cooked-meat', food: { hunger: 35, hp: 10 } },
  spring_water: { name: '샘물', desc: '허기 +4 · 체력 +8', category: 'food', rarity: 'common', weight: 1, sprite: 'item-clay-pot', food: { hunger: 4, hp: 8 } },
  coconut: { name: '야자 열매', desc: '허기 +14 · 체력 +6', category: 'food', rarity: 'uncommon', weight: 1, sprite: 'item-apple', food: { hunger: 14, hp: 6 } },
  jerky: { name: '말린 고기', desc: '허기 +28 · 체력 +5', category: 'food', rarity: 'uncommon', weight: 0.5, sprite: 'item-cooked-meat', food: { hunger: 28, hp: 5 } },
  shell: { name: '조개 화폐', desc: '만물상에서 물건을 사고팔 때 쓰는 화폐.', category: 'trinket', rarity: 'common', weight: 0, sprite: 'item-quartz' },
  // ── Processed
  cordage: { name: '노끈', desc: '섬유를 꼬아 만든 튼튼한 끈.', category: 'processed', rarity: 'common', weight: 0.5, sprite: 'item-cordage' },
  leather: { name: '가죽', desc: '무두질한 질긴 가죽.', category: 'processed', rarity: 'uncommon', weight: 1.5, sprite: 'item-leather' },
  clay_pot: { name: '토기', desc: '불에 구운 저장 그릇. 동굴 거처 재료.', category: 'processed', rarity: 'uncommon', weight: 2, sprite: 'item-clay-pot' },
  salve: { name: '약초 연고', desc: '체력 +40', category: 'processed', rarity: 'rare', weight: 0.5, sprite: 'item-salve', heal: 40 },
  // ── Tools
  hand_axe: { name: '주먹도끼', desc: '나무를 벨 수 있다. 채취력 1', category: 'tool', rarity: 'common', weight: 2, sprite: 'item-hand-axe', tool: { chop: 1, mine: 0, power: 1 }, durability: 40 },
  stone_pickaxe: { name: '돌곡괭이', desc: '광석을 캘 수 있다. 채굴 1단계', category: 'tool', rarity: 'uncommon', weight: 3, sprite: 'item-stone-pickaxe', tool: { chop: 0, mine: 1, power: 1.2 }, durability: 50 },
  obsidian_pickaxe: { name: '흑요석 곡괭이', desc: '옥까지 캘 수 있다. 채굴 2단계 · 벌목 가능', category: 'tool', rarity: 'rare', weight: 3, sprite: 'item-obsidian-pickaxe', tool: { chop: 1, mine: 2, power: 1.8 }, durability: 90 },
  // ── Weapons
  wooden_club: { name: '나무 몽둥이', desc: '공격력 6', category: 'weapon', rarity: 'common', weight: 3, sprite: 'item-wooden-club', weapon: { atk: 6 }, durability: 30 },
  flint_spear: { name: '부싯돌 창', desc: '공격력 10', category: 'weapon', rarity: 'uncommon', weight: 3, sprite: 'item-flint-spear', weapon: { atk: 10 }, durability: 45 },
  sling: { name: '투석구', desc: '공격력 7 · 원거리 (첫 공격 반격 없음)', category: 'weapon', rarity: 'uncommon', weight: 1, sprite: 'item-sling', weapon: { atk: 7, ranged: true }, durability: 60 },
  bone_bow: { name: '뼈 활', desc: '공격력 12 · 원거리 (첫 공격 반격 없음)', category: 'weapon', rarity: 'rare', weight: 2, sprite: 'item-bone-bow', weapon: { atk: 12, ranged: true }, durability: 70 },
  obsidian_spear: { name: '흑요석 창', desc: '공격력 18', category: 'weapon', rarity: 'rare', weight: 3, sprite: 'item-obsidian-spear', weapon: { atk: 18 }, durability: 80 },
  // ── Armor & trinkets
  hide_armor: { name: '가죽 갑옷', desc: '방어력 3', category: 'armor', rarity: 'uncommon', weight: 4, sprite: 'item-hide-armor', armor: { def: 3 }, durability: 80 },
  fur_cloak: { name: '늑대 털망토', desc: '방어력 5', category: 'armor', rarity: 'rare', weight: 4, sprite: 'item-fur-cloak', armor: { def: 5 }, durability: 120 },
  jade_amulet: { name: '옥 목걸이', desc: '전리품 +15% · 경험치 +10%', category: 'trinket', rarity: 'epic', weight: 0.5, sprite: 'item-jade-amulet', trinket: { lootBonus: 0.15, xpBonus: 0.1 }, durability: 0 },
});

export type ItemId = keyof typeof ITEMS;

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];

export const GEAR_CATEGORIES: ItemCategory[] = ['tool', 'weapon', 'armor', 'trinket'];

export const isGearItem = (id: ItemId) => GEAR_CATEGORIES.includes(ITEMS[id].category);

export const RARITY_LABEL: Record<Rarity, string> = { common: '흔함', uncommon: '고급', rare: '희귀', epic: '전설' };
