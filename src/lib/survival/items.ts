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
  /** Reading teaches this tech id (consumed). */
  book?: { techId: string };
}

// Widen values to ItemDef (keeps literal keys for ItemId) so gear fields
// (tool/weapon/armor/trinket) are readable on any item lookup.
const def = <T extends Record<string, ItemDef>>(t: T): { [K in keyof T]: ItemDef } => t;

export const ITEMS = def({
  // ── Raw materials
  branch: { name: '나뭇가지', desc: '불쏘시개와 손잡이의 기본 재료.', category: 'material', rarity: 'common', weight: 0.5, sprite: 'item-branch' },
  log: { name: '통나무', desc: '움막의 기둥. 돌도끼로 베어야 얻는다.', category: 'material', rarity: 'common', weight: 2, sprite: 'item-log' },
  fiber: { name: '식물 섬유', desc: '꼬아서 끈을 만든다.', category: 'material', rarity: 'common', weight: 0.25, sprite: 'item-fiber' },
  flint: { name: '부싯돌', desc: '떼어내면 날카로운 날이 된다.', category: 'material', rarity: 'common', weight: 1, sprite: 'item-flint' },
  clay: { name: '점토', desc: '불에 구우면 단단한 토기가 된다.', category: 'material', rarity: 'common', weight: 1.5, sprite: 'item-clay' },
  herb: { name: '약초', desc: '상처를 다스리는 풀.', category: 'material', rarity: 'uncommon', weight: 0.25, sprite: 'item-herb' },
  bone: { name: '뼈', desc: '단단하고 가벼운 손잡이 재료.', category: 'material', rarity: 'common', weight: 0.5, sprite: 'item-bone' },
  hide: { name: '날가죽', desc: '무두질하면 질긴 가죽이 된다.', category: 'material', rarity: 'common', weight: 1, sprite: 'item-hide' },
  tusk: { name: '엄니', desc: '거대한 짐승의 상아. 귀한 건축 재료.', category: 'material', rarity: 'rare', weight: 2.5, sprite: 'item-tusk' },
  resin: { name: '송진', desc: '끈적한 접착제. 무두질과 활에 쓰인다.', category: 'material', rarity: 'uncommon', weight: 0.25, sprite: 'item-resin' },
  soil: { name: '흙', desc: '부드러운 흙. 토기와 화덕을 다지는 재료.', category: 'material', rarity: 'common', weight: 1, sprite: 'item-soil' },
  // ── Ores & gems
  obsidian: { name: '흑요석', desc: '유리처럼 깨지는 화산석. 최상급 날.', category: 'ore', rarity: 'rare', weight: 1.5, sprite: 'item-obsidian' },
  quartz: { name: '석영', desc: '빛을 머금은 투명한 결정.', category: 'ore', rarity: 'uncommon', weight: 1, sprite: 'item-quartz' },
  ochre: { name: '황토 안료', desc: '적철석을 빻은 붉은 안료.', category: 'ore', rarity: 'uncommon', weight: 1, sprite: 'item-ochre' },
  jade: { name: '옥', desc: '깊은 곳에서만 캐는 신비한 녹색 돌.', category: 'ore', rarity: 'epic', weight: 1.5, sprite: 'item-jade' },
  // ── Food
  berry: { name: '산딸기', desc: '허기 +8 · 체력 +2', category: 'food', rarity: 'common', weight: 0.25, sprite: 'item-berry', food: { hunger: 8, hp: 2 } },
  apple: { name: '사과', desc: '허기 +12 · 체력 +4', category: 'food', rarity: 'common', weight: 0.25, sprite: 'item-apple', food: { hunger: 12, hp: 4 } },
  pear: { name: '돌배', desc: '허기 +10 · 체력 +6', category: 'food', rarity: 'common', weight: 0.25, sprite: 'item-pear', food: { hunger: 10, hp: 6 } },
  raw_meat: { name: '날고기', desc: '허기 +12 · 체력 -5 (배탈 주의)', category: 'food', rarity: 'common', weight: 1, sprite: 'item-raw-meat', food: { hunger: 12, hp: -5 } },
  cooked_meat: { name: '구운 고기', desc: '허기 +35 · 체력 +10', category: 'food', rarity: 'uncommon', weight: 0.75, sprite: 'item-cooked-meat', food: { hunger: 35, hp: 10 } },
  spring_water: { name: '샘물', desc: '허기 +4 · 체력 +8', category: 'food', rarity: 'common', weight: 0.5, sprite: 'item-clay-pot', food: { hunger: 4, hp: 8 } },
  coconut: { name: '야자 열매', desc: '허기 +14 · 체력 +6', category: 'food', rarity: 'uncommon', weight: 0.5, sprite: 'item-apple', food: { hunger: 14, hp: 6 } },
  jerky: { name: '말린 고기', desc: '허기 +28 · 체력 +5', category: 'food', rarity: 'uncommon', weight: 0.25, sprite: 'item-cooked-meat', food: { hunger: 28, hp: 5 } },
  shell: { name: '조개 화폐', desc: '만물상에서 물건을 사고팔 때 쓰는 화폐.', category: 'material', rarity: 'common', weight: 0, sprite: 'item-quartz' },
  // ── Sanctuary gifts
  sacred_bread: { name: '생명의 떡', desc: '성소의 축복. 허기 +50 · 체력 +40', category: 'food', rarity: 'rare', weight: 0.25, sprite: 'item-cooked-meat', food: { hunger: 50, hp: 40 } },
  purify_dew: { name: '정화의 이슬', desc: '고석 틈의 이슬. 허기 +10 · 체력 +30', category: 'food', rarity: 'rare', weight: 0.25, sprite: 'item-clay-pot', food: { hunger: 10, hp: 30 } },
  sacred_essence: { name: '성스러운 정수', desc: '제사로 응결된 신성력. 훗날 신성한 발명의 재료.', category: 'material', rarity: 'epic', weight: 0.25, sprite: 'item-quartz' },
  // ── Processed
  cordage: { name: '노끈', desc: '섬유를 꼬아 만든 튼튼한 끈.', category: 'processed', rarity: 'common', weight: 0.25, sprite: 'item-cordage' },
  fur: { name: '털가죽', desc: '멧돼지·늑대에게서 드물게 얻는 두툼한 털가죽.', category: 'material', rarity: 'uncommon', weight: 1, sprite: 'item-hide' },
  leather: { name: '가죽', desc: '무두질한 질긴 가죽.', category: 'processed', rarity: 'uncommon', weight: 0.75, sprite: 'item-leather' },
  clay_pot: { name: '토기', desc: '불에 구운 저장 그릇. 동굴 거처 재료.', category: 'processed', rarity: 'uncommon', weight: 1, sprite: 'item-clay-pot' },
  salve: { name: '약초 연고', desc: '체력 +40', category: 'processed', rarity: 'rare', weight: 0.25, sprite: 'item-salve', heal: 40 },
  // ── Boss trophies & rare drops
  ancient_fang: { name: '고대의 송곳니', desc: '우두머리의 송곳니. 최상급 무기 재료.', category: 'material', rarity: 'epic', weight: 0.5, sprite: 'item-tusk' },
  dino_egg: { name: '신비한 픽셀 공룡 알', desc: '정해진 거리만큼 걸은 뒤 거점에 오면 아기 펫이 태어나요.', category: 'material', rarity: 'rare', weight: 0.5, sprite: 'item-dino-egg' },
  frost_pelt: { name: '혹한의 모피', desc: '눈보라 털매머드의 두꺼운 겨울 모피.', category: 'material', rarity: 'rare', weight: 1.5, sprite: 'item-hide' },
  frost_shard: { name: '빙결석 조각', desc: '얼어붙은 돌. 제단에서 얼음 창·썰매 발명 재료.', category: 'ore', rarity: 'uncommon', weight: 1, sprite: 'item-quartz' },
  prime_pelt: { name: '우두머리 털가죽', desc: '두껍고 윤기 나는 최상급 가죽.', category: 'material', rarity: 'rare', weight: 1.5, sprite: 'item-hide' },
  alpha_heart: { name: '야수의 심장', desc: '허기 +30 · 체력 +30', category: 'food', rarity: 'epic', weight: 0.5, sprite: 'item-raw-meat', food: { hunger: 30, hp: 30 } },
  taming_snare: { name: '가죽 올가미', desc: '짐승을 길들일 때 쓰는 테이밍 도구.', category: 'processed', rarity: 'rare', weight: 0.5, sprite: 'item-cordage' },
  beast_bait: { name: '특제 미끼', desc: '짐승을 유인하는 향긋한 미끼. 테이밍 재료.', category: 'processed', rarity: 'uncommon', weight: 0.25, sprite: 'item-cooked-meat' },
  tome_primal_strike: { name: '비전서: 원시 일격', desc: '읽으면 공격력 +30% 기술을 배운다.', category: 'processed', rarity: 'epic', weight: 0.25, sprite: 'item-leather', book: { techId: 'primal_strike' } },
  tome_iron_skin: { name: '비전서: 바위 피부', desc: '읽으면 받는 피해 -2 기술을 배운다.', category: 'processed', rarity: 'epic', weight: 0.25, sprite: 'item-leather', book: { techId: 'iron_skin' } },
  tome_beast_mastery: { name: '비전서: 야수 교감', desc: '읽으면 짐승 길들이기의 기초를 배운다.', category: 'processed', rarity: 'epic', weight: 0.25, sprite: 'item-leather', book: { techId: 'beast_mastery' } },
  // ── Tools
  hand_axe: { name: '주먹도끼', desc: '나무를 벨 수 있다. 채취력 1', category: 'tool', rarity: 'common', weight: 1, sprite: 'item-hand-axe', tool: { chop: 1, mine: 0, power: 1 }, durability: 40 },
  stone_pickaxe: { name: '돌곡괭이', desc: '광석을 캘 수 있다. 채굴 1단계', category: 'tool', rarity: 'uncommon', weight: 1.5, sprite: 'item-stone-pickaxe', tool: { chop: 0, mine: 1, power: 1.2 }, durability: 50 },
  obsidian_pickaxe: { name: '흑요석 곡괭이', desc: '옥까지 캘 수 있다. 채굴 2단계 · 벌목 가능', category: 'tool', rarity: 'rare', weight: 1.5, sprite: 'item-obsidian-pickaxe', tool: { chop: 1, mine: 2, power: 1.8 }, durability: 90 },
  wood_mallet: { name: '나무 메', desc: '몽둥이 머리로 나무를 두드려 벤다. 벌목 1단계', category: 'tool', rarity: 'common', weight: 1.5, sprite: 'item-wood-mallet', tool: { chop: 1, mine: 0, power: 0.8 }, durability: 30 },
  bone_pick: { name: '뼈 곡괭이', desc: '굵은 뼈를 묶은 곡괭이. 채굴 1단계', category: 'tool', rarity: 'common', weight: 1, sprite: 'item-bone-pick', tool: { chop: 0, mine: 1, power: 1.1 }, durability: 40 },
  flint_hatchet: { name: '부싯돌 손도끼', desc: '자루를 끼운 도끼. 벌목 1단계 · 빠름', category: 'tool', rarity: 'uncommon', weight: 1, sprite: 'item-flint-hatchet', tool: { chop: 1, mine: 0, power: 1.5 }, durability: 60 },
  digging_stick: { name: '토기 삽', desc: '점토 날 삽. 벌목·채굴 1단계', category: 'tool', rarity: 'uncommon', weight: 1.5, sprite: 'item-digging-stick', tool: { chop: 1, mine: 1, power: 1.2 }, durability: 50 },
  obsidian_axe: { name: '흑요석 도끼', desc: '벌목 2단계 · 매우 빠름', category: 'tool', rarity: 'rare', weight: 1.5, sprite: 'item-obsidian-axe', tool: { chop: 2, mine: 0, power: 2.2 }, durability: 100 },
  // ── Weapons
  bone_dagger: { name: '뼈 단검', desc: '공격력 8', category: 'weapon', rarity: 'common', weight: 0.5, sprite: 'item-bone-dagger', weapon: { atk: 8 }, durability: 40 },
  stone_maul: { name: '돌 망치', desc: '공격력 13', category: 'weapon', rarity: 'uncommon', weight: 2.5, sprite: 'item-stone-maul', weapon: { atk: 13 }, durability: 60 },
  wooden_club: { name: '나무 몽둥이', desc: '공격력 6', category: 'weapon', rarity: 'common', weight: 1.5, sprite: 'item-wooden-club', weapon: { atk: 6 }, durability: 30 },
  flint_spear: { name: '부싯돌 창', desc: '공격력 10', category: 'weapon', rarity: 'uncommon', weight: 1.5, sprite: 'item-flint-spear', weapon: { atk: 10 }, durability: 45 },
  sling: { name: '투석구', desc: '공격력 7 · 원거리 (첫 공격 반격 없음)', category: 'weapon', rarity: 'uncommon', weight: 0.5, sprite: 'item-sling', weapon: { atk: 7, ranged: true }, durability: 60 },
  bone_bow: { name: '뼈 활', desc: '공격력 12 · 원거리 (첫 공격 반격 없음)', category: 'weapon', rarity: 'rare', weight: 1, sprite: 'item-bone-bow', weapon: { atk: 12, ranged: true }, durability: 70 },
  obsidian_spear: { name: '흑요석 창', desc: '공격력 18', category: 'weapon', rarity: 'rare', weight: 1.5, sprite: 'item-obsidian-spear', weapon: { atk: 18 }, durability: 80 },
  // ── Armor & trinkets
  bark_vest: { name: '나무껍질 조끼', desc: '방어력 1', category: 'armor', rarity: 'common', weight: 1.5, sprite: 'item-bark-vest', armor: { def: 1 }, durability: 40 },
  bone_plate: { name: '뼈 흉갑', desc: '방어력 4', category: 'armor', rarity: 'rare', weight: 2.5, sprite: 'item-bone-plate', armor: { def: 4 }, durability: 100 },
  bone_charm: { name: '뼈 부적', desc: '전리품 +5% · 경험치 +5%', category: 'trinket', rarity: 'uncommon', weight: 0.25, sprite: 'item-bone-charm', trinket: { lootBonus: 0.05, xpBonus: 0.05 }, durability: 0 },
  quartz_charm: { name: '석영 부적', desc: '경험치 +12%', category: 'trinket', rarity: 'rare', weight: 0.25, sprite: 'item-quartz-charm', trinket: { lootBonus: 0, xpBonus: 0.12 }, durability: 0 },
  hide_armor: { name: '가죽 갑옷', desc: '방어력 3', category: 'armor', rarity: 'uncommon', weight: 2, sprite: 'item-hide-armor', armor: { def: 3 }, durability: 80 },
  fur_cloak: { name: '늑대 털망토', desc: '방어력 5', category: 'armor', rarity: 'rare', weight: 2, sprite: 'item-fur-cloak', armor: { def: 5 }, durability: 120 },
  jade_amulet: { name: '옥 목걸이', desc: '전리품 +15% · 경험치 +10%', category: 'trinket', rarity: 'epic', weight: 0.25, sprite: 'item-jade-amulet', trinket: { lootBonus: 0.15, xpBonus: 0.1 }, durability: 0 },
});

export type ItemId = keyof typeof ITEMS;

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];

export const GEAR_CATEGORIES: ItemCategory[] = ['tool', 'weapon', 'armor', 'trinket'];

export const isGearItem = (id: ItemId) => GEAR_CATEGORIES.includes(ITEMS[id].category);

export const RARITY_LABEL: Record<Rarity, string> = { common: '흔함', uncommon: '고급', rare: '희귀', epic: '전설' };

/** Plain-language effect line for gear, shown wherever an item appears. */
export function gearEffect(d: ItemDef | undefined): string | null {
  if (!d) return null;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  if (d.weapon) return `공격력 +${d.weapon.atk}${d.weapon.ranged ? ' · 원거리(첫 공격 반격 없음)' : ' · 근접'}`;
  if (d.armor) return `방어력 +${d.armor.def} (받는 피해 -${d.armor.def})`;
  if (d.tool) return `채집 속도 +${d.tool.power.toFixed(1)}${d.tool.chop ? ` · 벌목 ${d.tool.chop}단계` : ''}${d.tool.mine ? ` · 채굴 ${d.tool.mine}단계` : ''}`;
  if (d.trinket) return `전리품 +${pct(d.trinket.lootBonus)} · 경험치 +${pct(d.trinket.xpBonus)}`;
  return null;
}
