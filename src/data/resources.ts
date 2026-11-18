import type { ItemId } from '@/lib/survival/items';
import type { Stack } from '@/lib/survival/types';

export type CivilizationEra = 'paleolithic' | 'bronze' | 'iron' | 'alchemy_industry';

export interface ResourceMeta {
  itemId: ItemId;
  name: string;
  era: CivilizationEra;
  minPlayerLevel: number;
  rarity: 'common' | 'rare' | 'ultra_rare';
  hardness: number; // 경도 (0~100)
  toughness: number; // 인성/탄성 (0~100)
  corrosionResist: number; // 부식저항 (0~100)
  flammability?: number; // 가연성/열량 (0~100)
  specialTraits: string[];
  description: string;
  recommendedUses: string;
}

export interface EraTierInfo {
  era: CivilizationEra;
  name: string;
  titleBadge: string;
  levelRange: string;
  minLevel: number;
  maxLevel: number;
  themeColor: string;
  description: string;
  keyResources: ItemId[];
}

export const CIVILIZATION_ERAS: Record<CivilizationEra, EraTierInfo> = {
  paleolithic: {
    era: 'paleolithic',
    name: '구석기 ~ 신석기 시대',
    titleBadge: '🪵 원시 정착 문명',
    levelRange: 'Lv.1 ~ Lv.10',
    minLevel: 1,
    maxLevel: 10,
    themeColor: 'amber',
    description: '채집과 수렵, 돌을 깨어 도구를 빚고 불씨를 지키는 원시 정착기',
    keyResources: ['branch', 'flint', 'bone', 'log', 'clay', 'obsidian'],
  },
  bronze: {
    era: 'bronze',
    name: '동기 ~ 청동기 시대',
    titleBadge: '⚔️ 청동기 문명 도달',
    levelRange: 'Lv.11 ~ Lv.19',
    minLevel: 11,
    maxLevel: 19,
    themeColor: 'orange',
    description: '구리와 주석의 합금, 천연 역청의 방수 기술, 귀금속 교역이 태동하는 금속 발견기',
    keyResources: ['copper_ore', 'tin_ore', 'bitumen', 'silver_ore', 'gold_ore'],
  },
  iron: {
    era: 'iron',
    name: '철기 & 자력 탐사 시대',
    titleBadge: '🛡️ 철기 문명 도달',
    levelRange: 'Lv.20 ~ Lv.29',
    minLevel: 20,
    maxLevel: 29,
    themeColor: 'slate',
    description: '자철석과 석탄 고온 제련, 자석 나침반을 통한 광활한 탐사, 중공업 태동기',
    keyResources: ['magnetite', 'coal', 'limestone', 'sulfur'],
  },
  alchemy_industry: {
    era: 'alchemy_industry',
    name: '연금 & 초기 산업 시대',
    titleBadge: '⚡ 연금·초기 산업 문명',
    levelRange: 'Lv.30 이상',
    minLevel: 30,
    maxLevel: 999,
    themeColor: 'purple',
    description: '수은과 고대 마력석, 운석 파편을 다루는 오버테크놀로지와 자동화 동력기',
    keyResources: ['mercury', 'meteor_shard', 'mana_stone'],
  },
};

export const UNLOCKABLE_RESOURCES: ResourceMeta[] = [
  // ── Lv. 1~10 구석기·신석기 기본 자원
  {
    itemId: 'flint',
    name: '부싯돌',
    era: 'paleolithic',
    minPlayerLevel: 1,
    rarity: 'common',
    hardness: 35,
    toughness: 20,
    corrosionResist: 70,
    specialTraits: ['날카로운 파쇄면', '불꽃 점화'],
    description: '타격 시 날카로운 모서리가 생기는 석기 시대 핵심 재료.',
    recommendedUses: '손도끼, 돌창, 화살촉, 불씨 점화',
  },
  {
    itemId: 'bone',
    name: '공룡 뼈',
    era: 'paleolithic',
    minPlayerLevel: 1,
    rarity: 'common',
    hardness: 30,
    toughness: 45,
    corrosionResist: 60,
    specialTraits: ['가벼운 골격', '탄력적 구조'],
    description: '가볍고 탄성이 우수하여 도구 손잡이와 뼈 활에 제격인 유기 재료.',
    recommendedUses: '뼈단검, 뼈 활, 원시 제단 의식',
  },
  {
    itemId: 'obsidian',
    name: '흑요석',
    era: 'paleolithic',
    minPlayerLevel: 1,
    rarity: 'rare',
    hardness: 55,
    toughness: 10,
    corrosionResist: 90,
    specialTraits: ['원자 단위 예리함', '유리질 파단면'],
    description: '화산 활동으로 급랭된 흑색 천연 유리석. 외과 수술용에 버금가는 극한의 절삭력.',
    recommendedUses: '흑요석 창, 특수 저격 칼날, 제단 공양',
  },

  // ── Lv. 11~19 청동기·교역 자원
  {
    itemId: 'copper_ore',
    name: '구리 원석 (Copper)',
    era: 'bronze',
    minPlayerLevel: 11,
    rarity: 'common',
    hardness: 45,
    toughness: 60,
    corrosionResist: 75,
    specialTraits: ['우수한 연성·전성', '뛰어난 열·전기 전도율'],
    description: '인류가 최초로 가공한 붉은 금속. 가공이 쉽고 주석과 만나면 비약적으로 단단해집니다.',
    recommendedUses: '초기 야금술, 구리 곡괭이(채굴속도 +40%), 청동 합금 주괴',
  },
  {
    itemId: 'tin_ore',
    name: '주석 원석 (Tin)',
    era: 'bronze',
    minPlayerLevel: 11,
    rarity: 'rare',
    hardness: 25,
    toughness: 30,
    corrosionResist: 85,
    specialTraits: ['낮은 용융점', '청동 합금 필수 촉매'],
    description: '은백색의 부드러운 희귀 금속. 구리에 소량 혼합하는 것만으로 강도를 3배 이상 끌어올립니다.',
    recommendedUses: '청동 합금술(구리 20 + 주석 8 + 목탄 15 → 청동 주괴 5)',
  },
  {
    itemId: 'bitumen',
    name: '역청 (Bitumen / 천연 아스팔트)',
    era: 'bronze',
    minPlayerLevel: 11,
    rarity: 'common',
    hardness: 15,
    toughness: 90,
    corrosionResist: 95,
    flammability: 80,
    specialTraits: ['100% 완전 방수', '초강력 유기 접착력', '화공 연소성'],
    description: '지하 원유가 지표로 스며 나와 굳은 흑색 끈적한 수지. 목재 부식을 완벽히 차단합니다.',
    recommendedUses: '역청 방수 성벽(내구도 2배), 역청 불화살 / 화염 투창 연료',
  },
  {
    itemId: 'silver_ore',
    name: '은광석 (Silver)',
    era: 'bronze',
    minPlayerLevel: 11,
    rarity: 'rare',
    hardness: 35,
    toughness: 50,
    corrosionResist: 70,
    specialTraits: ['신성력 증폭', '권위와 세공'],
    description: '달의 기운을 머금은 귀금속. 부족민의 사기를 북돋우고 신성한 의식을 거행할 때 필수적입니다.',
    recommendedUses: '은빛 제단 장식, 자력 나침반, 장신구 세공',
  },
  {
    itemId: 'gold_ore',
    name: '사금 · 금광석 (Gold)',
    era: 'bronze',
    minPlayerLevel: 11,
    rarity: 'ultra_rare',
    hardness: 20,
    toughness: 70,
    corrosionResist: 99,
    specialTraits: ['영구 불변성', '태양신의 권위(95)', '연구포인트 자동생산'],
    description: '시간이 흘러도 변색되지 않는 순금. 마을 중앙에 토템을 세우면 문명 연구 속도가 가속됩니다.',
    recommendedUses: '황금 토템(자동 연구 포인트 2배), 마스터워크(명품) 발명 촉매',
  },

  // ── Lv. 20~29 철기·자력 자원
  {
    itemId: 'magnetite',
    name: '자철석 (Magnetite / 고순도 철광)',
    era: 'iron',
    minPlayerLevel: 20,
    rarity: 'common',
    hardness: 80,
    toughness: 75,
    corrosionResist: 65,
    specialTraits: ['영구 자성 보유', '초고경도(80)', '심층 탐지 나침반'],
    description: '자석 성질을 띤 검은 철광석. 고온에서 불순물을 제거하면 단단하고 날카로운 강철이 됩니다.',
    recommendedUses: '강철 주괴 제련, 강철 대검, 자력 나침반(레이더 반경 1km → 3km)',
  },
  {
    itemId: 'coal',
    name: '석탄 (Coal)',
    era: 'iron',
    minPlayerLevel: 20,
    rarity: 'common',
    hardness: 20,
    toughness: 10,
    corrosionResist: 50,
    flammability: 90,
    specialTraits: ['열량 90 고온 연소', '용광로 필수 열원'],
    description: '목탄보다 2배 이상 높은 화력을 지속시키는 고순도 탄소 덩어리. 철 제련의 핵심 연료.',
    recommendedUses: '대형 용광로 가동, 강철 제련, 유황 화약 배합',
  },
  {
    itemId: 'limestone',
    name: '석회석 (Limestone)',
    era: 'iron',
    minPlayerLevel: 20,
    rarity: 'common',
    hardness: 40,
    toughness: 30,
    corrosionResist: 60,
    specialTraits: ['슬래그 환원 촉매', '석회 모르타르 결속'],
    description: '철광석을 녹일 때 규소 등 불순물을 흡착해 깨끗한 쇳물을 얻도록 돕는 필수 제련 광물.',
    recommendedUses: '강철 제련 슬래그 제거, 강화 성벽 접착 모르타르',
  },
  {
    itemId: 'sulfur',
    name: '유황 (Sulfur)',
    era: 'iron',
    minPlayerLevel: 20,
    rarity: 'rare',
    hardness: 15,
    toughness: 10,
    corrosionResist: 40,
    flammability: 85,
    specialTraits: ['극렬 화공 반응', '유독성 가스', '화약의 3대 요소'],
    description: '화산 지대와 온천 분출구에서 채취되는 황색 결정. 특유의 자극적인 냄새와 폭발성을 가집니다.',
    recommendedUses: '공돌이 주술사 화약통/발리스타, 흑마술사 유황 독안개 폭탄',
  },

  // ── Lv. 30+ 연금·초기 산업 자원
  {
    itemId: 'mercury',
    name: '진사 · 수은 (Mercury)',
    era: 'alchemy_industry',
    minPlayerLevel: 30,
    rarity: 'rare',
    hardness: 5,
    toughness: 95,
    corrosionResist: 85,
    specialTraits: ['상온 액체 금속', '물질 변환 촉매', '암흑 제물 반응'],
    description: '붉은 진사를 증류하여 얻는 은빛 액체 금속. 연금술과 주술사의 비전 의식에 쓰입니다.',
    recommendedUses: '마법/흑마술사 궁극기 촉매, 스컬 드래곤 강화 의식',
  },
  {
    itemId: 'meteor_shard',
    name: '운석 파편 (Meteor Shard)',
    era: 'alchemy_industry',
    minPlayerLevel: 30,
    rarity: 'ultra_rare',
    hardness: 95,
    toughness: 90,
    corrosionResist: 98,
    specialTraits: ['미지의 우주 합금', '영구 보존 동력원', '절대 파괴 불가'],
    description: '외계에서 낙하한 천체의 핵 파편. 지구상에 없는 강도와 미지의 에너지를 방출합니다.',
    recommendedUses: '자동 방어 포탑 영구 동력로, 신화급 무기 제련',
  },
  {
    itemId: 'mana_stone',
    name: '고대 마력석 (Mana Stone)',
    era: 'alchemy_industry',
    minPlayerLevel: 30,
    rarity: 'ultra_rare',
    hardness: 70,
    toughness: 50,
    corrosionResist: 95,
    specialTraits: ['정제된 원소 응결체', '무한 마나 방출'],
    description: '대지의 지맥이 굳어 형성된 푸른 발광 광석. 마법술사의 원소 주문을 극한으로 증폭합니다.',
    recommendedUses: '원소 스킬 4단계 해금, 전설급 속성 인챈트',
  },
];

export function getUnlockedResourcesByLevel(playerLevel: number): ResourceMeta[] {
  return UNLOCKABLE_RESOURCES.filter(r => playerLevel >= r.minPlayerLevel);
}

export function getCurrentCivilizationEra(playerLevel: number): EraTierInfo {
  if (playerLevel >= 30) return CIVILIZATION_ERAS.alchemy_industry;
  if (playerLevel >= 20) return CIVILIZATION_ERAS.iron;
  if (playerLevel >= 11) return CIVILIZATION_ERAS.bronze;
  return CIVILIZATION_ERAS.paleolithic;
}

export function rollResourceDropForLevel(
  playerLevel: number,
  tier: 'field' | 'expedition' | 'dino_run',
  random: () => number = Math.random
): Stack[] {
  const drops: Stack[] = [];
  const pool = getUnlockedResourcesByLevel(playerLevel);

  if (playerLevel >= 11) {
    if (random() < 0.45) {
      drops.push({ itemId: 'copper_ore', count: 1 + Math.floor(random() * 2) });
    }
    if (random() < 0.25) {
      drops.push({ itemId: 'bitumen', count: 1 + Math.floor(random() * 2) });
    }
    if (random() < 0.15) {
      drops.push({ itemId: 'tin_ore', count: 1 });
    }
    if (random() < 0.08) {
      drops.push({ itemId: 'silver_ore', count: 1 });
    }
    if (random() < 0.03) {
      drops.push({ itemId: 'gold_ore', count: 1 });
    }
  }

  if (playerLevel >= 20) {
    if (random() < 0.35) {
      drops.push({ itemId: 'magnetite', count: 1 + Math.floor(random() * 2) });
    }
    if (random() < 0.30) {
      drops.push({ itemId: 'coal', count: 2 + Math.floor(random() * 2) });
    }
    if (random() < 0.25) {
      drops.push({ itemId: 'limestone', count: 1 + Math.floor(random() * 2) });
    }
    if (random() < 0.12) {
      drops.push({ itemId: 'sulfur', count: 1 });
    }
  }

  if (playerLevel >= 30) {
    if (random() < 0.10) {
      drops.push({ itemId: 'mercury', count: 1 });
    }
    if (random() < 0.04) {
      drops.push({ itemId: 'meteor_shard', count: 1 });
    }
    if (random() < 0.05) {
      drops.push({ itemId: 'mana_stone', count: 1 });
    }
  }

  return drops;
}
