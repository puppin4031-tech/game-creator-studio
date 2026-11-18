// Shaman Quest System & 4 Evolution Paths
// Implements 5-stage Shaman progression with village synchronization and 4 specialized classes:
// 1. Engineer (공돌이) 2. Elementalist Mage (마법술사) 3. Necromancer Warlock (흑마술사) 4. Orthodox Sage (정직한 주술사)

import type { Stack } from './types';
import type { ItemId } from './items';
import type { VillageBuildingId, VillageState } from './village';
import type { OwnedPet } from './pets';

export type ShamanLevel = 1 | 2 | 3 | 4 | 5;
export type ShamanClassId = 'engineer' | 'mage' | 'warlock' | 'orthodox';

export interface ShamanQuestStage {
  fromLevel: ShamanLevel;
  toLevel: ShamanLevel;
  title: string;
  subtitle: string;
  questName: string;
  storyQuote: string;
  storyDialogue: string[];
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
    storyQuote: '내 뼈마디가 시린 걸 보니 곧 짐승들의 밤이 올 겐가. 모닥불만으론 부족하네. 나뭇가지와 돌을 엮어 바람을 막을 움막을 세우고, 암바초와 함께 첫 사냥을 다녀오게나.',
    storyDialogue: [
      '주술사: "내 뼈마디가 시린 걸 보니 곧 짐승들의 밤이 올 겐가. 모닥불만으론 부족하네."',
      '나: "주술사여, 부족민들이 쉴 수 있는 따뜻한 보금자리와 방어 수단이 필요합니다."',
      '주술사: "나뭇가지와 돌을 엮어 바람을 막을 움막을 세우고, 암바초와 함께 첫 사냥을 다녀오게나."',
    ],
    requiredMaterials: [
      { itemId: 'branch', count: 10, label: '나뭇가지 10개' },
      { itemId: 'flint', count: 5, label: '부싯돌 5개' },
    ],
    requiredBuildings: [
      { buildingId: 'tribe_shelter', label: '마을에 [뼈 움막] 1채 건설' },
    ],
    rewardsSummary: '주술사 Lv.2 승급 (무두질·초급 목공술 해금), 마을 그리드 확장(12x12 → 14x14)',
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
    storyQuote: '자네의 손재주가 예사롭지 않군. 땅속 깊은 곳에서 잠든 흑요석과 공룡 뼈를 가져오게. 내 천막 옆에 고대 제단을 세우면, 물질 속에 숨은 진짜 이치를 깨우칠 수 있을 걸세.',
    storyDialogue: [
      '주술사: "자네의 손재주가 예사롭지 않군."',
      '주술사: "땅속 깊은 곳에서 잠든 흑요석과 공룡 뼈를 가져오게."',
      '주술사: "내 천막 옆에 고대 제단을 세우면, 물질 속에 숨은 진짜 이치를 깨우칠 수 있을 걸세."',
    ],
    requiredMaterials: [
      { itemId: 'obsidian', count: 3, label: '흑요석 3개' },
      { itemId: 'bone', count: 5, label: '공룡 뼈 5개' },
    ],
    requiredBuildings: [
      { buildingId: 'ancient_altar', label: '[고대 제단] 마을에 건설' },
    ],
    rewardsSummary: '주술사 Lv.3 승급 (석공술 해금, AI 물리 분석 창 활성화)',
    unlockedFeatures: [
      '주술사 Lv.3 승급 (마을 최고 단계 승급)',
      '석공술(masonry_smelting) 해금',
      'AI 물리 분석 창 (의도 기반 AI 제작/설계소) 활성화',
    ],
  },
  {
    fromLevel: 3,
    toLevel: 4,
    title: '짐승의 발톱을 막아라',
    subtitle: '거점 Lv.3 → Lv.4 승급 조건',
    questName: '피 냄새를 맡은 어둠의 무리',
    storyQuote: '마을에 고기 냄새가 진동하니 굶주린 랩터 떼가 몰려들고 있네! 건축공방에서 탄성과 밀도가 높은 울타리와 망루를 설계해 마을을 둘러싸게. 공룡 펫도 최소 2마리는 수호대로 세워야 안전할 걸세.',
    storyDialogue: [
      '주술사: "마을에 고기 냄새가 진동하니 굶주린 랩터 떼가 몰려들고 있네!"',
      '주술사: "건축공방에서 탄성과 밀도가 높은 울타리와 망루를 설계해 마을을 둘러싸게."',
      '주술사: "공룡 펫도 최소 2마리는 수호대로 세워야 안전할 걸세."',
    ],
    requiredMaterials: [],
    minWalls: 8,
    minTowers: 1,
    minPets: 2,
    rewardsSummary: '주술사 Lv.4 승급 (중급 제련술 해금, 마을 야간 시야 반경 +30m)',
    unlockedFeatures: [
      '주술사 Lv.4 승급 (거점 요새화)',
      '중급 제련술(masonry_smelting Lv.2) 해금',
      '마을 야간 시야 반경 +30m 영구 확장',
    ],
  },
  {
    fromLevel: 4,
    toLevel: 5,
    title: '잊혀진 시대의 유물',
    subtitle: '거점 Lv.4 → Lv.5 승급 조건',
    questName: '지평선 너머의 고대 거수',
    storyQuote: '이제 자네 부족도 제법 꼴을 갖추었군. 하지만 진정한 시련은 마을 밖에 있네. 공룡 탐험대를 내보내 500m 이상 전진하고, Lv.2 이상 합체 성장한 펫의 힘을 증명해 보이게!',
    storyDialogue: [
      '주술사: "이제 자네 부족도 제법 꼴을 갖추었군. 하지만 진정한 시련은 마을 밖에 있네."',
      '주술사: "공룡 탐험대를 내보내 500m 이상 전진하고, Lv.2 이상 합체 성장한 펫의 힘을 증명해 보이게!"',
    ],
    requiredMaterials: [],
    minExpeditionDistanceM: 500,
    minMergedPetLevel: 2,
    rewardsSummary: '주술사 Lv.5 마스터 (모든 기초 제작술 완료 → 4대 전직 의식 해금)',
    unlockedFeatures: [
      '주술사 Lv.5 마스터 달성',
      '모든 기초 제작술 완료',
      '4대 전직(공돌이·마법·흑마·정직) 의식 영구 해금',
    ],
  },
];

/** Stage 5 Destiny Story & Dialogue */
export const SHAMAN_STAGE_5_DESTINY = {
  title: '운명의 갈림길',
  subtitle: '주술사 전직 퀘스트',
  questName: '새로운 시대를 여는 길',
  storyQuote: '허허, 이제 내가 가르칠 수 있는 원시의 지혜는 모두 전수했네. 이제 내 안의 잠든 영혼을 깨워 새로운 시대의 길을 열 차례야. 자네는 이 부족을 어떤 세계로 이끌고 싶은가?',
  storyDialogue: [
    '주술사: "허허, 이제 내가 가르칠 수 있는 원시의 지혜는 모두 전수했네."',
    '주술사: "이제 내 안의 잠든 영혼을 깨워 새로운 시대의 길을 열 차례야."',
    '주술사: "자네는 이 부족을 어떤 세계로 이끌고 싶은가?"',
  ],
  rewardsSummary: '4대 전직(공돌이·마법·흑마·정직) 선택 및 주술사 고유 외형/스킬/시설 활성화',
};

export interface ShamanClassMeta {
  id: ShamanClassId;
  name: string;
  appearance: string;
  badge: string;
  icon: string;
  auraText: string;
  concept: string;
  facilitiesDesc?: string;
  resourcesDesc?: string;
  skillsDesc?: string;
  featuresDesc?: string;
  desc: string;
  motto: string;
  pros: string[];
  cons: string[];
  themeColor: string;
  bgGradient: string;
  borderClass: string;
  textClass: string;
}

export const SHAMAN_CLASSES: Record<ShamanClassId, ShamanClassMeta> = {
  engineer: {
    id: 'engineer',
    name: '공돌이 주술사',
    appearance: '(고글 & 망치)',
    badge: '🔧 근대 공업 & 제련 테크',
    icon: '🔧',
    auraText: '회전하는 황동 톱니바퀴와 풀무 불꽃 오라',
    concept: '근대 공업 & 제련 테크',
    facilitiesDesc: '풀무, 용광로, 대장간, 자동 채굴기',
    resourcesDesc: '철광석, 구리, 주석(청동), 놋쇠 제련',
    featuresDesc: '자동화 방어 포탑(발리스타/투석기) 건설, 내구도 3배 강철 무기·갑옷 제작',
    desc: '원시 자연의 한계를 거부하고 풀무와 용광로, 대장간과 자동 채굴기의 과학 기술로 시대를 앞서가는 공학 주술사.',
    motto: '"마법은 환상일 뿐, 강철과 기계만이 영원한 문명을 약속한다."',
    pros: [
      '압도적인 건물/성벽 내구도 및 방어력',
      '마을 자동 생산량 +50% 증가',
      '무기 파손(내구도 소모) 거의 없음 (내구도 3배)',
      '시설: 풀무, 용광로, 대장간, 자동 채굴기 해금',
      '기능: 자동화 방어 포탑(발리스타/투석기) 건설',
    ],
    cons: [
      '마법/저주 계열 스킬 사용 불가',
      '광석과 연료(목탄/석탄) 소모량이 매우 큼',
    ],
    themeColor: 'amber',
    bgGradient: 'from-amber-500/20 via-orange-500/20 to-yellow-500/10',
    borderClass: 'border-amber-500',
    textClass: 'text-amber-400',
  },
  mage: {
    id: 'mage',
    name: '마법술사',
    appearance: '(푸른 로브 & 수정 지팡이)',
    badge: '🔮 원소 마법 연구 & 스펠 부여',
    icon: '🔮',
    auraText: '영롱하게 타오르는 푸른 로브와 수정 지팡이 마나 오라',
    concept: '원소 마법 연구 & 스펠 부여',
    skillsDesc: '파이어볼(광역 화상), 아이스볼(이동/공속 둔화), 썬더볼트(단일 극딜+기절), 마나 실드(거점/펫 보호막)',
    featuresDesc: '무기에 원소 속성(화염·냉기·전격) 인챈트 부여',
    desc: '자연 속에 잠들어 있는 화염, 냉기, 번개의 원소 정령과 교감하여 마법으로 전장을 지배하는 순수 마법술사.',
    motto: '"대지의 원소들이여, 내 부름에 응하여 적들을 재로 만들어라!"',
    pros: [
      '탐험 및 전투에서 가장 강력한 광역 화력',
      '재료가 적어도 마나(연구 포인트)로 전투 극복 가능',
      '아이스볼/마나 실드로 펫 생존율 극대화',
      '스킬 개발: 파이어볼, 아이스볼, 썬더볼트, 마나 실드',
      '기능: 무기에 원소 속성 인챈트 부여',
    ],
    cons: [
      '물리 건축물/성벽 내구도가 약함',
      '전투 시 마나(신비한 가루/포인트)를 지속 소모',
    ],
    themeColor: 'violet',
    bgGradient: 'from-violet-500/20 via-purple-500/20 to-indigo-500/10',
    borderClass: 'border-violet-500',
    textClass: 'text-violet-400',
  },
  warlock: {
    id: 'warlock',
    name: '흑마술사',
    appearance: '(해골 가면 & 보라색 오라)',
    badge: '💀 암흑 주술 & 언데드 연성',
    icon: '💀',
    auraText: '검푸른 심연의 연기와 해골 가면 보라색 오라',
    concept: '암흑 주술 & 언데드 연성',
    skillsDesc: '맹독 안개(지속 피해), 약화 저주(적 공격력 40% 감소), 스컬 소환(전투 시 해골 병사 2기 자동 소환)',
    featuresDesc: 'Lv.4 이상 공룡 펫 + 흑요석/뼈 제물로 [스컬 드래곤] 진화',
    desc: '금지된 심연의 암흑 주술을 다루며, 뼈와 영혼을 제물로 바쳐 전설의 공룡을 불사의 스컬 드래곤으로 각성시키는 흑마술사.',
    motto: '"죽음은 끝이 아닌 새로운 군단의 시작일지니."',
    pros: [
      '소모성 해골 소환수로 펫 사망 리스크 분산',
      '스컬 드래곤의 압도적 보스전 성능 (Lv.4+ 공룡 각성)',
      '적 처치 시 체력 흡수(흡혈) 생존력',
      '스킬 개발: 맹독 안개, 약화 저주(적 공격력 -40%), 스컬 소환',
    ],
    cons: [
      '마을 쉼터 휴식 효율 -30% 감소',
      '진화 및 소환 시 일정량의 뼈/생명력(HP) 제물 필요',
    ],
    themeColor: 'emerald',
    bgGradient: 'from-emerald-500/20 via-teal-500/20 to-slate-900/40',
    borderClass: 'border-emerald-500',
    textClass: 'text-emerald-400',
  },
  orthodox: {
    id: 'orthodox',
    name: '정직한 주술사',
    appearance: '(황금 깃털관 & 토템 지팡이)',
    badge: '👑 역사적 정통 문명 & 조화 성장',
    icon: '👑',
    auraText: '황금 깃털관과 토템 지팡이 성스러운 문명 번영 광채',
    concept: '역사적 정통 문명 & 조화 성장',
    featuresDesc: '구석기→신석기→청동기→철기 정석 계승, 부족민/펫 전체 영구 스탯 버프, 희귀 알 부화율 상승, 교역/외교 보너스',
    desc: '구석기에서 철기까지 정통 인류 역사 테크트리를 계승하며 모든 분야를 조화롭게 발전시키는 위대한 정통 주술사.',
    motto: '"땀 흘려 일군 대지와 원칙만이 흔들리지 않는 제국을 낳는다."',
    pros: [
      '단점이 없는 완벽한 올라운더 밸런스',
      '파밍 획득량 +25% & 모든 펫/용병 최대 체력 +20%',
      '재료 소모량 -15% 절약 패시브',
      '구석기→신석기→청동기→철기 정통 문명 균형 발전',
      '희귀 알 부화율 상승 및 교역/외교 보너스',
    ],
    cons: [
      '공돌이의 자동화 속도나 마법/흑마의 폭발적 순간 화력보다는 성장 템포가 완만함',
    ],
    themeColor: 'sky',
    bgGradient: 'from-sky-500/20 via-blue-500/20 to-cyan-500/10',
    borderClass: 'border-sky-500',
    textClass: 'text-sky-400',
  },
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
        (b.customCategory === 'tower' ||
          b.customMechanics?.includes('AUTO_ARROW') ||
          b.customMechanics?.includes('NIGHT_VISION') ||
          b.buildingId === 'wood_pillar' ||
          b.buildingId === 'torch')
    ).length;
    towerCheck = {
      current: towerCount,
      need: stage.minTowers,
      done: towerCount >= stage.minTowers,
    };
  }

  // 5. Pets
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
    const maxPetLv = pets.reduce((max, p) => Math.max(max, p.level), 0);
    mergedPetCheck = {
      currentMaxLevel: maxPetLv,
      needLevel: stage.minMergedPetLevel,
      done: maxPetLv >= stage.minMergedPetLevel,
    };
  }

  const allMaterialsDone = materialChecks.every(c => c.done);
  const allBuildingsDone = buildingChecks.every(c => c.done);
  const wallDone = !wallCheck || wallCheck.done;
  const towerDone = !towerCheck || towerCheck.done;
  const petDone = !petCheck || petCheck.done;
  const expDone = !expeditionCheck || expeditionCheck.done;
  const mergedPetDone = !mergedPetCheck || mergedPetCheck.done;

  const canRitual =
    allMaterialsDone &&
    allBuildingsDone &&
    wallDone &&
    towerDone &&
    petDone &&
    expDone &&
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
