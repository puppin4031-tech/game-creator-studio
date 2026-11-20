// Shaman Quest System & 4 Evolution Paths
// Implements 5-stage Shaman progression with village synchronization and 4 specialized classes:
// 1. Engineer (공돌이) 2. Elementalist Mage (마법술사) 3. Necromancer Warlock (흑마술사) 4. Orthodox Sage (정직한 주술사)

import type { Stack } from './types';
import type { ItemId } from './items';
import type { VillageBuildingId, VillageState } from './village';
import type { OwnedPet } from './pets';

export type ShamanLevel = 1 | 2 | 3 | 4 | 5;

export type ShamanClassId =
  | 'NONE'
  | 'ENGINEER'
  | 'MAGE'
  | 'NECROMANCER'
  | 'HONEST'
  | 'engineer'
  | 'mage'
  | 'warlock'
  | 'orthodox';

export interface ClassTierUnlock {
  tier: 1 | 2 | 3;
  buildingName: string;
  recipeOrSkillName: string;
  ingredients: { itemId: string; name: string; count: number }[];
  effectDesc: string;
}

export interface ShamanClassConfig {
  id: 'ENGINEER' | 'MAGE' | 'NECROMANCER' | 'HONEST' | 'engineer' | 'mage' | 'warlock' | 'orthodox';
  canonicalId: 'ENGINEER' | 'MAGE' | 'NECROMANCER' | 'HONEST';
  name: string;
  title: string;
  icon: string;
  themeColor: string;
  borderColor: string;
  bgGradient: string;
  // 전용 메커니즘 자원
  resourceName: string;
  resourceIcon: string;
  resourceUnit: string;
  ultimateActionName: string;
  ultimateCost: number;
  ultimateDesc: string;
  // 전용 NPC
  npc: {
    name: string;
    role: string;
    dialogue: string;
    tapRewardDesc: string;
  };
  // 마을 및 페이퍼돌 비주얼
  auraClass: string;
  headgearLabel: string;
  villageTint: string;
  // 3단계 테크트리
  tiers: ClassTierUnlock[];

  // Legacy compatibility helpers
  appearance?: string;
  badge?: string;
  auraText?: string;
  concept?: string;
  facilitiesDesc?: string;
  resourcesDesc?: string;
  skillsDesc?: string;
  featuresDesc?: string;
  desc?: string;
  motto?: string;
  pros?: string[];
  cons?: string[];
  borderClass?: string;
  textClass?: string;
}

export const BASE_SHAMAN_CLASSES: Record<'ENGINEER' | 'MAGE' | 'NECROMANCER' | 'HONEST', ShamanClassConfig> = {
  ENGINEER: {
    id: 'ENGINEER',
    canonicalId: 'ENGINEER',
    name: '공돌이 주술사',
    title: '증기와 강철의 개척자',
    icon: '🔧',
    themeColor: 'text-orange-400',
    borderColor: 'border-orange-500',
    bgGradient: 'from-orange-950/90 to-stone-900/95',
    resourceName: '증기압',
    resourceIcon: '⚙️',
    resourceUnit: '%',
    ultimateActionName: '폭주 기관 가동',
    ultimateCost: 100,
    ultimateDesc: '30초간 마을 생산량·포탑 공속 2배 폭증 후 냉각',
    npc: {
      name: '강철수염 뚝딱이',
      role: '전속 대장장이',
      dialogue: '쇳물은 식기 전에 쳐야 제맛이지! 석탄 좀 더 퍼와!',
      tapRewardDesc: '터치 시 10분간 제련 속도 2배 버프',
    },
    auraClass: 'drop-shadow-[0_0_6px_rgba(249,115,22,0.85)]',
    headgearLabel: '황동 고글',
    villageTint: 'bg-orange-900/15',
    tiers: [
      {
        tier: 1,
        buildingName: '풀무 용광로',
        recipeOrSkillName: '청동 주괴 제련',
        ingredients: [
          { itemId: 'copper_ore', name: '구리 원석', count: 3 },
          { itemId: 'tin_ore', name: '주석 원석', count: 1 },
          { itemId: 'coal', name: '목탄/석탄', count: 2 },
        ],
        effectDesc: '5분마다 금속 주괴 자동 제련 (오프라인 지원)',
      },
      {
        tier: 2,
        buildingName: '자동 발리스타 포탑',
        recipeOrSkillName: '증기 압력 망치',
        ingredients: [
          { itemId: 'bronze_ingot', name: '청동 주괴', count: 5 },
          { itemId: 'hard_wood', name: '통나무', count: 15 },
        ],
        effectDesc: '거점 40m 내 야생 짐승 자동 요격 / 망치 타격 시 광역 기절',
      },
      {
        tier: 3,
        buildingName: '자동 광맥 드릴',
        recipeOrSkillName: '강철 주괴 & 태엽 판금갑옷',
        ingredients: [
          { itemId: 'magnetite', name: '자철석', count: 15 },
          { itemId: 'coal', name: '석탄', count: 20 },
          { itemId: 'limestone', name: '석회석', count: 10 },
        ],
        effectDesc: '1시간마다 광물 자동 채굴 / 탱커 방어력 +80% (내구도 소모 0)',
      },
    ],
    // Legacy fields for backward compatibility
    appearance: '(고글 & 망치)',
    badge: '🔧 근대 공업 & 제련 테크',
    auraText: '회전하는 황동 톱니바퀴와 풀무 불꽃 오라',
    concept: '근대 공업 & 제련 테크',
    facilitiesDesc: '풀무 용광로, 자동 발리스타 포탑, 자동 광맥 드릴',
    resourcesDesc: '구리 원석, 주석 원석, 석탄, 청동 주괴, 강철 주괴',
    featuresDesc: '자동화 방어 포탑 건설, 증기압 관리(0~100%), 내구도 소모 없는 태엽 판금갑옷',
    desc: '원시 자연의 한계를 거부하고 열역학과 기계공학으로 마을을 개조하는 공학 주술사.',
    motto: '"마법은 환상일 뿐, 강철과 기계만이 영원한 문명을 약속한다."',
    pros: [
      '압도적인 건물/성벽 내구도 및 자동 방어 포탑',
      '증기압 50% 이상 유지 시 생산속도 +100%',
      '강철 주괴 및 태엽 판금갑옷으로 방어력 +80% 극대화',
    ],
    cons: [
      '원소 마법 스킬 사용 불가',
      '광석과 석탄/목탄 연료 지속 소모',
    ],
    borderClass: 'border-orange-500',
    textClass: 'text-orange-400',
  },

  MAGE: {
    id: 'MAGE',
    canonicalId: 'MAGE',
    name: '마법술사',
    title: '원소 공명의 대현자',
    icon: '🔮',
    themeColor: 'text-sky-400',
    borderColor: 'border-sky-400',
    bgGradient: 'from-sky-950/90 to-indigo-950/95',
    resourceName: '원소 마나',
    resourceIcon: '✨',
    resourceUnit: 'MP',
    ultimateActionName: '원소 공명 폭발',
    ultimateCost: 50,
    ultimateDesc: '화염+빙결(융해 2배) / 빙결+번개(방어력 -50%) 발동',
    npc: {
      name: '별지기 꼬마 루나',
      role: '공중부양 견습생',
      dialogue: '오늘 밤 별자리가 삐뚤어졌어... 마나 가루 줄게!',
      tapRewardDesc: '터치 시 원소 마나 +15 즉시 획득',
    },
    auraClass: 'drop-shadow-[0_0_8px_rgba(56,189,248,0.9)]',
    headgearLabel: '청록 마법진',
    villageTint: 'bg-sky-900/15',
    tiers: [
      {
        tier: 1,
        buildingName: '마력 응축 첨탑',
        recipeOrSkillName: '파이어볼 / 아이스볼',
        ingredients: [
          { itemId: 'obsidian', name: '흑요석', count: 5 },
          { itemId: 'silver_ore', name: '은광석', count: 3 },
        ],
        effectDesc: '30분마다 마나 자동 생산 / 탐험 중 원소 스킬 시전',
      },
      {
        tier: 2,
        buildingName: '원소 인챈트 공방',
        recipeOrSkillName: '썬더볼트 / 마나 실드',
        ingredients: [
          { itemId: 'gold_ore', name: '금광석', count: 2 },
          { itemId: 'magnetite', name: '자철석', count: 5 },
        ],
        effectDesc: '무기에 원소 속성 부여 / 공룡 3마리 전원 35% 보호막',
      },
      {
        tier: 3,
        buildingName: '대마도사의 관측소',
        recipeOrSkillName: '궁극기: 메테오 샤워',
        ingredients: [
          { itemId: 'meteor_shard', name: '운석 파편', count: 2 },
          { itemId: 'sulfur', name: '유황', count: 10 },
        ],
        effectDesc: '화면 전체 픽셀 운석 5발 낙하 / 모든 원소 공명 피해 +40%',
      },
    ],
    // Legacy fields
    appearance: '(푸른 로브 & 수정 지팡이)',
    badge: '🔮 원소 마법 & 2원소 공명',
    auraText: '영롱하게 타오르는 푸른 로브와 수정 지팡이 마나 오라',
    concept: '원소 공명 & 스펠 조합',
    facilitiesDesc: '마력 응축 첨탑, 원소 인챈트 공방, 대마도사의 관측소',
    resourcesDesc: '흑요석, 은광석, 금광석, 유황, 운석 파편',
    featuresDesc: '2원소 반응 (융해 2배, 초전도 방어력 -50%, 과부하 넉백), 메테오 샤워',
    desc: '물리적 재료를 순수 마력으로 치환해 화려한 스킬과 원소 상성으로 전장을 지배하는 마법술사.',
    motto: '"대지의 원소들이여, 내 부름에 응하여 적들을 재로 만들어라!"',
    pros: [
      '2원소 공명 반응 (융해 2.0배, 초전도 -50% 방어력 감소)',
      '공룡 3마리 전원 마나 실드(35% 보호막)',
      '궁극기 메테오 샤워로 화면 전체 적 초토화',
    ],
    cons: [
      '물리 건축물/성벽 내구도가 약함',
      '지속적인 원소 마나 소모',
    ],
    borderClass: 'border-sky-400',
    textClass: 'text-sky-400',
  },

  NECROMANCER: {
    id: 'NECROMANCER',
    canonicalId: 'NECROMANCER',
    name: '흑마술사',
    title: '영혼과 뼈의 지배자',
    icon: '💀',
    themeColor: 'text-purple-400',
    borderColor: 'border-purple-500',
    bgGradient: 'from-purple-950/90 to-zinc-950/95',
    resourceName: '영혼 파편',
    resourceIcon: '👻',
    resourceUnit: '개',
    ultimateActionName: '스컬 군단 소환',
    ultimateCost: 15,
    ultimateDesc: '전투 시 앞열에 해골 전사 2기 자동 소환 (펫 피해 대신 흡수)',
    npc: {
      name: '뼈다귀 집사 달그락',
      role: '충성스러운 해골 집사',
      dialogue: '달그락... 끼이익! (창고를 정리 중입니다)',
      tapRewardDesc: '터치 시 일정 확률로 공룡 뼈 1~2개 드랍',
    },
    auraClass: 'drop-shadow-[0_0_8px_rgba(168,85,247,0.9)]',
    headgearLabel: '뼈 견갑 & 음기',
    villageTint: 'bg-purple-950/25',
    tiers: [
      {
        tier: 1,
        buildingName: '맹독 가마솥',
        recipeOrSkillName: '약화 저주 / 맹독 코팅제',
        ingredients: [
          { itemId: 'granite', name: '화강암', count: 15 },
          { itemId: 'bitumen', name: '역청', count: 5 },
        ],
        effectDesc: '보스 공격력 -40% 저주 / 무기 타격 시 최대체력 3% 중독',
      },
      {
        tier: 2,
        buildingName: '영혼의 납골당',
        recipeOrSkillName: '스컬 군단 소환',
        ingredients: [
          { itemId: 'bone', name: '공룡 뼈', count: 20 },
          { itemId: 'obsidian', name: '흑요석', count: 5 },
        ],
        effectDesc: '사망한 공룡을 영혼핵으로 보존 / 해골 전사 2기 자동 소환',
      },
      {
        tier: 3,
        buildingName: '암흑 강령 제단',
        recipeOrSkillName: '궁극 진화: 스컬 드래곤',
        ingredients: [
          { itemId: 'obsidian', name: '흑요석', count: 10 },
          { itemId: 'mercury', name: '수은', count: 2 },
        ],
        effectDesc: 'Lv.4+ 공룡을 전설 [스컬 드래곤]으로 진화 (스탯 2.2배 + 15% 흡혈)',
      },
    ],
    // Legacy fields
    appearance: '(해골 가면 & 보라색 오라)',
    badge: '💀 영혼 수확 & 언데드 연성',
    auraText: '검푸른 심연의 연기와 해골 가면 보라색 오라',
    concept: '영혼 수확 & 언데드 군단',
    facilitiesDesc: '맹독 가마솥, 영혼의 납골당, 암흑 강령 제단',
    resourcesDesc: '공룡 뼈, 흑요석, 역청, 영혼 파편, 수은',
    featuresDesc: '사망 공룡 영혼핵 변환, 해골 전사 고기방패, 전설 등급 [스컬 드래곤] 각성',
    desc: '죽음과 공포를 자원화하여, 공룡의 죽음 리스크를 역이용해 불사의 언데드 군단을 구축하는 흑마술사.',
    motto: '"죽음은 끝이 아닌 새로운 군단의 시작일지니."',
    pros: [
      '해골 전사 소환으로 펫 피해 완벽 분산 (고기방패)',
      '보스 공격력 -40% 약화 저주 & 맹독 코팅',
      '전설 [스컬 드래곤] 진화 (스탯 2.2배 + 15% 흡혈 + 소멸 면제)',
    ],
    cons: [
      '마을 휴식 효율 감소',
      '진화 및 연성 시 뼈와 영혼 파편 제물 지속 요구',
    ],
    borderClass: 'border-purple-500',
    textClass: 'text-purple-400',
  },

  HONEST: {
    id: 'HONEST',
    canonicalId: 'HONEST',
    name: '정직한 주술사',
    title: '정통 문명과 풍요의 수호자',
    icon: '👑',
    themeColor: 'text-amber-300',
    borderColor: 'border-amber-400',
    bgGradient: 'from-amber-950/90 to-emerald-950/95',
    resourceName: '부족 화합도',
    resourceIcon: '☀️',
    resourceUnit: '%',
    ultimateActionName: '대풍년 축제 개최',
    ultimateCost: 100,
    ultimateDesc: '24시간 채집량 +50%, 알 부화 거리 -40%, 합체 축복 확률 +30%',
    npc: {
      name: '풍년 할매 순자',
      role: '마을 큰어르신',
      dialogue: '아이고 우리 족장님, 밥은 먹고 다니나? 스튜 한 그릇 하쇼!',
      tapRewardDesc: '터치 시 모든 펫·용병 체력 100% 즉시 회복',
    },
    auraClass: 'drop-shadow-[0_0_6px_rgba(251,191,36,0.85)]',
    headgearLabel: '황금 깃털관',
    villageTint: 'bg-amber-400/10',
    tiers: [
      {
        tier: 1,
        buildingName: '고대 교역소',
        recipeOrSkillName: '활력의 만찬',
        ingredients: [
          { itemId: 'hard_wood', name: '통나무', count: 20 },
          { itemId: 'copper_ore', name: '구리 원석', count: 5 },
        ],
        effectDesc: '기초 재료를 희귀 광물로 교환 / 탐험대 공격력 +25% 버프 요리',
      },
      {
        tier: 2,
        buildingName: '부족 대집회소',
        recipeOrSkillName: '선별 교배술',
        ingredients: [
          { itemId: 'granite', name: '화강암', count: 25 },
          { itemId: 'gold_ore', name: '금광석', count: 2 },
        ],
        effectDesc: '거점 수호 펫 배치 한도 3마리 → 4마리 확장 / 전원 최대 HP +25%',
      },
      {
        tier: 3,
        buildingName: '태양의 거대 토템',
        recipeOrSkillName: '족장의 황금 예복',
        ingredients: [
          { itemId: 'marble', name: '대리석', count: 20 },
          { itemId: 'gold_ore', name: '금광석', count: 5 },
        ],
        effectDesc: '거점 반경 50m → 100m 확장 / 모든 제작 재료 소모 -20% 영구 절감',
      },
    ],
    // Legacy fields
    appearance: '(황금 깃털관 & 토템 지팡이)',
    badge: '👑 역사적 정통 문명 & 조화 성장',
    auraText: '황금 깃털관과 토템 지팡이 성스러운 문명 번영 광채',
    concept: '부족 화합도 & 정통 문명',
    facilitiesDesc: '고대 교역소, 부족 대집회소, 태양의 거대 토템',
    resourcesDesc: '통나무, 화강암, 대리석, 금광석, 깃털',
    featuresDesc: '부족 화합도(0~100%), 대풍년 축제(24시간 버프), 거점 반경 100m 확장',
    desc: '마법이나 기괴한 흑마술 없이, 인류사의 정석적인 농경·목축·교역·공동체 문화로 부족을 번영시키는 정통 주술사.',
    motto: '"땀 흘려 일군 대지와 원칙만이 흔들리지 않는 제국을 낳는다."',
    pros: [
      '대풍년 축제로 24시간 채집량 +50% 및 알 부화 거리 -40%',
      '수호 펫 한도 4마리 확장 및 전원 체력 +25%',
      '거점 반경 100m로 대폭 확장 & 모든 제작 재료 -20% 영구 절감',
    ],
    cons: [
      '단기 화력보다 점진적 조화 번영 중심 성장',
    ],
    borderClass: 'border-amber-400',
    textClass: 'text-amber-400',
  },
};

/** Normalize any class key (e.g. 'engineer' or 'ENGINEER') to canonical uppercase key */
export function normalizeShamanClassId(id: ShamanClassId | string | null | undefined): 'ENGINEER' | 'MAGE' | 'NECROMANCER' | 'HONEST' | null {
  if (!id || id === 'NONE') return null;
  const upper = id.toUpperCase();
  if (upper === 'ENGINEER') return 'ENGINEER';
  if (upper === 'MAGE') return 'MAGE';
  if (upper === 'NECROMANCER' || upper === 'WARLOCK') return 'NECROMANCER';
  if (upper === 'HONEST' || upper === 'ORTHODOX') return 'HONEST';
  return null;
}

// Bi-directional dictionary so code can index by 'engineer' or 'ENGINEER' seamlessly
export const SHAMAN_CLASSES: Record<string, ShamanClassConfig> = {
  ENGINEER: BASE_SHAMAN_CLASSES.ENGINEER,
  engineer: { ...BASE_SHAMAN_CLASSES.ENGINEER, id: 'engineer' },
  MAGE: BASE_SHAMAN_CLASSES.MAGE,
  mage: { ...BASE_SHAMAN_CLASSES.MAGE, id: 'mage' },
  NECROMANCER: BASE_SHAMAN_CLASSES.NECROMANCER,
  warlock: { ...BASE_SHAMAN_CLASSES.NECROMANCER, id: 'warlock' },
  HONEST: BASE_SHAMAN_CLASSES.HONEST,
  orthodox: { ...BASE_SHAMAN_CLASSES.HONEST, id: 'orthodox' },
};

export type ShamanClassMeta = ShamanClassConfig;

export interface ShamanQuestStage {
  fromLevel: ShamanLevel;
  toLevel: ShamanLevel;
  title: string;
  subtitle: string;
  questName: string;
  storyQuote: string;
  requiredMaterials: { itemId: ItemId; count: number; label: string }[];
  requiredBuildings?: { buildingId: VillageBuildingId; label: string }[];
  minWalls?: number;
  minTowers?: number;
  minPets?: number;
  minExpeditionDistanceM?: number;
  minMergedPetLevel?: number;
  rewardsSummary: string;
  unlockedFeatures: string[];
}

export const SHAMAN_QUEST_STAGES: ShamanQuestStage[] = [
  {
    fromLevel: 1,
    toLevel: 2,
    title: '불씨의 기억',
    subtitle: '거점 Lv.1 → Lv.2 승급 조건',
    questName: '차가운 밤을 몰아내는 첫 번째 춤',
    storyQuote: '내 뼈마디가 시린 걸 보니 곧 짐승들의 밤이 올 겐가. 모닥불만으론 부족하네. 나뭇가지와 부싯돌로 움막을 세우고, 암바초와 함께 첫 사냥을 다녀오게나.',
    requiredMaterials: [
      { itemId: 'branch', count: 10, label: '나뭇가지 10개' },
      { itemId: 'flint', count: 5, label: '부싯돌 5개' },
    ],
    requiredBuildings: [
      { buildingId: 'tribe_shelter', label: '마을에 [뼈 움막] 1채 건설' },
    ],
    rewardsSummary: '주술사 Lv.2 승급 (무두질·초급 목공술 해금), 마을 영토 확장 (12x12 → 14x14)',
    unlockedFeatures: [
      '주술사 & 마을 거점 Lv.2 승급',
      '무두질(tanning) 및 초급 목공술(woodworking) 해금',
      '마을 그리드 확장 (12x12 → 14x14 타일로 영토 확장)',
    ],
  },
  {
    fromLevel: 2,
    toLevel: 3,
    title: '영혼을 담는 그릇',
    subtitle: '거점 Lv.2 → Lv.3 승급 조건',
    questName: '정령의 목소리가 닿는 돌',
    storyQuote: '자네의 손재주가 예사롭지 않군. 땅속 깊은 곳에 잠든 흑요석과 공룡 뼈를 가져오게. 내 천막 옆에 고대 제단을 세우면 물질 속에 숨은 진짜 이치를 깨우칠 수 있을 걸세.',
    requiredMaterials: [
      { itemId: 'obsidian', count: 3, label: '흑요석 3개' },
      { itemId: 'bone', count: 5, label: '공룡 뼈 5개' },
    ],
    requiredBuildings: [
      { buildingId: 'ancient_altar', label: '[고대 제단] 마을에 건설' },
    ],
    rewardsSummary: '주술사 Lv.3 승급 (석공술 해금, AI 물리 분석 설계소 활성화)',
    unlockedFeatures: [
      '주술사 Lv.3 승급',
      '석공술(masonry_smelting) 해금',
      'AI 의도 기반 물리 분석 창 활성화',
    ],
  },
  {
    fromLevel: 3,
    toLevel: 4,
    title: '짐승의 발톱을 막아라',
    subtitle: '거점 Lv.3 → Lv.4 승급 조건',
    questName: '피 냄새를 맡은 어둠의 무리',
    storyQuote: '마을에 고기 냄새가 진동하니 굶주린 랩터 떼가 몰려들고 있네! 건축공방에서 울타리와 망루를 세워 마을을 둘러싸게. 공룡 펫도 최소 2마리는 수호대로 세워야 안전할 걸세.',
    requiredMaterials: [],
    minWalls: 8,
    minTowers: 1,
    minPets: 2,
    rewardsSummary: '주술사 Lv.4 승급 (중급 제련술 해금, 야간 시야 반경 +30m)',
    unlockedFeatures: [
      '주술사 Lv.4 승급 (거점 요새화)',
      '중급 제련술 해금',
      '마을 야간 시야 반경 +30m 영구 확장',
    ],
  },
  {
    fromLevel: 4,
    toLevel: 5,
    title: '잊혀진 시대의 유물',
    subtitle: '거점 Lv.4 → Lv.5 승급 조건',
    questName: '지평선 너머의 고대 거수',
    storyQuote: '이제 자네 부족도 제법 꼴을 갖추었군. 진정한 시련은 마을 밖에 있네. 공룡 탐험대를 500m 이상 전진시키고, Lv.2 이상 합체 성장한 펫의 힘을 증명해 보이게!',
    requiredMaterials: [],
    minExpeditionDistanceM: 500,
    minMergedPetLevel: 2,
    rewardsSummary: '주술사 Lv.5 마스터 달성 (4대 전직 의식 영구 해금)',
    unlockedFeatures: [
      '주술사 Lv.5 마스터 달성',
      '모든 기초 제작술 완료',
      '4대 주술사(공돌이·마법·흑마·정직) 전직 의식 해금',
    ],
  },
];

/** Stage 5 Destiny Story & Dialogue */
export const SHAMAN_STAGE_5_DESTINY = {
  title: '운명의 갈림길',
  subtitle: '4대 주술사 전직 의식',
  questName: '새로운 시대를 여는 길',
  storyQuote: '허허, 이제 내가 가르칠 수 있는 원시의 지혜는 모두 전수했네. 이제 내 안의 잠든 영혼을 깨워 새로운 시대의 길을 열 차례야. 자네는 이 부족을 어떤 세계로 이끌고 싶은가?',
  rewardsSummary: '4대 전직(공돌이·마법·흑마·정직) 선택 및 주술사 고유 외형/스킬/시설 활성화',
};

/** Checks all conditions for a given Shaman quest stage. */
export function checkShamanQuestStageProgress({
  stage,
  storage,
  backpack,
  village,
  pets,
  expeditionDistanceM = 0,
}: {
  stage: ShamanQuestStage;
  storage: Stack[];
  backpack: Stack[];
  village: VillageState | undefined;
  pets: OwnedPet[];
  expeditionDistanceM?: number;
}): {
  canRitual: boolean;
  materialChecks: { itemId: ItemId; label: string; current: number; need: number; done: boolean }[];
  buildingChecks: { buildingId: VillageBuildingId; label: string; done: boolean }[];
  wallCheck?: { current: number; need: number; done: boolean };
  towerCheck?: { current: number; need: number; done: boolean };
  petCheck?: { current: number; need: number; done: boolean };
  expeditionCheck?: { current: number; need: number; done: boolean };
  mergedPetCheck?: { currentMaxLevel: number; needLevel: number; done: boolean };
} {
  const ownedCount = (id: ItemId) => {
    const s = storage.find(x => x.itemId === id)?.count ?? 0;
    const b = backpack.find(x => x.itemId === id)?.count ?? 0;
    return s + b;
  };

  const buildings = village?.buildings ?? [];

  // 1. Materials
  const materialChecks = stage.requiredMaterials.map(req => {
    const current = ownedCount(req.itemId);
    return {
      itemId: req.itemId,
      label: req.label,
      current,
      need: req.count,
      done: current >= req.count,
    };
  });

  // 2. Buildings
  const buildingChecks = (stage.requiredBuildings ?? []).map(req => {
    const done = buildings.some(b => b.buildingId === req.buildingId && b.hp > 0);
    return {
      buildingId: req.buildingId,
      label: req.label,
      done,
    };
  });

  // 3. Walls
  let wallCheck: { current: number; need: number; done: boolean } | undefined = undefined;
  if (stage.minWalls !== undefined) {
    const wallCount = buildings.filter(
      b =>
        b.hp > 0 &&
        (b.buildingId.includes('wall') ||
          b.buildingId.includes('fence') ||
          b.buildingId.includes('palisade') ||
          b.customCategory === 'fence' ||
          b.customMechanics?.includes('WALL_BLOCK'))
    ).length;
    wallCheck = {
      current: wallCount,
      need: stage.minWalls,
      done: wallCount >= stage.minWalls,
    };
  }

  // 4. Towers
  let towerCheck: { current: number; need: number; done: boolean } | undefined = undefined;
  if (stage.minTowers !== undefined) {
    const towerCount = buildings.filter(
      b =>
        b.hp > 0 &&
        (b.buildingId.includes('tower') ||
          b.buildingId.includes('outpost') ||
          b.customCategory === 'tower' ||
          b.customMechanics?.includes('SNIPER_SIGHT'))
    ).length;
    towerCheck = {
      current: towerCount,
      need: stage.minTowers,
      done: towerCount >= stage.minTowers,
    };
  }

  // 5. Pets Guarding Base
  let petCheck: { current: number; need: number; done: boolean } | undefined = undefined;
  if (stage.minPets !== undefined) {
    const petCount = pets.length;
    petCheck = {
      current: petCount,
      need: stage.minPets,
      done: petCount >= stage.minPets,
    };
  }

  // 6. Expedition Distance
  let expeditionCheck: { current: number; need: number; done: boolean } | undefined = undefined;
  if (stage.minExpeditionDistanceM !== undefined) {
    expeditionCheck = {
      current: Math.round(expeditionDistanceM),
      need: stage.minExpeditionDistanceM,
      done: expeditionDistanceM >= stage.minExpeditionDistanceM,
    };
  }

  // 7. Merged Pet Level
  let mergedPetCheck: { currentMaxLevel: number; needLevel: number; done: boolean } | undefined = undefined;
  if (stage.minMergedPetLevel !== undefined) {
    const maxPetLevel = pets.reduce((max, p) => Math.max(max, p.level), 1);
    mergedPetCheck = {
      currentMaxLevel: maxPetLevel,
      needLevel: stage.minMergedPetLevel,
      done: maxPetLevel >= stage.minMergedPetLevel,
    };
  }

  const materialsDone = materialChecks.every(m => m.done);
  const buildingsDone = buildingChecks.every(b => b.done);
  const wallDone = !wallCheck || wallCheck.done;
  const towerDone = !towerCheck || towerCheck.done;
  const petDone = !petCheck || petCheck.done;
  const expeditionDone = !expeditionCheck || expeditionCheck.done;
  const mergedPetDone = !mergedPetCheck || mergedPetCheck.done;

  const canRitual =
    materialsDone &&
    buildingsDone &&
    wallDone &&
    towerDone &&
    petDone &&
    expeditionDone &&
    mergedPetDone;

  return {
    canRitual,
    materialChecks,
    buildingChecks,
    wallCheck,
    towerCheck,
    petCheck,
    expeditionCheck,
    mergedPetCheck,
  };
}
