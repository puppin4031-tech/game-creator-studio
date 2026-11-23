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
  /** Custom intent mechanics awarded during crafting. */
  mechanics?: string[];
  /** Material physics matrix (elasticity, durability, weather-resistance, density). */
  physics?: {
    elasticity: number;
    durability: number;
    weatherResist: number;
    density: number;
  };
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
  bitumen: { name: '천연 역청', desc: '지표면에서 솟아나는 천연 아스팔트. 100% 방수·접착제이자 화공 연료.', category: 'material', rarity: 'common', weight: 1.2, sprite: 'item-resin' },
  coal: { name: '석탄', desc: '오랜 세월 퇴적된 검은 보석. 열량 90의 고온 용광로 필수 연료.', category: 'material', rarity: 'common', weight: 1.5, sprite: 'item-coal' },
  limestone: { name: '석회석', desc: '철 제련 시 불순물을 제거하는 슬래그 촉매이자 건축 자재.', category: 'material', rarity: 'common', weight: 2, sprite: 'item-limestone' },
  sulfur: { name: '유황', desc: '화산과 동굴에서 채취하는 황색 결정. 화공 무기와 독안개 폭탄의 원료.', category: 'material', rarity: 'rare', weight: 1, sprite: 'item-sulfur' },
  // ── Ores & gems
  obsidian: { name: '흑요석', desc: '유리처럼 깨지는 화산석. 최상급 날.', category: 'ore', rarity: 'rare', weight: 1.5, sprite: 'item-obsidian' },
  quartz: { name: '석영', desc: '빛을 머금은 투명한 결정.', category: 'ore', rarity: 'uncommon', weight: 1, sprite: 'item-quartz' },
  ochre: { name: '황토 안료', desc: '적철석을 빻은 붉은 안료.', category: 'ore', rarity: 'uncommon', weight: 1, sprite: 'item-ochre' },
  jade: { name: '옥', desc: '깊은 곳에서만 캐는 신비한 녹색 돌.', category: 'ore', rarity: 'epic', weight: 1.5, sprite: 'item-jade' },
  copper_ore: { name: '구리 원석', desc: '청동기의 기초 광석. 경도 45의 유연한 금속 원석.', category: 'ore', rarity: 'common', weight: 1.8, sprite: 'item-copper-ore' },
  tin_ore: { name: '주석 원석', desc: '구리와 합금하여 단단한 청동을 만드는 은백색 희귀 광석.', category: 'ore', rarity: 'rare', weight: 1.5, sprite: 'item-tin-ore' },
  silver_ore: { name: '은광석', desc: '은은한 광택을 띤 귀금속. 권위와 신성을 높이며 부적과 세공에 쓰인다.', category: 'ore', rarity: 'rare', weight: 2, sprite: 'item-silver-ore' },
  gold_ore: { name: '사금 · 금광석', desc: '변치 않는 태양의 금속. 최상급 권위 토템과 제단 계시 촉매.', category: 'ore', rarity: 'epic', weight: 3, sprite: 'item-gold-ore' },
  magnetite: { name: '자철석', desc: '강한 자성을 띤 고순도 철광석. 경도 80. 강철 제련과 나침반 제작의 핵심.', category: 'ore', rarity: 'common', weight: 2.5, sprite: 'item-magnetite' },
  mercury: { name: '진사 · 수은', desc: '신비롭게 흐르는 액체 금속. 연금술과 암흑 의식의 극비 촉매.', category: 'ore', rarity: 'rare', weight: 3.5, sprite: 'item-quartz' },
  meteor_shard: { name: '운석 파편', desc: '밤하늘에서 떨어진 미지의 우주 광물. 오버테크 동력원.', category: 'ore', rarity: 'epic', weight: 4, sprite: 'item-meteor-shard' },
  mana_stone: { name: '고대 마력석', desc: '대지의 영맥이 응결된 보석. 마법술사/흑마술사 궁극기 촉매.', category: 'ore', rarity: 'epic', weight: 1, sprite: 'item-mana-stone' },
  // ── Food
  berry: { name: '산딸기', desc: '허기 +8 · 체력 +2', category: 'food', rarity: 'common', weight: 0.25, sprite: 'item-berry', food: { hunger: 8, hp: 2 } },
  apple: { name: '사과', desc: '허기 +12 · 체력 +4', category: 'food', rarity: 'common', weight: 0.25, sprite: 'item-apple', food: { hunger: 12, hp: 4 } },
  pear: { name: '돌배', desc: '허기 +10 · 체력 +6', category: 'food', rarity: 'common', weight: 0.25, sprite: 'item-pear', food: { hunger: 10, hp: 6 } },
  raw_meat: { name: '날고기', desc: '허기 +12 · 체력 -5 (배탈 주의)', category: 'food', rarity: 'common', weight: 1, sprite: 'item-raw-meat', food: { hunger: 12, hp: -5 } },
  cooked_meat: { name: '구운 고기', desc: '허기 +35 · 체력 +10', category: 'food', rarity: 'uncommon', weight: 0.75, sprite: 'item-cooked-meat', food: { hunger: 35, hp: 10 } },
  spring_water: { name: '샘물', desc: '허기 +4 · 체력 +8', category: 'food', rarity: 'common', weight: 0.5, sprite: 'item-clay-pot', food: { hunger: 4, hp: 8 } },
  coconut: { name: '야자 열매', desc: '허기 +14 · 체력 +6', category: 'food', rarity: 'uncommon', weight: 0.5, sprite: 'item-coconut', food: { hunger: 14, hp: 6 } },
  jerky: { name: '말린 고기', desc: '허기 +28 · 체력 +5 (훈연 보존 · 썩지 않음)', category: 'food', rarity: 'uncommon', weight: 0.25, sprite: 'item-cooked-meat', food: { hunger: 28, hp: 5 } },
  dried_fruit: { name: '말린 과일', desc: '허기 +22 · 체력 +10 (훈연 건조 · 썩지 않음)', category: 'food', rarity: 'uncommon', weight: 0.2, sprite: 'item-apple', food: { hunger: 22, hp: 10 } },
  spoiled_food: { name: '상한 음식 (초록 곰팡이)', desc: '시간이 지나 부패한 식량. 먹으면 배탈(체력 -12)이 나니 훈제소나 주막에서 폐기하세요.', category: 'food', rarity: 'common', weight: 0.25, sprite: 'item-spoiled-food', food: { hunger: 2, hp: -12 } },
  // ── Spices & Tavern Dishes (향신료 & 주막 요리)
  wild_spice: { name: '야생 향신초', desc: '숲과 약초 군락에서 얻는 향긋한 향신료. 원시 주막 요리의 핵심 재료.', category: 'material', rarity: 'uncommon', weight: 0.15, sprite: 'item-wild-spice' },
  rock_salt: { name: '암염 결정', desc: '바위 틈에서 긁어낸 천연 소금 결정. 고기 요리와 훈연 보존의 풍미를 높인다.', category: 'material', rarity: 'uncommon', weight: 0.2, sprite: 'item-rock-salt' },
  pepper_berry: { name: '매운 후추열매', desc: '입안이 얼얼해지는 붉은 향신 열매. 추위를 이기는 특제 요리에 쓰인다.', category: 'material', rarity: 'rare', weight: 0.15, sprite: 'item-pepper-berry' },
  bone_stew: { name: '진한 뼈 고기 스튜', desc: '주막 특선 스튜. 허기 +55 · 체력 +30 (썩지 않음)', category: 'food', rarity: 'rare', weight: 0.5, sprite: 'item-bone-stew', food: { hunger: 55, hp: 30 } },
  spice_roast: { name: '향신료 통고기 구이', desc: '암염과 향신초를 발라 구운 일품 고기요리. 허기 +65 · 체력 +35', category: 'food', rarity: 'rare', weight: 0.6, sprite: 'item-spice-roast', food: { hunger: 65, hp: 35 } },
  sweet_fruit_skewers: { name: '달콤 과일 구이 꼬치', desc: '사과·돌배·산딸기를 향신료와 함께 구운 별미. 허기 +45 · 체력 +25', category: 'food', rarity: 'uncommon', weight: 0.35, sprite: 'item-apple', food: { hunger: 45, hp: 25 } },
  dino_tail_steak: { name: '우두머리 스테이크 정식', desc: '매운 후추열매와 암염으로 구운 최고급 주막 요리. 허기 +90 · 체력 +60', category: 'food', rarity: 'epic', weight: 0.75, sprite: 'item-cooked-meat', food: { hunger: 90, hp: 60 } },
  shell: { name: '조개 화폐', desc: '만물상에서 물건을 사고팔 때 쓰는 화폐.', category: 'material', rarity: 'common', weight: 0, sprite: 'item-shell' },
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
  charcoal: { name: '목탄 (가공 숯)', desc: '참나무와 소나무를 밀폐 가열하여 만든 고열량 숯.', category: 'processed', rarity: 'common', weight: 0.8, sprite: 'item-charcoal' },
  copper_ingot: { name: '구리 주괴', desc: '용광로에서 제련한 순도 높은 구리 덩이.', category: 'processed', rarity: 'common', weight: 1.5, sprite: 'item-copper-ingot' },
  bronze_ingot: { name: '청동 주괴', desc: '구리와 주석을 녹여 만든 단단한 청동 합금 주괴.', category: 'processed', rarity: 'rare', weight: 2, sprite: 'item-bronze-ingot' },
  steel_ingot: { name: '강철 주괴', desc: '자철석과 석탄, 석회석을 초고온으로 제련한 최강의 강철.', category: 'processed', rarity: 'epic', weight: 2.5, sprite: 'item-steel-ingot' },
  // ── Boss trophies & rare drops
  ancient_fang: { name: '고대의 송곳니', desc: '우두머리의 송곳니. 최상급 무기 재료.', category: 'material', rarity: 'epic', weight: 0.5, sprite: 'item-tusk' },
  dino_egg: { name: '신비한 픽셀 공룡 알', desc: '정해진 거리만큼 걸은 뒤 거점에 오면 아기 펫이 태어나요.', category: 'material', rarity: 'rare', weight: 0.5, sprite: 'item-dino-egg' },
  frost_pelt: { name: '혹한의 모피', desc: '눈보라 털매머드의 두꺼운 겨울 모피.', category: 'material', rarity: 'rare', weight: 1.5, sprite: 'item-frost-pelt' },
  frost_shard: { name: '빙결석 조각', desc: '얼어붙은 돌. 제단에서 얼음 창·썰매 발명 재료.', category: 'ore', rarity: 'uncommon', weight: 1, sprite: 'item-frost-shard' },
  prime_pelt: { name: '우두머리 털가죽', desc: '두껍고 윤기 나는 최상급 가죽.', category: 'material', rarity: 'rare', weight: 1.5, sprite: 'item-hide' },
  alpha_heart: { name: '야수의 심장', desc: '허기 +30 · 체력 +30', category: 'food', rarity: 'epic', weight: 0.5, sprite: 'item-raw-meat', food: { hunger: 30, hp: 30 } },
  taming_snare: { name: '가죽 올가미', desc: '짐승을 길들일 때 쓰는 테이밍 도구.', category: 'processed', rarity: 'rare', weight: 0.5, sprite: 'item-taming-snare' },
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
  flint_spear: { name: '부싯돌 창', desc: '공격력 10 · 근접 및 투창 (사거리 20~40m · 배낭 부싯돌/돌 소모)', category: 'weapon', rarity: 'uncommon', weight: 1.5, sprite: 'item-flint-spear', weapon: { atk: 10, ranged: true }, durability: 45 },
  sling: { name: '새총·물매', desc: '공격력 7 · 원거리 투석구 (사거리 50m · 배낭 돌멩이/부싯돌 1개 소모)', category: 'weapon', rarity: 'uncommon', weight: 0.5, sprite: 'item-sling', weapon: { atk: 7, ranged: true }, durability: 60 },
  bone_bow: { name: '뼈 활', desc: '공격력 12 · 원거리 뼈 활 (평균 30m, 레벨/명품/전설 50~90m · 배낭 화살 1개 소모)', category: 'weapon', rarity: 'rare', weight: 1, sprite: 'item-bone-bow', weapon: { atk: 12, ranged: true }, durability: 70 },
  arrow: { name: '화살', desc: '활로 사냥할 때 쓰는 날카로운 화살. 배낭에 있어야 활을 쏠 수 있다 (1회 공격 시 1개 소모).', category: 'processed', rarity: 'common', weight: 0.05, sprite: 'item-arrow' },
  sling_stone: { name: '돌멩이 (탄환)', desc: '새총이나 물매로 던지는 둥근 돌멩이. 배낭에 있어야 물매를 쏠 수 있다 (1회 공격 시 1개 소모).', category: 'processed', rarity: 'common', weight: 0.05, sprite: 'item-sling-stone' },
  obsidian_spear: { name: '흑요석 창', desc: '공격력 18 · 강력한 근접 및 흑요석 투창 (사거리 20~40m · 배낭 부싯돌/돌 소모)', category: 'weapon', rarity: 'rare', weight: 1.5, sprite: 'item-obsidian-spear', weapon: { atk: 18, ranged: true }, durability: 80 },
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

export type RangedWeaponCategory = 'bow' | 'spear' | 'sling';

export function getRangedCategory(itemId: ItemId | string | undefined): RangedWeaponCategory | null {
  if (!itemId) return null;
  const id = itemId.toLowerCase();
  if (id.includes('bow')) return 'bow';
  if (id.includes('spear') || id.includes('javelin')) return 'spear';
  if (id.includes('sling')) return 'sling';
  const def = ITEMS[itemId as ItemId];
  if (def?.weapon?.ranged || def?.mechanics?.includes('RANGED_SNIPE')) {
    if (def.name.includes('활') || def.name.includes('Bow')) return 'bow';
    if (def.name.includes('창') || def.name.includes('투창')) return 'spear';
    if (def.name.includes('물매') || def.name.includes('투석')) return 'sling';
    return 'bow';
  }
  return null;
}

/** Calculates actual combat reach in meters:
 * - 활 (Bow): 평균 30m, 레벨/명품/전설 성장 시 50m ~ 최고 90m
 * - 투창 (Spear): 기본 20m ~ 레벨/명품 성장 시 40m
 * - 투석구 (Sling): 기본 50m ~ 레벨 발전 시 65m
 * - RANGED_SNIPE 특수 메커닉 보유 시 +25m 추가 보너스!
 */
export function computeRangedReach(
  weapon: { itemId: ItemId | string; quality?: string; plus?: number; mechanics?: string[] } | null | undefined,
  playerLevel: number = 1
): { category: RangedWeaponCategory | null; rangeM: number } {
  if (!weapon) return { category: null, rangeM: 4.5 };
  const cat = getRangedCategory(weapon.itemId);
  if (!cat) return { category: null, rangeM: 4.5 };

  const def = ITEMS[weapon.itemId as ItemId];
  const isMasterwork = weapon.quality === 'MASTERWORK';
  const isEpicOrLegend = def?.rarity === 'epic' || (weapon.plus ?? 0) >= 3;
  const isRare = def?.rarity === 'rare' || (weapon.plus ?? 0) >= 1;
  const hasSnipeMechanic = def?.mechanics?.includes('RANGED_SNIPE') || weapon.mechanics?.includes('RANGED_SNIPE');

  if (cat === 'sling') {
    // 투석구 (물매): 기본 50m
    const levelBonus = Math.min(15, Math.floor((playerLevel - 1) * 0.8));
    const range = Math.round(50 + levelBonus + (hasSnipeMechanic ? 25 : 0));
    return { category: 'sling', rangeM: Math.min(90, range) };
  }

  if (cat === 'spear') {
    // 투창: 20m - 40m
    let range = 20;
    range += Math.min(12, Math.floor((playerLevel - 1) * 1.2));
    if (isMasterwork) range += 4;
    if (isRare) range += 2;
    if (isEpicOrLegend) range += 4;
    if (hasSnipeMechanic) range += 25;
    return { category: 'spear', rangeM: Math.min(65, Math.max(20, Math.round(range))) };
  }

  if (cat === 'bow') {
    // 활: 평균 30m, 레벨이 오르거나 명품 무기이거나 레전드 무기 라면 50m 이정도. 발전함에 따라 90m까지!
    let range = 30;
    range += Math.floor((playerLevel - 1) * 1.8);
    if (isMasterwork) range += 10;
    if (isRare) range += 5;
    if (isEpicOrLegend) range += 15;
    if ((weapon.plus ?? 0) > 0) range += (weapon.plus ?? 0) * 4;
    if (hasSnipeMechanic) range += 25;
    return { category: 'bow', rangeM: Math.min(95, Math.max(30, Math.round(range))) };
  }

  return { category: null, rangeM: 4.5 };
}

/** Returns required ammo item ID in backpack for a ranged weapon (`arrow` for bows, `sling_stone` for slings/spears). */
export function requiredRangedAmmo(weaponId: ItemId | string | undefined): 'arrow' | 'sling_stone' | null {
  if (!weaponId) return null;
  const cat = getRangedCategory(weaponId);
  if (cat === 'bow') return 'arrow';
  if (cat === 'sling' || cat === 'spear') return 'sling_stone';
  return null;
}

/** Finds available ammo in backpack. For slings & spears, allows both sling_stone and flint! */
export function findAvailableAmmo(
  backpack: { itemId: ItemId; count: number }[],
  weaponId: ItemId | string | undefined
): { itemId: ItemId; label: string } | null {
  const cat = getRangedCategory(weaponId);
  if (!cat) return null;
  const countOfItem = (id: ItemId) => backpack.find(b => b.itemId === id)?.count ?? 0;

  if (cat === 'bow') {
    if (countOfItem('arrow') > 0) return { itemId: 'arrow', label: '화살(🏹)' };
    return null;
  }
  // For slings and throwing spears: either sling_stone or flint
  if (countOfItem('sling_stone') > 0) return { itemId: 'sling_stone', label: '돌멩이 탄환(🪨)' };
  if (countOfItem('flint') > 0) return { itemId: 'flint', label: '부싯돌(🪨)' };
  return null;
}

/** Plain-language effect line for gear, shown wherever an item appears. */
export function gearEffect(d: ItemDef | undefined): string | null {
  if (!d) return null;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  if (d.weapon) return `공격력 +${d.weapon.atk}${d.weapon.ranged ? ' · 원거리(화살/돌 소모)' : ' · 근접'}`;
  if (d.armor) return `방어력 +${d.armor.def} (받는 피해 -${d.armor.def})`;
  if (d.tool) return `채집 속도 +${d.tool.power.toFixed(1)}${d.tool.chop ? ` · 벌목 ${d.tool.chop}단계` : ''}${d.tool.mine ? ` · 채굴 ${d.tool.mine}단계` : ''}`;
  if (d.trinket) return `전리품 +${pct(d.trinket.lootBonus)} · 경험치 +${pct(d.trinket.xpBonus)}`;
  return null;
}
