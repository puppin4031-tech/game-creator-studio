import type { Stack } from './types';

export const VILLAGE_GRID_SIZE_DEFAULT = 12;
export const VILLAGE_GRID_SIZE = 12;
export const VILLAGE_TOTAL_GRID_SIZE = 16;
export const VILLAGE_SPAWN_MARGIN = 2;

/**
 * Dynamic village grid size based on Shaman level.
 * Shaman Lv.1: 12x12
 * Shaman Lv.2~5 (Stage 1 '불씨의 기억' completion reward): 14x14
 */
export function getVillageGridSize(shamanLevel: number = 1): number {
  return shamanLevel >= 2 ? 14 : 12;
}

export type VillageBuildingCategory = 'wall' | 'facility' | 'decor';

export type VillageBuildingId =
  | 'wood_pillar'
  | 'branch_fence'
  | 'log_palisade'
  | 'stone_wall'
  | 'granite_wall'
  | 'marble_wall'
  | 'campfire'
  | 'tribal_hall'
  | 'wandering_shaman'
  | 'brazier'
  | 'torch'
  | 'primitive_storage'
  | 'lumber_hut'
  | 'smokehouse'
  | 'primitive_tavern'
  | 'tribe_shelter'
  | 'expedition_barracks'
  | 'build_workshop'
  | 'stone_smeltery'
  | 'ancient_altar'
  | 'shaman_tent'
  | 'golden_totem'
  | 'rex_skull'
  | 'flower_bed'
  | 'custom_intent_building';

export type ShamanSkillId =
  | 'tanning'
  | 'woodworking'
  | 'masonry_smelting'
  | 'wood_artisan'
  | 'stone_artisan';

export type ShamanSkillMap = Partial<Record<ShamanSkillId, number>>;

export interface ShamanSkillDef {
  id: ShamanSkillId;
  name: string;
  group: 'craft' | 'artisan';
  maxLevel: number;
  icon: string;
  desc: string;
  unlocksSummary: string[];
  /** Tech IDs automatically unlocked when this skill is trained */
  grantsTechIds: string[];
  costForLevel: (nextLevel: number) => Stack[];
}

export interface VillageBuildingDef {
  id: VillageBuildingId;
  name: string;
  category: VillageBuildingCategory;
  unlockBaseLevel: 1 | 2 | 3;
  maxHp: number;
  cost: Stack[];
  blueprintCost?: Stack[];
  requiredArtisan?: { skill: 'wood_artisan' | 'stone_artisan'; level: number };
  desc: string;
  effectLabel: string;
  icon: string;
  /** True if residents/pets gather around this tile to rest with speech bubbles */
  restSpot?: boolean;
  /** True if this tile connects to adjacent wall tiles */
  connectsWall?: boolean;
  /** Maximum count allowed in the 12x12 village (undefined = unlimited for walls) */
  maxCount?: number;
  /** Width in grid tiles (default 1) */
  widthTiles: number;
  /** Height in grid tiles (default 1) */
  heightTiles: number;
  /** Label for footprint (e.g. '1칸', '2칸', '4칸', '6칸') */
  footprintLabel: string;
  /** Offline / idle auto-production configuration for harvest bubbles on building roofs */
  idleYield?: {
    itemId: Stack['itemId'];
    icon: string;
    label: string;
    intervalMs: number;
    amountPerCycle: number;
    maxCount: number;
  };
  /** Extra village resident capacity granted by this building */
  residentBonus?: number;
}

export interface PlacedVillageBuilding {
  uid: string;
  buildingId: VillageBuildingId;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  /** Timestamp when this building's roof harvest bubble was last collected */
  lastHarvestAt?: number;
  /** Custom intent mechanics awarded during crafting. */
  customName?: string;
  customDesc?: string;
  customCategory?: 'fence' | 'tower' | 'building';
  customMechanics?: string[];
  physics?: {
    elasticity: number;
    durability: number;
    weatherResist: number;
    density: number;
  };
}

export interface VillageState {
  buildings: PlacedVillageBuilding[];
  initialized?: boolean;
  researchedBlueprints?: VillageBuildingId[];
  shamanSkills?: ShamanSkillMap;
  shamanLevel?: 1 | 2 | 3 | 4 | 5;
  shamanClass?: 'engineer' | 'mage' | 'warlock' | 'orthodox' | null;
}

const S = (itemId: Stack['itemId'], count: number): Stack => ({ itemId, count });

export const VILLAGE_BUILDINGS: Record<VillageBuildingId, VillageBuildingDef> = {
  // 재료별 울타리 & 방어 시설 (1칸: 1x1)
  wood_pillar: {
    id: 'wood_pillar',
    name: '나무 기둥',
    category: 'wall',
    unlockBaseLevel: 1,
    maxHp: 150,
    cost: [S('branch', 2)],
    desc: '울타리 모서리와 성문을 지지하는 기초 나무 기둥.',
    effectLabel: '내구도 150 · 성벽 연결',
    icon: '🪵',
    connectsWall: true,
    widthTiles: 1,
    heightTiles: 1,
    footprintLabel: '1칸 (1×1)',
  },
  branch_fence: {
    id: 'branch_fence',
    name: '나뭇가지 울타리',
    category: 'wall',
    unlockBaseLevel: 1,
    maxHp: 100,
    cost: [S('branch', 3)],
    desc: '가벼운 나뭇가지를 엮어 만든 초급 방어 울타리.',
    effectLabel: '내구도 100 · 성벽 연결',
    icon: '🚧',
    connectsWall: true,
    widthTiles: 1,
    heightTiles: 1,
    footprintLabel: '1칸 (1×1)',
  },
  log_palisade: {
    id: 'log_palisade',
    name: '통나무 방책',
    category: 'wall',
    unlockBaseLevel: 2,
    maxHp: 300,
    cost: [S('log', 2), S('cordage', 1)],
    desc: '굵은 통나무를 깎아 세운 중급 목책 성벽.',
    effectLabel: '내구도 300 · 성벽 연결',
    icon: '🛡️',
    connectsWall: true,
    widthTiles: 1,
    heightTiles: 1,
    footprintLabel: '1칸 (1×1)',
  },
  stone_wall: {
    id: 'stone_wall',
    name: '돌담 울타리',
    category: 'wall',
    unlockBaseLevel: 2,
    maxHp: 800,
    cost: [S('flint', 4), S('clay', 2)],
    blueprintCost: [S('flint', 3), S('clay', 2)],
    requiredArtisan: { skill: 'stone_artisan', level: 1 },
    desc: '돌과 점토를 다져 쌓아 올린 견고한 석조 성벽.',
    effectLabel: '내구도 800 · 석공 장인 Lv.1',
    icon: '🧱',
    connectsWall: true,
    widthTiles: 1,
    heightTiles: 1,
    footprintLabel: '1칸 (1×1)',
  },
  granite_wall: {
    id: 'granite_wall',
    name: '화강암 성벽',
    category: 'wall',
    unlockBaseLevel: 2,
    maxHp: 1200,
    cost: [S('flint', 6), S('quartz', 1), S('clay', 3)],
    blueprintCost: [S('flint', 5), S('quartz', 1)],
    requiredArtisan: { skill: 'stone_artisan', level: 2 },
    desc: '단단한 화강암과 석영을 맞물려 쌓은 상급 방어 성벽.',
    effectLabel: '내구도 1,200 · 석공 장인 Lv.2',
    icon: '🪨',
    connectsWall: true,
    widthTiles: 1,
    heightTiles: 1,
    footprintLabel: '1칸 (1×1)',
  },
  marble_wall: {
    id: 'marble_wall',
    name: '대리석 성벽',
    category: 'wall',
    unlockBaseLevel: 3,
    maxHp: 1800,
    cost: [S('quartz', 2), S('jade', 1), S('clay', 4)],
    blueprintCost: [S('quartz', 2), S('jade', 1)],
    requiredArtisan: { skill: 'stone_artisan', level: 3 },
    desc: '백색 대리석과 비취를 정교하게 다듬어 세운 최고급 왕국 성벽.',
    effectLabel: '내구도 1,800 · 석공 장인 Lv.3',
    icon: '🏛️',
    connectsWall: true,
    widthTiles: 1,
    heightTiles: 1,
    footprintLabel: '1칸 (1×1)',
  },

  // Lv.1 기능성 시설 (2칸·4칸 구성)
  campfire: {
    id: 'campfire',
    name: '모닥불 광장',
    category: 'facility',
    unlockBaseLevel: 1,
    maxHp: 250,
    cost: [S('branch', 3)],
    desc: '거점 마을의 중심 불씨. 부족민과 공룡 펫들이 주변에 모여 온기를 나눕니다.',
    effectLabel: '4칸 (2×2) · 거점 중심 · 주민 +2명',
    icon: '🔥',
    restSpot: true,
    maxCount: 2,
    widthTiles: 2,
    heightTiles: 2,
    footprintLabel: '4칸 (2×2)',
    residentBonus: 2,
    idleYield: {
      itemId: 'cooked_meat',
      icon: '🍖',
      label: '구운 고기',
      intervalMs: 12 * 60_000,
      amountPerCycle: 1,
      maxCount: 6,
    },
  },
  tribal_hall: {
    id: 'tribal_hall',
    name: '부족회관',
    category: 'facility',
    unlockBaseLevel: 1,
    maxHp: 600,
    cost: [S('log', 4), S('hide', 2)],
    desc: '부족원들이 모여 작전을 논의하고 원정대 용병을 지휘하는 거점 부족회관.',
    effectLabel: '4칸 (2×2) · 원정대 지휘소 · 주민 +2명',
    icon: '⛺',
    restSpot: true,
    maxCount: 1,
    widthTiles: 2,
    heightTiles: 2,
    footprintLabel: '4칸 (2×2)',
    residentBonus: 2,
  },
  wandering_shaman: {
    id: 'wandering_shaman',
    name: '떠돌이 주술사',
    category: 'facility',
    unlockBaseLevel: 1,
    maxHp: 400,
    cost: [S('herb', 2), S('bone', 2)],
    desc: '신비한 지혜와 약초, 생존 목표 및 고대 언어를 전수하는 늙은 떠돌이 주술사.',
    effectLabel: '1칸 (1×1) · 생존 목표 & 언어 학습',
    icon: '🧙',
    restSpot: true,
    maxCount: 1,
    widthTiles: 1,
    heightTiles: 1,
    footprintLabel: '1칸 (1×1)',
    residentBonus: 1,
  },
  brazier: {
    id: 'brazier',
    name: '화로 구이터',
    category: 'facility',
    unlockBaseLevel: 1,
    maxHp: 200,
    cost: [S('flint', 3), S('branch', 2)],
    desc: '고기를 굽고 추위를 녹이는 돌 화로. 부족민들이 마주 앉아 고기를 굽습니다.',
    effectLabel: '2칸 (2×1) · 자동 고기 구이 · 휴식처',
    icon: '🍲',
    restSpot: true,
    maxCount: 4,
    widthTiles: 2,
    heightTiles: 1,
    footprintLabel: '2칸 (2×1)',
    idleYield: {
      itemId: 'cooked_meat',
      icon: '🍖',
      label: '구운 고기',
      intervalMs: 10 * 60_000,
      amountPerCycle: 1,
      maxCount: 8,
    },
  },
  torch: {
    id: 'torch',
    name: '쌍횃불 감시등',
    category: 'facility',
    unlockBaseLevel: 1,
    maxHp: 120,
    cost: [S('branch', 2), S('resin', 1)],
    desc: '어두운 밤에도 성벽 안쪽과 거점 주변을 밝히는 송진 횃불.',
    effectLabel: '2칸 (2×1) · 야간 시야 +6m (최대 +24m)',
    icon: '🕯️',
    maxCount: 6,
    widthTiles: 2,
    heightTiles: 1,
    footprintLabel: '2칸 (2×1)',
  },
  primitive_storage: {
    id: 'primitive_storage',
    name: '원시 창고',
    category: 'facility',
    unlockBaseLevel: 1,
    maxHp: 350,
    cost: [S('branch', 4), S('clay', 2)],
    desc: '채집한 식량과 자원을 안전하게 비축하는 창고. 일꾼들이 자재를 나릅니다.',
    effectLabel: '4칸 (2×2) · 적재 +5kg · 수호펫/파밍 수집품',
    icon: '📦',
    maxCount: 2,
    widthTiles: 2,
    heightTiles: 2,
    footprintLabel: '4칸 (2×2)',
    residentBonus: 1,
    idleYield: {
      itemId: 'bone',
      icon: '🦴',
      label: '뼈·전리품',
      intervalMs: 10 * 60_000,
      amountPerCycle: 2,
      maxCount: 12,
    },
  },
  lumber_hut: {
    id: 'lumber_hut',
    name: '나무꾼 오두막',
    category: 'facility',
    unlockBaseLevel: 1,
    maxHp: 320,
    cost: [S('branch', 4), S('flint', 2)],
    desc: '마을 주변 숲에서 나뭇가지와 통나무를 자동으로 벌목해 쌓아두는 오두막.',
    effectLabel: '4칸 (2×2) · 방치형 목재(🪵) 자동 생산',
    icon: '🪓',
    maxCount: 2,
    widthTiles: 2,
    heightTiles: 2,
    footprintLabel: '4칸 (2×2)',
    residentBonus: 1,
    idleYield: {
      itemId: 'branch',
      icon: '🪵',
      label: '나뭇가지',
      intervalMs: 6 * 60_000,
      amountPerCycle: 3,
      maxCount: 18,
    },
  },
  smokehouse: {
    id: 'smokehouse',
    name: '원시 훈제소',
    category: 'facility',
    unlockBaseLevel: 1,
    maxHp: 380,
    cost: [S('branch', 4), S('clay', 3), S('flint', 2)],
    desc: '날고기와 과일(사과·돌배)이 초록색으로 썩기 전에 연기로 훈연해 말린 고기·말린 과일로 보존합니다.',
    effectLabel: '4칸 (2×2) · 식량 부패 방지 · 훈연/건조 가공',
    icon: '♨️',
    restSpot: true,
    maxCount: 2,
    widthTiles: 2,
    heightTiles: 2,
    footprintLabel: '4칸 (2×2)',
    residentBonus: 1,
    idleYield: {
      itemId: 'jerky',
      icon: '🥩',
      label: '말린 고기',
      intervalMs: 12 * 60_000,
      amountPerCycle: 1,
      maxCount: 8,
    },
  },
  primitive_tavern: {
    id: 'primitive_tavern',
    name: '원시 주막 (요리터)',
    category: 'facility',
    unlockBaseLevel: 1,
    maxHp: 460,
    cost: [S('branch', 5), S('clay', 3), S('bone', 2)],
    desc: '야생 향신초·암염·후추열매와 고기·과일로 진한 뼈 스튜와 통고기 구이를 요리하는 주막.',
    effectLabel: '4칸 (2×2) · 특제 요리 제작 · 주민 +2명',
    icon: '🍖',
    restSpot: true,
    maxCount: 1,
    widthTiles: 2,
    heightTiles: 2,
    footprintLabel: '4칸 (2×2)',
    residentBonus: 2,
    idleYield: {
      itemId: 'wild_spice',
      icon: '🌿',
      label: '야생 향신초',
      intervalMs: 10 * 60_000,
      amountPerCycle: 1,
      maxCount: 8,
    },
  },

  // Lv.2 기능성 시설 (4칸·6칸 구성)
  tribe_shelter: {
    id: 'tribe_shelter',
    name: '부족 쉼터',
    category: 'facility',
    unlockBaseLevel: 2,
    maxHp: 500,
    cost: [S('log', 3), S('hide', 2)],
    desc: '부족민과 공룡 펫이 안으로 들어가 잠깐 잠들고(Zzz) 체력을 회복하는 아늑한 쉼터.',
    effectLabel: '4칸 (2×2) · 회복 속도 2배 · 주민 +2명',
    icon: '⛺',
    restSpot: true,
    maxCount: 2,
    widthTiles: 2,
    heightTiles: 2,
    footprintLabel: '4칸 (2×2)',
    residentBonus: 2,
    idleYield: {
      itemId: 'hide',
      icon: '🦌',
      label: '날가죽',
      intervalMs: 12 * 60_000,
      amountPerCycle: 1,
      maxCount: 8,
    },
  },
  expedition_barracks: {
    id: 'expedition_barracks',
    name: '원정대 막사',
    category: 'facility',
    unlockBaseLevel: 2,
    maxHp: 550,
    cost: [S('log', 4), S('leather', 2)],
    desc: '4대 부족 용병들이 무기를 손질하고 성벽 보초 및 출정을 준비하는 대형 막사.',
    effectLabel: '6칸 (3×2) · 원정대 집결지 · 주민 +2명',
    icon: '⚔️',
    restSpot: true,
    maxCount: 2,
    widthTiles: 3,
    heightTiles: 2,
    footprintLabel: '6칸 (3×2)',
    residentBonus: 2,
    idleYield: {
      itemId: 'bone',
      icon: '🦴',
      label: '사냥 뼈',
      intervalMs: 10 * 60_000,
      amountPerCycle: 2,
      maxCount: 10,
    },
  },

  // Lv.3 기능성 시설 (4칸·6칸 구성)
  build_workshop: {
    id: 'build_workshop',
    name: '건축 공방',
    category: 'facility',
    unlockBaseLevel: 3,
    maxHp: 700,
    cost: [S('log', 5), S('flint', 5)],
    desc: '성벽 자재와 고급 건물을 다듬는 전문 건축 공방.',
    effectLabel: '4칸 (2×2) · 성벽 내구도 +20% · 석재 생산',
    icon: '🔨',
    maxCount: 1,
    widthTiles: 2,
    heightTiles: 2,
    footprintLabel: '4칸 (2×2)',
    residentBonus: 1,
    idleYield: {
      itemId: 'flint',
      icon: '🪨',
      label: '부싯돌',
      intervalMs: 8 * 60_000,
      amountPerCycle: 2,
      maxCount: 14,
    },
  },
  stone_smeltery: {
    id: 'stone_smeltery',
    name: '석기 제련소',
    category: 'facility',
    unlockBaseLevel: 3,
    maxHp: 750,
    cost: [S('flint', 6), S('clay', 4), S('obsidian', 1)],
    desc: '고열로 흑요석과 석기를 벼려내는 대형 무기 공방.',
    effectLabel: '6칸 (3×2) · 부족민 공격력 +15% · 광석 생산',
    icon: '⚒️',
    maxCount: 1,
    widthTiles: 3,
    heightTiles: 2,
    footprintLabel: '6칸 (3×2)',
    residentBonus: 1,
    idleYield: {
      itemId: 'flint',
      icon: '🪨',
      label: '제련 부싯돌',
      intervalMs: 8 * 60_000,
      amountPerCycle: 2,
      maxCount: 16,
    },
  },
  ancient_altar: {
    id: 'ancient_altar',
    name: '고대 제단',
    category: 'facility',
    unlockBaseLevel: 3,
    maxHp: 900,
    cost: [S('flint', 8), S('bone', 4), S('quartz', 1)],
    desc: '신성한 기운으로 장비를 발명하고 재련하는 고대 거석 제단.',
    effectLabel: '6칸 (3×2) · 신성 발명 성소 · 결정 응집',
    icon: '🗿',
    restSpot: true,
    maxCount: 1,
    widthTiles: 3,
    heightTiles: 2,
    footprintLabel: '6칸 (3×2)',
    residentBonus: 1,
    idleYield: {
      itemId: 'quartz',
      icon: '🔮',
      label: '신비한 결정',
      intervalMs: 15 * 60_000,
      amountPerCycle: 1,
      maxCount: 6,
    },
  },
  shaman_tent: {
    id: 'shaman_tent',
    name: '떠돌이 주술사',
    category: 'facility',
    unlockBaseLevel: 1,
    maxHp: 400,
    cost: [S('hide', 2), S('bone', 2), S('herb', 2)],
    desc: '늙은 주술사가 머물며 약초와 고대 지혜, 생존 의뢰를 전수하는 1칸 성소.',
    effectLabel: '1칸 (1×1) · 생존 목표 부여 · 약초 채집',
    icon: '🧙',
    restSpot: true,
    maxCount: 1,
    widthTiles: 1,
    heightTiles: 1,
    footprintLabel: '1칸 (1×1)',
    residentBonus: 1,
    idleYield: {
      itemId: 'herb',
      icon: '⚡',
      label: '신비한 약초',
      intervalMs: 10 * 60_000,
      amountPerCycle: 1,
      maxCount: 8,
    },
  },

  // 조경 · 자랑용 장식물 (Decorations)
  golden_totem: {
    id: 'golden_totem',
    name: '황금 태양 토템',
    category: 'decor',
    unlockBaseLevel: 1,
    maxHp: 400,
    cost: [S('branch', 3), S('flint', 2)],
    desc: '부족의 번영과 영광을 상징하는 황금빛 토템 조각상. 주민들이 지나가며 경배합니다.',
    effectLabel: '2칸 (1×2) · 마을 위신 장식 · 주민 사기 상승',
    icon: '🗿',
    restSpot: true,
    maxCount: 4,
    widthTiles: 1,
    heightTiles: 2,
    footprintLabel: '2칸 (1×2)',
    residentBonus: 1,
  },
  rex_skull: {
    id: 'rex_skull',
    name: '거대 티라노 두개골',
    category: 'decor',
    unlockBaseLevel: 2,
    maxHp: 650,
    cost: [S('bone', 6), S('flint', 2)],
    desc: '전설적인 공룡의 거대한 두개골 장식. 침입하는 맹수들에게 위압감을 줍니다.',
    effectLabel: '4칸 (2×2) · 우두머리 사냥꾼의 상징 장식',
    icon: '🦖',
    restSpot: true,
    maxCount: 2,
    widthTiles: 2,
    heightTiles: 2,
    footprintLabel: '4칸 (2×2)',
    residentBonus: 1,
  },
  flower_bed: {
    id: 'flower_bed',
    name: '야생 들꽃 화단',
    category: 'decor',
    unlockBaseLevel: 1,
    maxHp: 150,
    cost: [S('fiber', 2), S('berry', 1)],
    desc: '향기로운 들꽃과 약초가 피어난 정원 타일. 마을을 평화롭고 아름답게 꾸며줍니다.',
    effectLabel: '2칸 (2×1) · 초원 조경 장식',
    icon: '🌺',
    maxCount: 8,
    widthTiles: 2,
    heightTiles: 1,
    footprintLabel: '2칸 (2×1)',
  },
  custom_intent_building: {
    id: 'custom_intent_building',
    name: '특수 맞춤 건축물',
    category: 'facility',
    unlockBaseLevel: 1,
    maxHp: 500,
    cost: [],
    desc: '의도 분석 AI와 재료 물리 속성을 기반으로 제작된 맞춤형 특수 건축물.',
    effectLabel: '맞춤 특수 효과 활성',
    icon: '🏛️',
    widthTiles: 1,
    heightTiles: 1,
    footprintLabel: '1칸 (1×1)',
  },
};

export const VILLAGE_BUILDING_LIST: VillageBuildingDef[] = Object.values(VILLAGE_BUILDINGS);

export function inVillageBounds(x: number, y: number, gridSize: number = VILLAGE_GRID_SIZE): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < gridSize && y >= 0 && y < gridSize;
}

export function buildingFootprintCells(
  buildingId: VillageBuildingId,
  originX: number,
  originY: number
): { x: number; y: number }[] {
  const def = VILLAGE_BUILDINGS[buildingId];
  const w = def?.widthTiles ?? 1;
  const h = def?.heightTiles ?? 1;
  const cells: { x: number; y: number }[] = [];
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      cells.push({ x: originX + dx, y: originY + dy });
    }
  }
  return cells;
}

/** Creates the initial starter layout around the center of the 12x12 grid with central campfire, tribal hall, and wandering shaman. */
export function createStarterVillage(hasAltar = false): VillageState {
  const initialLastHarvest = Date.now() - 25 * 60_000;
  const buildings: PlacedVillageBuilding[] = [
    { uid: 'starter-shaman', buildingId: 'wandering_shaman', x: 3, y: 5, hp: 400, maxHp: 400, lastHarvestAt: initialLastHarvest }, // 1x1 (1칸)
    { uid: 'starter-campfire', buildingId: 'campfire', x: 5, y: 5, hp: 250, maxHp: 250, lastHarvestAt: initialLastHarvest }, // 2x2 (4칸)
    { uid: 'starter-hall', buildingId: 'tribal_hall', x: 8, y: 5, hp: 600, maxHp: 600, lastHarvestAt: initialLastHarvest }, // 2x2 (4칸)
  ];
  if (hasAltar) {
    buildings.push({ uid: 'starter-altar', buildingId: 'ancient_altar', x: 4, y: 0, hp: 900, maxHp: 900, lastHarvestAt: initialLastHarvest });
  }
  return { buildings, initialized: true, shamanLevel: 1, shamanClass: null };
}

export function ensureVillageState(state: VillageState | undefined, hasAltar = false): VillageState {
  if (state?.initialized && Array.isArray(state.buildings)) {
    // Clean up legacy test starter buildings
    const legacyStarterIds = new Set([
      'starter-storage',
      'starter-lumber',
      'starter-smokehouse',
      'starter-tavern',
      'starter-brazier',
      'starter-torch-1',
      'starter-torch-2',
    ]);
    const filteredBuildings = state.buildings.filter(b => !legacyStarterIds.has(b.uid));
    if (!filteredBuildings.some(b => b.buildingId === 'campfire')) {
      filteredBuildings.unshift({
        uid: 'starter-campfire',
        buildingId: 'campfire',
        x: 5,
        y: 5,
        hp: 250,
        maxHp: 250,
        lastHarvestAt: Date.now() - 25 * 60_000,
      });
    }
    if (!filteredBuildings.some(b => b.buildingId === 'tribal_hall')) {
      filteredBuildings.push({
        uid: 'starter-hall',
        buildingId: 'tribal_hall',
        x: 8,
        y: 5,
        hp: 600,
        maxHp: 600,
        lastHarvestAt: Date.now() - 25 * 60_000,
      });
    }
    if (!filteredBuildings.some(b => b.buildingId === 'wandering_shaman' || b.buildingId === 'shaman_tent')) {
      filteredBuildings.push({
        uid: 'starter-shaman',
        buildingId: 'wandering_shaman',
        x: 3,
        y: 5,
        hp: 400,
        maxHp: 400,
        lastHarvestAt: Date.now() - 25 * 60_000,
      });
    }
    return {
      ...state,
      buildings: filteredBuildings,
      shamanLevel: state.shamanLevel ?? 1,
      shamanClass: state.shamanClass ?? null,
    };
  }
  return createStarterVillage(hasAltar);
}

export function buildingAtTile(state: VillageState, x: number, y: number): PlacedVillageBuilding | undefined {
  return state.buildings.find(b => {
    const def = VILLAGE_BUILDINGS[b.buildingId];
    const w = def?.widthTiles ?? 1;
    const h = def?.heightTiles ?? 1;
    return x >= b.x && x < b.x + w && y >= b.y && y < b.y + h;
  });
}

export function canPlaceVillageBuilding(
  state: VillageState,
  buildingId: VillageBuildingId,
  x: number,
  y: number,
  baseLevel: 1 | 2 | 3
): { ok: true } | { ok: false; reason: string } {
  const def = VILLAGE_BUILDINGS[buildingId];
  if (!def) return { ok: false, reason: '알 수 없는 시설입니다' };
  const cells = buildingFootprintCells(buildingId, x, y);
  const gridSize = getVillageGridSize(state.shamanLevel ?? 1);
  if (cells.some(c => !inVillageBounds(c.x, c.y, gridSize))) {
    return { ok: false, reason: `${def.name}(${def.footprintLabel})이(가) 마을 경계를 벗어납니다` };
  }
  if (baseLevel < def.unlockBaseLevel) {
    return { ok: false, reason: `거점 Lv.${def.unlockBaseLevel} 달성 시 해금됩니다` };
  }
  if (cells.some(c => !!buildingAtTile(state, c.x, c.y))) {
    return { ok: false, reason: '해당 영역에 이미 다른 건물이 배치되어 있습니다' };
  }
  if (def.maxCount !== undefined) {
    const count = state.buildings.filter(b => b.buildingId === buildingId).length;
    if (count >= def.maxCount) {
      return { ok: false, reason: `${def.name}은(는) 최대 ${def.maxCount}개까지 배치할 수 있습니다` };
    }
  }
  return { ok: true };
}

export function placeVillageBuilding(
  state: VillageState,
  buildingId: VillageBuildingId,
  x: number,
  y: number,
  uid: string
): VillageState {
  const def = VILLAGE_BUILDINGS[buildingId];
  const workshopBonus = state.buildings.some(b => b.buildingId === 'build_workshop') && def.category === 'wall' ? 1.2 : 1;
  const maxHp = Math.round(def.maxHp * workshopBonus);
  return {
    ...state,
    initialized: true,
    buildings: [
      ...state.buildings,
      { uid, buildingId, x, y, hp: maxHp, maxHp, lastHarvestAt: Date.now() },
    ],
  };
}

export function placeCustomVillageBuilding(
  state: VillageState,
  params: {
    uid: string;
    x: number;
    y: number;
    hp: number;
    customName: string;
    customDesc: string;
    customCategory: 'fence' | 'tower' | 'building';
    customMechanics: string[];
    physics: {
      elasticity: number;
      durability: number;
      weatherResist: number;
      density: number;
    };
  }
): VillageState {
  return {
    ...state,
    initialized: true,
    buildings: [
      ...state.buildings,
      {
        uid: params.uid,
        buildingId: 'custom_intent_building',
        x: params.x,
        y: params.y,
        hp: params.hp,
        maxHp: params.hp,
        lastHarvestAt: Date.now(),
        customName: params.customName,
        customDesc: params.customDesc,
        customCategory: params.customCategory,
        customMechanics: params.customMechanics,
        physics: params.physics,
      },
    ],
  };
}

export function moveVillageBuilding(
  state: VillageState,
  uid: string,
  toX: number,
  toY: number
): { ok: true; state: VillageState } | { ok: false; reason: string } {
  const target = state.buildings.find(b => b.uid === uid);
  if (!target) return { ok: false, reason: '선택한 건물을 찾을 수 없습니다' };
  if (target.x === toX && target.y === toY) return { ok: true, state };
  const def = VILLAGE_BUILDINGS[target.buildingId];
  const cells = buildingFootprintCells(target.buildingId, toX, toY);
  const gridSize = getVillageGridSize(state.shamanLevel ?? 1);
  if (cells.some(c => !inVillageBounds(c.x, c.y, gridSize))) {
    return { ok: false, reason: `${def?.name ?? '건물'}이(가) 마을 경계를 벗어납니다` };
  }
  const restState: VillageState = {
    ...state,
    buildings: state.buildings.filter(b => b.uid !== uid),
  };
  if (cells.some(c => !!buildingAtTile(restState, c.x, c.y))) {
    return { ok: false, reason: '이동할 위치에 이미 다른 시설이 있습니다' };
  }
  return {
    ok: true,
    state: {
      ...state,
      buildings: state.buildings.map(b => (b.uid === uid ? { ...b, x: toX, y: toY } : b)),
    },
  };
}

export function removeVillageBuilding(state: VillageState, uid: string): VillageState {
  const target = state.buildings.find(b => b.uid === uid);
  if (!target) return state;
  // Keep at least one campfire in the village
  if (target.buildingId === 'campfire' && state.buildings.filter(b => b.buildingId === 'campfire').length <= 1) {
    return state;
  }
  return {
    ...state,
    buildings: state.buildings.filter(b => b.uid !== uid),
  };
}

/** Computes active gameplay bonuses granted by placed village facilities. */
export function computeVillageBonuses(state: VillageState | undefined) {
  const list = state?.buildings ?? [];
  const torches = list.filter(b => b.buildingId === 'torch' && b.hp > 0).length;
  const shelters = list.filter(b => b.buildingId === 'tribe_shelter' && b.hp > 0).length;
  const storages = list.filter(b => b.buildingId === 'primitive_storage' && b.hp > 0).length;
  const smelteries = list.filter(b => b.buildingId === 'stone_smeltery' && b.hp > 0).length;
  const wallBuildings = list.filter(b => (VILLAGE_BUILDINGS[b.buildingId]?.category === 'wall' || b.customMechanics?.includes('WALL_BLOCK')) && b.hp > 0);
  const totalWallHp = wallBuildings.reduce((sum, b) => sum + b.hp, 0);

  const customBuildings = list.filter(b => b.hp > 0 && b.customMechanics && b.customMechanics.length > 0);
  const customNightVision = customBuildings.some(b => b.customMechanics?.includes('NIGHT_VISION')) ? 30 : 0;
  const customHealAura = customBuildings.some(b => b.customMechanics?.includes('HEAL_AURA'));
  const customStorageBonus = customBuildings.filter(b => b.customMechanics?.includes('STORAGE_UP')).length * 50;
  const autoArrowCount = customBuildings.filter(b => b.customMechanics?.includes('AUTO_ARROW')).length;

  return {
    /** Night vision bonus in meters (+6m per torch, max +24m, +30m with NIGHT_VISION building) */
    nightVisionBonusM: Math.min(60, torches * 6 + customNightVision),
    /** Tribe & pet HP recovery speed multiplier (2x when tribe_shelter or HEAL_AURA is active) */
    regenSpeedMult: shelters > 0 || customHealAura ? 2 : 1,
    /** Extra storage/backpack carry capacity in kg (+5kg per primitive_storage, +50kg per STORAGE_UP building) */
    carryBonusKg: Math.min(150, storages * 5 + customStorageBonus),
    /** Tribe attack multiplier from stone_smeltery */
    tribeAtkMult: smelteries > 0 ? 1.15 : 1,
    /** Total wall durability surrounding the village */
    totalWallHp,
    wallCount: wallBuildings.length,
    customHealAura,
    autoArrowCount,
  };
}

/** Returns neighbor connection flags (N, E, S, W) for wall auto-tiling. */
export function wallConnections(state: VillageState, x: number, y: number) {
  const isWallAt = (tx: number, ty: number) => {
    const b = buildingAtTile(state, tx, ty);
    return !!(b && VILLAGE_BUILDINGS[b.buildingId]?.connectsWall);
  };
  return {
    n: isWallAt(x, y - 1),
    e: isWallAt(x + 1, y),
    s: isWallAt(x, y + 1),
    w: isWallAt(x - 1, y),
  };
}

export const STARTER_BLUEPRINTS: VillageBuildingId[] = [
  'campfire',
  'tribal_hall',
  'wandering_shaman',
  'shaman_tent',
  'primitive_storage',
  'lumber_hut',
  'smokehouse',
  'primitive_tavern',
  'wood_pillar',
  'branch_fence',
  'torch',
  'brazier',
  'golden_totem',
  'flower_bed',
];

/** Computes accumulated offline/idle resource bubble on a placed building. */
export function computeBuildingHarvestBubble(
  b: PlacedVillageBuilding,
  now: number,
  extraWorkerBonus = 0
): {
  itemId: Stack['itemId'];
  icon: string;
  label: string;
  count: number;
} | null {
  const def = VILLAGE_BUILDINGS[b.buildingId];
  if (!def?.idleYield) return null;
  const last = b.lastHarvestAt ?? now - def.idleYield.intervalMs;
  const elapsed = Math.max(0, now - last);
  const cycles = Math.floor(elapsed / def.idleYield.intervalMs);
  if (cycles <= 0) return null;
  const perCycle = def.idleYield.amountPerCycle + (extraWorkerBonus > 0 ? 1 : 0);
  const count = Math.min(def.idleYield.maxCount, cycles * perCycle);
  if (count <= 0) return null;
  return {
    itemId: def.idleYield.itemId,
    icon: def.idleYield.icon,
    label: def.idleYield.label,
    count,
  };
}

/** Computes total visual village population capacity (combat mercenaries + ambient villagers) from player level, base level & placed buildings.
 * Rule: Village ambient population scales with player level (1 person per player level).
 */
export function computeVillagePopulationCapacity(
  state: VillageState | undefined,
  baseLevel: 1 | 2 | 3,
  playerLevel: number = 1
): {
  maxTribeCapacity: number;
  ambientExtraCount: number;
  totalResidentDisplay: number;
} {
  const list = state?.buildings ?? [];
  const facilityBonus = list.reduce(
    (sum, b) => sum + (VILLAGE_BUILDINGS[b.buildingId]?.residentBonus ?? 0),
    0
  );
  const maxTribeCapacity = Math.min(12, 2 + baseLevel * 2 + Math.floor(facilityBonus / 2));
  // User level defines the natural ambient village population (1 person per level, min 1, max 20)
  const ambientExtraCount = Math.max(1, Math.min(20, playerLevel));
  return {
    maxTribeCapacity,
    ambientExtraCount,
    totalResidentDisplay: maxTribeCapacity + ambientExtraCount,
  };
}

export const SHAMAN_SKILL_DEFS: ShamanSkillDef[] = [
  {
    id: 'tanning',
    name: '무두질 수련',
    group: 'craft',
    maxLevel: 5,
    icon: '🦌',
    desc: '짐승의 날가죽과 모피를 다듬어 새총·물매, 질긴 가죽 갑옷과 방한복을 제작합니다.',
    unlocksSummary: [
      'Lv.1: 새총·물매 및 돌멩이 탄환·나무껍질 조끼 해금',
      'Lv.2: 가죽 갑옷 레시피 해금',
      'Lv.3: 혹한의 털망토·모피 가공 해금',
      'Lv.4: 뼈 판금 갑옷 결속력 강화',
      'Lv.5: 전설 무두질 장인 (방어구 내구도 보너스)',
    ],
    grantsTechIds: ['binding', 'tanning', 'furcraft'],
    costForLevel: lv => [S('hide', lv * 2), S('bone', lv)],
  },
  {
    id: 'woodworking',
    name: '목공술 · 활/화살 제련',
    group: 'craft',
    maxLevel: 5,
    icon: '🏹',
    desc: '나무와 뼈의 탄성을 다스려 뼈 활(원거리)을 제련하고 날카로운 화살·투창과 목조 건축물을 제작합니다.',
    unlocksSummary: [
      'Lv.1: 화살 제조법(8발 묶음) 및 뼈 활 제련법 즉시 해금',
      'Lv.2: 사냥 활·화살 정밀 가공 및 자루 끼우기 해금',
      'Lv.3: 뼈 움막·목조 구조물 설계 해금',
      'Lv.4: 복합 각궁·강화 목책 구조 해금',
      'Lv.5: 대목장 (원거리 활·목조 건물 효율 극대화)',
    ],
    grantsTechIds: ['binding', 'bonecraft', 'hafting', 'hut_building'],
    costForLevel: lv => [S('branch', lv * 3), S('log', Math.max(1, lv))],
  },
  {
    id: 'masonry_smelting',
    name: '석공술·제련술',
    group: 'craft',
    maxLevel: 5,
    icon: '⚔️',
    desc: '부싯돌과 흑요석을 고열로 벼려내어 돌멩이 탄환·화살촉·날카로운 검·창과 석조 성벽을 세웁니다.',
    unlocksSummary: [
      'Lv.1: 주먹도끼·돌곡괭이·돌멩이 탄환(10발) 정밀 타격 해금',
      'Lv.2: 부싯돌 창·화살촉·돌망치 제련 해금',
      'Lv.3: 흑요석 도끼·흑요석 창 제련 해금',
      'Lv.4: 고열 석기 합금·돌담 성벽 해금',
      'Lv.5: 태고의 대장장이 (무기 제련 극대화)',
    ],
    grantsTechIds: ['knapping', 'hafting', 'obsidian', 'palisade'],
    costForLevel: lv => [S('flint', lv * 3), S('clay', lv * 2)],
  },
  {
    id: 'wood_artisan',
    name: '나무 장인',
    group: 'artisan',
    maxLevel: 3,
    icon: '🪵',
    desc: '건축 공방에서 더 튼튼한 상위 목조 건축물과 방어 방책을 해금합니다.',
    unlocksSummary: [
      'Lv.1: 나무 기둥·나뭇가지 울타리·횃불·화로 설계 해금',
      'Lv.2: 통나무 방책(내구도 300)·부족 쉼터·원정대 막사 해금',
      'Lv.3: 건축 공방·주술사 천막 해금 및 목조 내구도 +25%',
    ],
    grantsTechIds: ['hut_building', 'palisade_building'],
    costForLevel: lv => [S('log', lv * 2), S('branch', lv * 3), S('cordage', lv)],
  },
  {
    id: 'stone_artisan',
    name: '석공 장인',
    group: 'artisan',
    maxLevel: 3,
    icon: '🪨',
    desc: '건축 공방에서 돌담·화강암·대리석 방어 성벽과 석조 공방을 해금합니다.',
    unlocksSummary: [
      'Lv.1: 돌담 울타리(내구도 800)·석기 제련소 해금',
      'Lv.2: 화강암 성벽(내구도 1,200)·고대 제단 해금',
      'Lv.3: 대리석 성벽(내구도 1,800) 해금 및 석조 내구도 +30%',
    ],
    grantsTechIds: ['palisade_building'],
    costForLevel: lv => [S('flint', lv * 3), S('clay', lv * 2), S('bone', lv)],
  },
];

export function shamanSkillLevel(skills: ShamanSkillMap | undefined, id: ShamanSkillId): number {
  const raw = skills?.[id];
  if (raw !== undefined) return raw;
  // Wood artisan Lv.1 is unlocked by default so basic wood structures are available immediately
  return id === 'wood_artisan' ? 1 : 0;
}

export function isBlueprintResearched(state: VillageState | undefined, buildingId: VillageBuildingId): boolean {
  if (STARTER_BLUEPRINTS.includes(buildingId)) return true;
  return !!(state?.researchedBlueprints?.includes(buildingId));
}

export function buildingArtisanRequirement(buildingId: VillageBuildingId): { skill: 'wood_artisan' | 'stone_artisan'; level: number } {
  const def = VILLAGE_BUILDINGS[buildingId];
  if (def.requiredArtisan) return def.requiredArtisan;
  if (buildingId === 'log_palisade' || buildingId === 'tribe_shelter' || buildingId === 'expedition_barracks') {
    return { skill: 'wood_artisan', level: 2 };
  }
  if (buildingId === 'build_workshop' || buildingId === 'shaman_tent') {
    return { skill: 'wood_artisan', level: 3 };
  }
  if (buildingId === 'stone_smeltery') {
    return { skill: 'stone_artisan', level: 1 };
  }
  if (buildingId === 'ancient_altar') {
    return { skill: 'stone_artisan', level: 2 };
  }
  return { skill: 'wood_artisan', level: 1 };
}

export function isArtisanUnlocked(skills: ShamanSkillMap | undefined, buildingId: VillageBuildingId): boolean {
  const req = buildingArtisanRequirement(buildingId);
  return shamanSkillLevel(skills, req.skill) >= req.level;
}

export function blueprintResearchCost(buildingId: VillageBuildingId): Stack[] {
  const def = VILLAGE_BUILDINGS[buildingId];
  if (def.blueprintCost) return def.blueprintCost;
  return def.cost.map(c => ({ itemId: c.itemId, count: Math.max(1, Math.ceil(c.count * 0.6)) }));
}
