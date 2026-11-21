import { ITEMS, GEAR_CATEGORIES, type ItemId, type ItemCategory, type Rarity } from './items';
import { RECIPES } from './recipes';
import { fusionSpecies, type OwnedPet } from './pets';
import { abilitiesFor, abilityText } from './petAbilities';
import type { PhysicalAttributes, BuildingMechanicTag, GearMechanicTag } from './intentCrafting';
import type { GearInstance, Stack } from './types';

export interface CodexPetDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  habitat: string;
  abilitySummary?: string;
}

export interface CodexResourceDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  spriteKey?: string;
  imageUrl?: string | null;
  category: 'material' | 'ore' | 'food' | 'processed';
  rarity: Rarity;
}

export interface CodexBossDef {
  id: string;
  name: string;
  title: string;
  desc: string;
  icon: string;
  difficulty: 'normal' | 'hard' | 'nightmare';
}

export interface CodexAiInvention {
  id: string;
  name: string;
  desc: string;
  type: 'architecture' | 'armory';
  categoryLabel: string;
  physics: PhysicalAttributes;
  mechanics: (BuildingMechanicTag | GearMechanicTag)[];
  materials: Record<string, number>;
  createdAt: number;
}

export interface CodexState {
  discoveredResources: string[]; // ItemId[]
  discoveredPets: string[]; // speciesId[]
  aiInventions: CodexAiInvention[];
  defeatedBosses: string[]; // creatureId[]
  hasUnseenNew?: boolean;
}

/** Normalize legacy pet ids (baby_raptor -> terranox01, mini_triceratops -> keratupsgt, baby_stego -> stagogon85) */
export function normalizeCodexPetId(speciesId: string): string {
  return fusionSpecies(speciesId);
}

export function petAbilitySummary(speciesId: string, level = 1): string {
  const list = abilitiesFor(speciesId);
  if (!list.length) {
    if (speciesId === 'skull_dragon') return '전설의 불사룡 · 강력한 암흑 브레스와 수호 오라';
    return '고대 공룡 수호 본능';
  }
  return list.map(a => abilityText(a, level)).join(' · ');
}

/** 1. 공룡 펫 도감 마스터 데이터 (관리자 패널에 등록된 18종 + 기본 익룡 + 스컬 드래곤 전체 포함) */
export const CODEX_PETS: CodexPetDef[] = [
  { id: 'terranox01', name: '테라녹스', desc: '민첩한 이족보행 소형 랩터. 날카로운 발톱으로 적에게 치명적인 출혈을 입힙니다.', icon: '🦖', habitat: '암석 황무지' },
  { id: 'keratupsgt', name: '케라톱스', desc: '견고한 세 뿔과 목 프릴을 가진 초식룡. 부족과 족장에게 강력한 치명타 기운을 부여합니다.', icon: '🦏', habitat: '평원 지대' },
  { id: 'stagogon85', name: '스테고론', desc: '등 줄기를 따라 골판이 솟아난 스테고사우루스. 지속적인 생명력 회복 오라를 내뿜습니다.', icon: '🦕', habitat: '습지대' },
  { id: 'baby_ptera', name: '아기 프테라노돈', desc: '바람을 타고 활공하는 고대 익룡. 따뜻한 품으로 공룡 알의 부화 거리를 단축합니다.', icon: '🦅', habitat: '해안 절벽' },
  { id: 'pteronox75', name: '프테로녹스', desc: '높은 창공을 가르는 정찰 익룡. 밤낮을 가리지 않고 넓은 시야를 확보해 줍니다.', icon: '🦅', habitat: '고산 협곡' },
  { id: 'pteranox050', name: '프테라녹스', desc: '번개처럼 급강하하는 맹공 익룡. 전투 시작 시 선제 급강하 타격으로 맹수를 제압합니다.', icon: '⚡', habitat: '폭풍 절벽' },
  { id: 'carnotera92', name: '카르노테라', desc: '두 뿔이 돋아난 흉포한 육식룡. 강인한 생명력으로 족장의 최대 체력을 높여줍니다.', icon: '🐊', habitat: '붉은 협곡' },
  { id: 'archeron02', name: '아르케론', desc: '고대 심해와 늪지를 지배하는 중갑 수룡. 빠른 걸음도 알 부화 걸음으로 인정받게 돕습니다.', icon: '🐢', habitat: '안개 늪지' },
  { id: 'dracotera93', name: '드라코돈', desc: '몸에서 뜨거운 화염 증기를 뿜어내는 비룡. 족장의 직접 타격 공격력을 강화합니다.', icon: '🐲', habitat: '화산 지대' },
  { id: 'megalodi_x', name: '메가로돈', desc: '바위도 부수는 거대한 턱 힘을 지닌 태곳적 거수. 부족 전사들의 공격력을 끌어올립니다.', icon: '🦈', habitat: '고대 심연' },
  { id: 'astraterix_10', name: '아스트라테릭스', desc: '별빛을 머금은 신비로운 시조새룡. 밤 시야를 밝히고 자원 습득 반경을 넓혀줍니다.', icon: '🌠', habitat: '별빛 고원' },
  { id: 'neotera_11', name: '네오테라', desc: '예리한 감각으로 대지의 광맥을 읽는 공룡. 부족민 이동속도와 희귀 광석 발견율을 높입니다.', icon: '💎', habitat: '수정 동굴' },
  { id: 'ortenonxxi', name: '오르테론', desc: '묵직한 두개골 박치기로 대지를 울리는 공룡. 첫 타격 시 맹수를 기절시킵니다.', icon: '🔨', habitat: '바위 고원' },
  { id: 'balodon77', name: '발로돈', desc: '온몸이 둥근 철갑 비늘로 뒤덮인 중장갑 공룡. 동행하는 족장과 부족민의 피해를 줄입니다.', icon: '🛡️', habitat: '철광 산맥' },
  { id: 'faronoxtlg', name: '페로녹스', desc: '모래폭풍의 축복을 받은 사막의 수호룡. 재빠른 연속 타격으로 추가 공격을 가합니다.', icon: '✨', habitat: '태양의 사막' },
  { id: 'brakoin102', name: '브라키온', desc: '거대한 체구와 튼튼한 등을 지닌 초거대 목긴공룡. 배낭 적재 용량을 대폭 늘려줍니다.', icon: '🦕', habitat: '거목 밀림' },
  { id: 'argotx', name: '아르고사우루스', desc: '날카로운 등가시 갑옷을 두른 갑주룡. 맹수에게 받은 피해를 그대로 되돌려줍니다.', icon: '🦔', habitat: '가시 협곡' },
  { id: 'tetab1t', name: '테라비트', desc: '부지런히 숲과 광맥을 파헤치는 채집 특화 공룡. 채집 시 2배 수확 행운을 안겨줍니다.', icon: '🍀', habitat: '풍요의 숲' },
  { id: 'oriontl62', name: '오리온테라', desc: '고대 사냥꾼의 별자리를 닮은 영물. 사냥과 채집에서 희귀 전리품 획득 확률을 높입니다.', icon: '👑', habitat: '고대 유적지' },
  { id: 'skull_dragon', name: '스컬 드래곤', desc: '흑마술사의 암흑 제단에서 화석 뼈와 영혼으로 각성한 불사의 전설룡.', icon: '💀', habitat: '흑마술 성소' },
].map(p => ({ ...p, abilitySummary: petAbilitySummary(p.id, 1) }));

export function getAllCodexPets(customPetRows?: { pet_id: string; name: string }[]): CodexPetDef[] {
  const byId = new Map<string, CodexPetDef>();
  for (const p of CODEX_PETS) {
    byId.set(p.id, p);
  }
  for (const r of customPetRows ?? []) {
    const id = normalizeCodexPetId(r.pet_id);
    const existing = byId.get(id);
    if (existing) {
      byId.set(id, { ...existing, name: r.name || existing.name });
    } else {
      byId.set(id, {
        id,
        name: r.name,
        desc: `${r.name} · 관리자 스튜디오에서 등록된 고유 공룡 펫입니다.`,
        icon: '🦖',
        habitat: '미지의 서식지',
        abilitySummary: petAbilitySummary(id, 1),
      });
    }
  }
  return Array.from(byId.values());
}

const ITEM_FALLBACK_ICON: Record<string, string> = {
  branch: '🪵', log: '🪵', fiber: '🧶', flint: '🪨', clay: '🏺', herb: '🌿', bone: '🦴',
  hide: '📜', tusk: '🦷', resin: '🍯', soil: '🟫', bitumen: '🖤', coal: '⬛', limestone: '🪨',
  sulfur: '🟡', obsidian: '🗡️', quartz: '🔮', ochre: '🎨', jade: '🟢', copper_ore: '🟤',
  tin_ore: '⚪', silver_ore: '🥈', gold_ore: '🥇', magnetite: '🧲', mercury: '💧',
  meteor_shard: '☄️', mana_stone: '💠', berry: '🍓', apple: '🍎', pear: '🍐', raw_meat: '🥩',
  cooked_meat: '🍖', spring_water: '💧', coconut: '🥥', jerky: '🥓', dried_fruit: '🍇',
  wild_spice: '🌱', rock_salt: '🧂', pepper_berry: '🌶️', bone_stew: '🍲', spice_roast: '🍗',
  sweet_fruit_skewers: '🍢', dino_tail_steak: '🥩', shell: '🐚', sacred_bread: '🍞',
  purify_dew: '✨', sacred_essence: '🌟', cordage: '🪢', fur: '🧥', leather: '📜',
  clay_pot: '🏺', salve: '🧪', charcoal: '⬛', copper_ingot: '🟧', bronze_ingot: '🟨',
  steel_ingot: '⬜', ancient_fang: '🦷', dino_egg: '🥚', frost_pelt: '❄️', frost_shard: '🧊',
  prime_pelt: '🦁', alpha_heart: '❤️', taming_snare: '🪤', beast_bait: '🍖',
  tome_primal_strike: '📕', tome_iron_skin: '📘', tome_beast_mastery: '📗',
  arrow: '🏹', sling_stone: '🪨',
};

/** 2. 발견 재료·자원 도감 마스터 데이터 (저장되어 있는 모든 비장비 재료·광물·식량·가공품 전체) */
export const CODEX_RESOURCES: CodexResourceDef[] = (Object.entries(ITEMS) as [ItemId, (typeof ITEMS)[ItemId]][])
  .filter(([id, def]) => !GEAR_CATEGORIES.includes(def.category) && id !== 'spoiled_food')
  .map(([id, def]) => ({
    id,
    name: def.name,
    desc: def.desc,
    icon: ITEM_FALLBACK_ICON[id] ?? (def.category === 'ore' ? '💎' : def.category === 'food' ? '🍖' : def.category === 'processed' ? '⚒️' : '🪵'),
    spriteKey: def.sprite,
    category: def.category as 'material' | 'ore' | 'food' | 'processed',
    rarity: def.rarity,
  }));

export function getAllCodexResources(
  catalogItems?: {
    itemId: string;
    name: string;
    description: string;
    category: ItemCategory;
    rarity: Rarity;
    spriteKey?: string;
    imageUrl?: string | null;
  }[]
): CodexResourceDef[] {
  const byId = new Map<string, CodexResourceDef>();
  for (const r of CODEX_RESOURCES) {
    byId.set(r.id, r);
  }
  for (const c of catalogItems ?? []) {
    if (GEAR_CATEGORIES.includes(c.category) || c.itemId === 'spoiled_food') continue;
    const existing = byId.get(c.itemId);
    if (existing) {
      byId.set(c.itemId, {
        ...existing,
        name: c.name || existing.name,
        desc: c.description || existing.desc,
        category: c.category as 'material' | 'ore' | 'food' | 'processed',
        rarity: c.rarity || existing.rarity,
        imageUrl: c.imageUrl ?? existing.imageUrl,
      });
    } else {
      byId.set(c.itemId, {
        id: c.itemId,
        name: c.name,
        desc: c.description,
        icon: c.category === 'ore' ? '💎' : c.category === 'food' ? '🍖' : '🪵',
        spriteKey: c.spriteKey,
        imageUrl: c.imageUrl,
        category: c.category as 'material' | 'ore' | 'food' | 'processed',
        rarity: c.rarity,
      });
    }
  }
  return Array.from(byId.values());
}

/** 3. 우두머리 도감 마스터 데이터 */
export const CODEX_BOSSES: CodexBossDef[] = [
  { id: 'boss_direwolf', name: '우두머리 · 거대 늑대', title: '설원의 백은 군주', desc: '회색 늑대 무리를 통솔하는 거구의 우두머리. 날카로운 냉기 이빨로 기습합니다.', icon: '🐺', difficulty: 'hard' },
  { id: 'boss_mammoth', name: '우두머리 · 분노한 매머드', title: '대지의 거신', desc: '상아 길이가 성벽 높이에 달하는 초대형 고대 매머드. 밟는 곳마다 지진이 일어납니다.', icon: '🦣', difficulty: 'nightmare' },
  { id: 'raptor', name: '우두머리 랩터', title: '그림자 습격자', desc: '사냥꾼들을 무리지어 포위하는 잔혹하고 교활한 공룡 무리의 알파.', icon: '🦖', difficulty: 'normal' },
  { id: 'boar', name: '거대 돌진 멧돼지', title: '숲의 폭군', desc: '두꺼운 가죽과 송곳니로 바위도 들이받아 부수는 저돌적인 맹수.', icon: '🐗', difficulty: 'normal' },
  { id: 'wolf', name: '심야의 검은 늑대', title: '어둠의 사냥꾼', desc: '밤이 깊어지면 눈을 붉게 빛내며 원정대의 숨통을 노리는 맹수.', icon: '🐾', difficulty: 'normal' },
];

export interface SaveLikeForCodex {
  backpack?: Stack[];
  storage?: Stack[];
  gathered?: Partial<Record<string, number>>;
  crafted?: Partial<Record<string, number>>;
  packedItems?: string[];
  gear?: GearInstance[];
  storedGear?: GearInstance[];
  pets?: OwnedPet[];
  babyDinos?: string[];
  dinoEggs?: { id: string; petId?: string }[];
  base?: { level: number } | null;
  palisade?: boolean;
  altar?: boolean;
  smokeBatches?: { rawItemId?: string; curedItemId?: string }[];
  cookingJobs?: { outputItemId?: string }[];
  village?: {
    buildings?: {
      buildingId?: string;
      custom?: { materials?: Record<string, number> };
    }[];
  };
  codex?: Partial<CodexState>;
}

/**
 * Extracts all material IDs and pet species IDs that the user currently owns
 * OR has ever owned in the past (from backpack, storage, gathered, crafted,
 * packedItems, crafted recipe ingredients, gear ingredients, buildings, pets, babyDinos, codex).
 */
export function collectOwnedAndPastCodex(save?: SaveLikeForCodex | null): {
  discoveredResources: string[];
  discoveredPets: string[];
} {
  const resSet = new Set<string>();
  const petSet = new Set<string>();

  if (!save) {
    return { discoveredResources: [], discoveredPets: [] };
  }

  const addRes = (itemId?: string) => {
    if (!itemId || itemId === 'spoiled_food') return;
    const def = ITEMS[itemId as ItemId];
    if (def && GEAR_CATEGORIES.includes(def.category)) return;
    resSet.add(itemId);
  };

  // 1. Existing codex records
  for (const id of save.codex?.discoveredResources ?? []) addRes(id);
  for (const id of save.codex?.discoveredPets ?? []) {
    if (id) petSet.add(normalizeCodexPetId(id));
  }

  // 2. Currently owned in backpack & storage
  for (const st of save.backpack ?? []) {
    if (st && st.count > 0) addRes(st.itemId);
  }
  for (const st of save.storage ?? []) {
    if (st && st.count > 0) addRes(st.itemId);
  }

  // 3. Ongoing smokehouse / cooking batches
  for (const b of save.smokeBatches ?? []) {
    addRes(b?.rawItemId);
    addRes(b?.curedItemId);
  }
  for (const c of save.cookingJobs ?? []) {
    addRes(c?.outputItemId);
  }

  // 4. Past gathered & packed items
  for (const [id, cnt] of Object.entries(save.gathered ?? {})) {
    if ((cnt ?? 0) > 0) addRes(id);
  }
  for (const id of save.packedItems ?? []) {
    addRes(id);
  }

  // 5. Past crafted items + ingredients used to craft them
  for (const [craftedId, cnt] of Object.entries(save.crafted ?? {})) {
    if ((cnt ?? 0) <= 0) continue;
    addRes(craftedId);
    const recipe = RECIPES.find(r => r.id === craftedId || r.output.itemId === craftedId);
    if (recipe) {
      addRes(recipe.output.itemId);
      for (const c of recipe.cost) addRes(c.itemId);
    }
  }

  // 6. Owned gear (equipped/backpack/stored) implies player owned their crafting materials in the past
  for (const g of [...(save.gear ?? []), ...(save.storedGear ?? [])]) {
    if (!g?.itemId) continue;
    const recipe = RECIPES.find(r => r.output.itemId === g.itemId);
    if (recipe) {
      for (const c of recipe.cost) addRes(c.itemId);
    }
  }

  // 7. Base structures & custom village buildings
  if (save.base && save.base.level >= 1) addRes('branch');
  if (save.base && save.base.level >= 2) {
    addRes('log');
    addRes('cordage');
    addRes('fiber');
    addRes('clay');
  }
  if (save.base && save.base.level >= 3) {
    addRes('clay_pot');
    addRes('hide');
    addRes('bone');
  }
  if (save.palisade) {
    addRes('log');
    addRes('cordage');
    addRes('fiber');
  }
  if (save.altar) {
    addRes('flint');
    addRes('clay');
    addRes('quartz');
    addRes('ochre');
  }
  for (const b of save.village?.buildings ?? []) {
    for (const [matId, cnt] of Object.entries(b?.custom?.materials ?? {})) {
      if ((cnt ?? 0) > 0) addRes(matId);
    }
  }

  // 8. Currently or previously owned dinosaur pets & dino eggs
  if ((save.dinoEggs?.length ?? 0) > 0 || (save.pets?.length ?? 0) > 0 || (save.babyDinos?.length ?? 0) > 0) {
    addRes('dino_egg');
  }
  for (const p of save.pets ?? []) {
    if (p?.speciesId) petSet.add(normalizeCodexPetId(p.speciesId));
  }
  for (const id of save.babyDinos ?? []) {
    if (id) petSet.add(normalizeCodexPetId(id));
  }

  return {
    discoveredResources: Array.from(resSet),
    discoveredPets: Array.from(petSet),
  };
}

/** Synchronizes a save's codex with all currently and previously owned items/pets. */
export function syncCodexStateWithSave(save: SaveLikeForCodex): CodexState {
  const cur = save.codex ?? defaultCodexState();
  const { discoveredResources, discoveredPets } = collectOwnedAndPastCodex(save);
  return {
    discoveredResources,
    discoveredPets,
    aiInventions: cur.aiInventions ?? [],
    defeatedBosses: Array.from(new Set(cur.defeatedBosses ?? [])),
    hasUnseenNew: cur.hasUnseenNew ?? false,
  };
}

export interface CodexProgressResult {
  totalItems: number;
  discoveredCount: number;
  percentage: number;
  activeBuffs: {
    threshold: number;
    title: string;
    desc: string;
    active: boolean;
    icon: string;
  }[];
  atkBonusPct: number;
  gatherBonusPct: number;
  petHpBonusPct: number;
  hatchDiscountPct: number;
}

/** 도감 달성도 및 영구 패시브 버프 계산기 */
export function computeCodexProgress(
  codex?: Partial<CodexState>,
  allPets: CodexPetDef[] = CODEX_PETS,
  allResources: CodexResourceDef[] = CODEX_RESOURCES
): CodexProgressResult {
  const discoveredPetSet = new Set((codex?.discoveredPets ?? []).map(normalizeCodexPetId));
  const discoveredResSet = new Set(codex?.discoveredResources ?? []);
  const defeatedBossSet = new Set(codex?.defeatedBosses ?? []);
  const aiInventions = codex?.aiInventions ?? [];

  const petTotal = allPets.length;
  const resTotal = allResources.length;
  const bossTotal = CODEX_BOSSES.length;
  const invTotal = Math.max(5, aiInventions.length);

  const matchedPets = allPets.filter(p => discoveredPetSet.has(p.id)).length;
  const matchedResources = allResources.filter(r => discoveredResSet.has(r.id)).length;
  const matchedBosses = CODEX_BOSSES.filter(b => defeatedBossSet.has(b.id)).length;

  const totalItems = Math.max(1, petTotal + resTotal + bossTotal + invTotal);
  const discoveredCount = matchedPets + matchedResources + matchedBosses + aiInventions.length;

  const percentage = Math.min(100, Math.round((discoveredCount / totalItems) * 100));

  const b10 = percentage >= 10;
  const b30 = percentage >= 30;
  const b50 = percentage >= 50;
  const b80 = percentage >= 80;

  const activeBuffs = [
    { threshold: 10, title: '용맹의 기록', desc: '공격력 +5%', active: b10, icon: '⚔️' },
    { threshold: 30, title: '풍요의 안목', desc: '채집량 +10% (추가 수확 확률)', active: b30, icon: '🎒' },
    { threshold: 50, title: '고대 생명력', desc: '수호 펫 최대 체력 +15%', active: b50, icon: '🦖' },
    { threshold: 80, title: '생명의 박동', desc: '공룡 알 부화 거리 -20%', active: b80, icon: '🥚' },
  ];

  return {
    totalItems,
    discoveredCount,
    percentage,
    activeBuffs,
    atkBonusPct: b10 ? 5 : 0,
    gatherBonusPct: b30 ? 10 : 0,
    petHpBonusPct: b50 ? 15 : 0,
    hatchDiscountPct: b80 ? 20 : 0,
  };
}

export function defaultCodexState(): CodexState {
  return {
    discoveredResources: [],
    discoveredPets: [],
    aiInventions: [],
    defeatedBosses: [],
    hasUnseenNew: false,
  };
}
