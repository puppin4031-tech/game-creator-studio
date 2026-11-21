import type { ItemId } from './items';
import type { Stack } from './types';
import { addStacks, countOf } from './inventory';
import { CIVILIZATION_ERAS, type CivilizationEra, type EraTierInfo } from '@/data/resources';

export interface CivTechDef {
  id: string;
  title: string;
  icon: string;
  era: CivilizationEra;
  minPlayerLevel: number;
  requiresTechs: string[];
  cost: Stack[];
  effectsSummary: string;
  unlocks: string[];
  passiveTag: string;
}

export const CIV_TECHS: CivTechDef[] = [
  // ── [Tier 1] 원시 정착 시대 (Lv. 1 ~ 10)
  {
    id: 'tech_fire_gathering',
    title: '채집과 불의 발견',
    icon: '🔥',
    era: 'paleolithic',
    minPlayerLevel: 1,
    requiresTechs: [],
    cost: [],
    effectsSummary: '불씨를 피워 음식을 익히고 체온을 유지합니다.',
    unlocks: ['모닥불', '나무 몽둥이', '기초 돌모루'],
    passiveTag: 'BASIC_SURVIVAL',
  },
  {
    id: 'tech_stone_knapping',
    title: '석기 타격술 & 결속',
    icon: '🪨',
    era: 'paleolithic',
    minPlayerLevel: 3,
    requiresTechs: ['tech_fire_gathering'],
    cost: [
      { itemId: 'branch', count: 10 },
      { itemId: 'flint', count: 5 },
      { itemId: 'fiber', count: 5 },
    ],
    effectsSummary: '단단한 부싯돌을 쳐서 날을 세우고 손잡이를 단단히 묶습니다.',
    unlocks: ['주먹도끼', '돌곡괭이 (광석 채굴)', '나뭇가지 울타리'],
    passiveTag: 'MINING_UNLOCKED',
  },
  {
    id: 'tech_pottery_hunting',
    title: '토기 제작과 수렵술',
    icon: '🏺',
    era: 'paleolithic',
    minPlayerLevel: 6,
    requiresTechs: ['tech_stone_knapping'],
    cost: [
      { itemId: 'clay', count: 15 },
      { itemId: 'bone', count: 5 },
    ],
    effectsSummary: '점토를 빚어 음식을 보관하고 공룡 뼈로 예리한 사냥 도구를 만듭니다.',
    unlocks: ['화로 (고기 훈제)', '원시 창고 (적재량 +30kg)', '뼈단검 & 사냥용 투석구 (포획률 +20%)'],
    passiveTag: 'HUNTING_EXPEDITION',
  },
  {
    id: 'tech_megalith_architecture',
    title: '거석 신앙과 원시 건축',
    icon: '🗿',
    era: 'paleolithic',
    minPlayerLevel: 9,
    requiresTechs: ['tech_pottery_hunting'],
    cost: [
      { itemId: 'quartz', count: 15 },
      { itemId: 'obsidian', count: 3 },
      { itemId: 'log', count: 10 },
    ],
    effectsSummary: '거대한 바위를 깎아 성소와 방책을 세우고 야간 시야를 넓힙니다.',
    unlocks: ['고대 제단 (AI 자유 발명 3슬롯)', '통나무 방책 (내구도 300)', '망루 (야간 시야 +30m)'],
    passiveTag: 'ALTAR_UNLOCKED',
  },

  // ── [Tier 2] 청동기 & 교역 시대 (Lv. 11 ~ 19)
  {
    id: 'tech_bitumen_waterproofing',
    title: '역청 방수 및 화공술',
    icon: '🛢️',
    era: 'bronze',
    minPlayerLevel: 11,
    requiresTechs: ['tech_megalith_architecture'],
    cost: [
      { itemId: 'bitumen', count: 10 },
      { itemId: 'log', count: 15 },
      { itemId: 'clay', count: 10 },
    ],
    effectsSummary: '천연 역청을 발라 성벽 내구도를 30% 강화하고 불화살을 제작합니다.',
    unlocks: [
      '모든 울타리/성벽 부식 저항 100% & 내구도 +30%',
      '역청 불화살 / 화염 투창 (적 피격 시 지속 화상 피해)',
    ],
    passiveTag: 'BITUMEN_FORTIFY',
  },
  {
    id: 'tech_early_metallurgy',
    title: '초기 야금술 (구리 제련)',
    icon: '⛏️',
    era: 'bronze',
    minPlayerLevel: 13,
    requiresTechs: ['tech_bitumen_waterproofing'],
    cost: [
      { itemId: 'copper_ore', count: 15 },
      { itemId: 'quartz', count: 20 },
    ],
    effectsSummary: '붉은 구리 원석을 녹여 최초의 금속 주괴와 도구를 주조합니다.',
    unlocks: ['구리 주괴 제련 해금', '구리 곡괭이 (채굴 속도 +40%)', '구리 단검'],
    passiveTag: 'COPPER_METALLURGY',
  },
  {
    id: 'tech_bronze_alloying',
    title: '청동 합금술',
    icon: '⚔️',
    era: 'bronze',
    minPlayerLevel: 15,
    requiresTechs: ['tech_early_metallurgy'],
    cost: [
      { itemId: 'copper_ore', count: 20 },
      { itemId: 'tin_ore', count: 8 },
      { itemId: 'charcoal', count: 15 },
    ],
    effectsSummary: '구리와 주석을 합금해 단단한 청동 주괴를 생산하고 방패를 무장합니다.',
    unlocks: [
      '용광로 청동 주괴 합금 생산',
      '청동 창 & 청동 방패 (탱커 부족민 방어력 +35%)',
      '화강암 성벽 건설',
    ],
    passiveTag: 'BRONZE_AGE',
  },
  {
    id: 'tech_precious_metals',
    title: '귀금속 세공 & 화폐/권위',
    icon: '👑',
    era: 'bronze',
    minPlayerLevel: 18,
    requiresTechs: ['tech_bronze_alloying'],
    cost: [
      { itemId: 'silver_ore', count: 5 },
      { itemId: 'gold_ore', count: 2 },
      { itemId: 'jade', count: 5 },
    ],
    effectsSummary: '순금과 은을 가공해 부족의 권위를 세우고 신탁 발명 성공률을 올립니다.',
    unlocks: [
      '황금 토템 & 은빛 제단 장식 (연구 포인트 자동 생산 2배)',
      '주술사 AI 제단 발명 시 마스터워크(Masterwork) 등장 확률 +40%',
    ],
    passiveTag: 'GOLDEN_TOTEM',
  },

  // ── [Tier 3] 철기 & 자력 탐사 시대 (Lv. 20 ~ 29)
  {
    id: 'tech_high_bellows',
    title: '고온 풀무와 연료학',
    icon: '🌋',
    era: 'iron',
    minPlayerLevel: 20,
    requiresTechs: ['tech_precious_metals'],
    cost: [
      { itemId: 'coal', count: 20 },
      { itemId: 'limestone', count: 15 },
      { itemId: 'hide', count: 10 },
    ],
    effectsSummary: '석탄과 가죽 풀무로 초고온 화력을 만들어 대장간과 대형 용광로를 가동합니다.',
    unlocks: [
      '대형 용광로 & 대장간 건설 해금',
      '주술사 4대 전직 분기 시설 시너지 활성화',
    ],
    passiveTag: 'BELLOWS_FORGE',
  },
  {
    id: 'tech_magnetite_steel',
    title: '자철석 제련과 강철',
    icon: '🛡️',
    era: 'iron',
    minPlayerLevel: 22,
    requiresTechs: ['tech_high_bellows'],
    cost: [
      { itemId: 'magnetite', count: 20 },
      { itemId: 'coal', count: 25 },
      { itemId: 'limestone', count: 10 },
    ],
    effectsSummary: '자철석의 불순물을 석회석으로 정화해 최고 등급 강철을 생산합니다.',
    unlocks: [
      '강철 주괴 생산 해금',
      '강철 대검 & 강철 판금 갑옷 (방어력 +50)',
      '철제 강화 성문 (내구도 1,500)',
    ],
    passiveTag: 'STEEL_AGE',
  },
  {
    id: 'tech_magnetic_compass',
    title: '자력 나침반 & 심층 레이더',
    icon: '🧭',
    era: 'iron',
    minPlayerLevel: 25,
    requiresTechs: ['tech_magnetite_steel'],
    cost: [
      { itemId: 'magnetite', count: 10 },
      { itemId: 'silver_ore', count: 5 },
      { itemId: 'bronze_ingot', count: 5 },
    ],
    effectsSummary: '자철석의 자성으로 나침반을 발명해 레이더 탐지 거리를 3km로 확장합니다.',
    unlocks: [
      '고대 자석 나침반 발명 (전략 레이더 탐지 반경 1km → 3km 2배 이상 확장)',
      '우두머리 보스 & 희귀 공룡 알 실시간 정밀 좌표 포착',
    ],
    passiveTag: 'RADAR_EXPANSION',
  },
  {
    id: 'tech_sulfur_alchemy',
    title: '유황 연금 & 화약 기초',
    icon: '💣',
    era: 'iron',
    minPlayerLevel: 28,
    requiresTechs: ['tech_magnetic_compass'],
    cost: [
      { itemId: 'sulfur', count: 10 },
      { itemId: 'coal', count: 15 },
      { itemId: 'bitumen', count: 10 },
    ],
    effectsSummary: '유황과 석탄의 화학 반응으로 폭발성 화약과 유독성 독안개를 제조합니다.',
    unlocks: [
      '공돌이 주술사: 원시 화약통 / 연발 발리스타 해금',
      '마법·흑마술사: 유황 독안개 폭탄 / 지옥불 인챈트 해금',
    ],
    passiveTag: 'SULFUR_FIREWORKS',
  },

  // ── [Tier 4] 연금 & 초기 산업 시대 (Lv. 30+)
  {
    id: 'tech_mercury_transmutation',
    title: '수은 변환과 진사 연금',
    icon: '⚡',
    era: 'alchemy_industry',
    minPlayerLevel: 30,
    requiresTechs: ['tech_sulfur_alchemy'],
    cost: [
      { itemId: 'mercury', count: 10 },
      { itemId: 'mana_stone', count: 2 },
      { itemId: 'meteor_shard', count: 1 },
    ],
    effectsSummary: '액체 금속 수은과 우주 운석의 에너지를 융합해 오버테크 동력을 확보합니다.',
    unlocks: [
      '자동화 방어 포탑 증기 동력로',
      '스컬 드래곤 암흑 초월 각성',
      '신화급 무기/방어구 AI 발명 해금',
    ],
    passiveTag: 'OVERTECH_AGE',
  },
];

export interface CivTechProgress {
  tech: CivTechDef;
  isUnlocked: boolean;
  canResearch: boolean;
  reason?: string;
  missingMaterials: Stack[];
}

export function checkCivTechStatus(
  tech: CivTechDef,
  playerLevel: number,
  researchedTechs: string[],
  storage: Stack[],
  backpack: Stack[]
): CivTechProgress {
  const isUnlocked = researchedTechs.includes(tech.id);
  if (isUnlocked) {
    return { tech, isUnlocked: true, canResearch: false, missingMaterials: [] };
  }

  const owned = addStacks(storage, backpack);
  const missingMaterials: Stack[] = [];

  for (const c of tech.cost) {
    const have = countOf(owned, c.itemId);
    if (have < c.count) {
      missingMaterials.push({ itemId: c.itemId, count: c.count - have });
    }
  }

  if (playerLevel < tech.minPlayerLevel) {
    return {
      tech,
      isUnlocked: false,
      canResearch: false,
      reason: `족장 레벨 Lv.${tech.minPlayerLevel} 이상 필요 (현재 Lv.${playerLevel})`,
      missingMaterials,
    };
  }

  const unmetPre = tech.requiresTechs.filter(id => !researchedTechs.includes(id));
  if (unmetPre.length > 0) {
    const preNames = unmetPre
      .map(id => CIV_TECHS.find(t => t.id === id)?.title ?? id)
      .join(', ');
    return {
      tech,
      isUnlocked: false,
      canResearch: false,
      reason: `선행 기술 미달: [${preNames}] 연구 필요`,
      missingMaterials,
    };
  }

  if (missingMaterials.length > 0) {
    return {
      tech,
      isUnlocked: false,
      canResearch: false,
      reason: '필요 연구 재료 부족',
      missingMaterials,
    };
  }

  return { tech, isUnlocked: false, canResearch: true, missingMaterials: [] };
}

export function getCivilizationEraBadge(researchedTechs: string[], playerLevel: number): EraTierInfo {
  if (researchedTechs.includes('tech_mercury_transmutation') || playerLevel >= 30) {
    return CIVILIZATION_ERAS.alchemy_industry;
  }
  if (researchedTechs.includes('tech_high_bellows') || playerLevel >= 20) {
    return CIVILIZATION_ERAS.iron;
  }
  if (researchedTechs.includes('tech_bitumen_waterproofing') || playerLevel >= 11) {
    return CIVILIZATION_ERAS.bronze;
  }
  return CIVILIZATION_ERAS.paleolithic;
}
