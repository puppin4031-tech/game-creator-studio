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
    subtitle: 'Lv.1 → Lv.2 주술사 & 마을 동시 승급',
    storyQuote: '어둠 속에서 살아남으려면 불씨와 쉼터가 필요하네. 맹수를 피해 쉴 뼈 움막을 짓고, 불을 피울 나뭇가지와 부싯돌을 바치게.',
    storyDialogue: [
      '주술사: "바람이 차가워지고 있네, 족장이여. 광야의 맹수들은 어둠을 틈타 냄새를 맡고 다가오지."',
      '나: "주술사여, 부족민들이 쉴 수 있는 따뜻한 보금자리와 방어 수단이 필요합니다."',
      '주술사: "좋네. 따스한 불씨를 피울 나뭇가지와 부싯돌을 모으고, 우리를 지켜줄 [뼈 움막]을 마을에 세우게. 그에 답해 고대 무두질과 목공술의 비밀을 가르쳐주마."',
    ],
    requiredMaterials: [
      { itemId: 'branch', count: 10, label: '나뭇가지 10개' },
      { itemId: 'flint', count: 5, label: '부싯돌 5개' },
    ],
    requiredBuildings: [
      { buildingId: 'tribe_shelter', label: '뼈 움막(부족민 안식처) 마을에 건설' },
    ],
    rewardsSummary: '주술사 & 마을 Lv.2 승급 · 무두질(tanning) 및 초급 목공술(woodworking) 즉시 해금',
    unlockedFeatures: ['마을 레벨 Lv.2 승급', '무두질(tanning) Lv.1 습득', '초급 목공술(woodworking) Lv.1 습득'],
  },
  {
    fromLevel: 2,
    toLevel: 3,
    title: '영혼을 담는 그릇',
    subtitle: 'Lv.2 → Lv.3 주술사 & 마을 최고 단계 승급',
    storyQuote: '대지의 신성한 영을 담으려면 단단한 제단과 고대 공룡 뼈가 필요하네. 흑요석과 공룡 뼈를 바치고 고대 제단을 완성하게.',
    storyDialogue: [
      '주술사: "불씨는 타올랐으나, 아직 대지의 혼령들은 안식처를 찾지 못했네."',
      '나: "영혼을 담는 제단을 세워 부족의 안녕을 빌어야겠군요."',
      '주술사: "그렇네! 단단한 흑요석과 고대 공룡의 영혼이 깃든 뼈를 모아 [고대 제단]을 축조하게. 제단이 서면 단단한 돌을 깎아내는 석공술과 대장간의 문이 열릴 걸세."',
    ],
    requiredMaterials: [
      { itemId: 'obsidian', count: 3, label: '흑요석 3개' },
      { itemId: 'bone', count: 5, label: '공룡 뼈 5개' },
    ],
    requiredBuildings: [
      { buildingId: 'ancient_altar', label: '고대 제단(Ancient Altar) 마을에 건설' },
    ],
    rewardsSummary: '주술사 & 마을 최고 레벨(Lv.3) 승급 · 석공술(masonry_smelting) 및 석공 장인 해금',
    unlockedFeatures: ['마을 최고 단계(Lv.3) 달성', '석공술(masonry_smelting) Lv.1 습득', '석공 장인(stone_artisan) 해금'],
  },
  {
    fromLevel: 3,
    toLevel: 4,
    title: '짐승의 발톱을 막아라',
    subtitle: 'Lv.3 → Lv.4 주술사 승급 & 거점 요새화',
    storyQuote: '광야의 포식자들이 마을의 불빛을 보고 몰려오고 있네. 마을을 지킬 울타리 8개와 적을 감시할 망루를 세우고, 우리를 수호할 펫 2마리를 배치하게!',
    storyDialogue: [
      '주술사: "어젯밤 숲 너머에서 거대한 랩터 무리의 울음소리가 들렸네. 단순한 천막으로는 발톱을 막을 수 없어."',
      '나: "성벽을 둘러치고 고지대 망루와 수호 펫들로 요새를 굳혀야 합니다."',
      '주술사: "옳은 판단일세! 마을 외곽에 울타리 8개 이상과 망루 1개를 세우고, 충직한 공룡 펫 2마리를 배치하게. 요새화가 끝나면 무쇠를 벼리는 중급 제련술을 전수하겠네."',
    ],
    requiredMaterials: [],
    minWalls: 8,
    minTowers: 1,
    minPets: 2,
    rewardsSummary: '주술사 Lv.4 승급 · 중급 제련술 및 나무 장인 Lv.2 해금',
    unlockedFeatures: ['주술사 Lv.4 달성', '중급 제련술(masonry_smelting Lv.2) 해금', '나무 장인(wood_artisan Lv.2) 해금'],
  },
  {
    fromLevel: 4,
    toLevel: 5,
    title: '잊혀진 시대의 유물',
    subtitle: 'Lv.4 → Lv.5 주술사 최종 승급 & 4대 전직 개방',
    storyQuote: '고대의 위대한 지혜를 깨우칠 마지막 시련일세. 탐험대를 미지의 땅 500m 너머로 파견하고, 강력한 합체 공룡 펫을 육성하여 4대 전직 의식을 준비하게!',
    storyDialogue: [
      '주술사: "이제 자네와 이 마을은 원시의 한계를 넘어섰네. 저 지평선 너머 잊혀진 시대의 고대 유물이 깨어나는 것이 느껴지는가?"',
      '나: "탐험대를 더 멀리 보내어 문명의 궁극적인 비밀을 밝혀내겠습니다."',
      '주술사: "탐험대로 500m 이상의 미지의 대지를 돌파하고, 2단계 이상으로 합체 진화한 공룡 펫을 보여주게! 그 순간, 자네는 4대 전직의 길 중 하나를 선택해 부족의 운명을 영원히 바꾸게 될 걸세!"',
    ],
    requiredMaterials: [],
    minExpeditionDistanceM: 500,
    minMergedPetLevel: 2,
    rewardsSummary: '주술사 최종 Lv.5 달성 · 4대 전직(공돌이·마법·흑마·정직) 의식 영구 해금!',
    unlockedFeatures: ['주술사 최종 Lv.5 완성', '4대 전직 의식(Evolution) 즉시 개방', '전직별 전용 메뉴 및 궁극기 활성화'],
  },
];

export interface ShamanClassMeta {
  id: ShamanClassId;
  name: string;
  badge: string;
  icon: string;
  auraText: string;
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
    badge: '🔧 스팀펑크 공학 & 대장간',
    icon: '🔧',
    auraText: '회전하는 황동 톱니바퀴와 풀무 불꽃 오라',
    desc: '원시 자연의 한계를 거부하고, 톱니바퀴와 풀무, 강철 대장간의 과학 기술로 시대를 앞서가는 공학 주술사.',
    motto: '"마법은 환상일 뿐, 강철과 기계만이 영원한 문명을 약속한다."',
    pros: [
      '풀무 & 대장간 제련소 해금 (정밀 주조)',
      '철·청동·놋쇠 신규 합금 제련 레시피 활성',
      '반경 30m 자동 원거리 요격 방어 포탑(Turret) 건설',
      '모든 무기 및 도구 내구도 3배(300%) 영구 증가',
    ],
    cons: [
      '원소 마법 및 주술 스킬 일체 사용 불가',
      '고급 기계 제작 시 다량의 금속 광석 및 연료 소모',
    ],
    themeColor: 'amber',
    bgGradient: 'from-amber-500/20 via-orange-500/20 to-yellow-500/10',
    borderClass: 'border-amber-500',
    textClass: 'text-amber-400',
  },
  mage: {
    id: 'mage',
    name: '원소 마법술사',
    badge: '🔮 4대 원소 & 아케인 마나',
    icon: '🔮',
    auraText: '영롱하게 타오르는 보랏빛 마나 수정체 오라',
    desc: '자연 속에 잠들어 있는 화염, 냉기, 번개의 원소 정령과 교감하여 전장을 지배하는 순수 마법 주술사.',
    motto: '"대지의 원소들이여, 내 부름에 응하여 적들을 재로 만들어라!"',
    pros: [
      '🔥 파이어볼: 30 강력 화염 피해 및 5초 화상 지속 데미지',
      '❄️ 아이스볼: 20 냉기 피해 및 적 이동/공속 50% 결빙 감속',
      '⚡ 썬더볼트: 35 뇌격 관통 피해 및 적 100% 충격 스턴',
      '🛡️ 마나 실드: 다음 적 공격 3회를 완전 무효화하는 배리어',
      '장착 무기에 불·얼음·번개 원소 속성 영구 인챈트 부여',
    ],
    cons: [
      '물리 방벽 및 성벽 내구도 -20% 취약',
      '스킬 시전 시 마나 포인트 소모 (지속 관리 필요)',
    ],
    themeColor: 'violet',
    bgGradient: 'from-violet-500/20 via-purple-500/20 to-indigo-500/10',
    borderClass: 'border-violet-500',
    textClass: 'text-violet-400',
  },
  warlock: {
    id: 'warlock',
    name: '암흑 흑마술사',
    badge: '💀 심연의 맹독 & 강령술',
    icon: '💀',
    auraText: '검푸른 심연의 연기와 떠도는 해골 영혼 오라',
    desc: '금지된 심연의 주술을 다루며, 뼈와 영혼을 제물로 바쳐 전설의 공룡을 불사의 용으로 진화시키는 흑마술사.',
    motto: '"죽음은 끝이 아닌 새로운 군단의 시작일지니."',
    pros: [
      '☠️ 맹독 안개: 반경 적들에게 8초간 지속 맹독 피해 살포',
      '🩸 약화 저주: 적 몬스터의 공격력과 방어력을 40% 강제 붕괴',
      '💀 스컬 소환: 해골 보초병 미니언 2기를 즉시 소환해 협공',
      '★ 암흑 의식: Lv.4 이상 공룡 펫을 [스컬 드래곤]으로 최종 각성 진화!',
    ],
    cons: [
      '거점 휴식 및 캠프파이어 회복 효율 -30% 감소',
      '강력한 암흑 의식 시 공룡 뼈 및 체력 제물 요구',
    ],
    themeColor: 'emerald',
    bgGradient: 'from-emerald-500/20 via-teal-500/20 to-slate-900/40',
    borderClass: 'border-emerald-500',
    textClass: 'text-emerald-400',
  },
  orthodox: {
    id: 'orthodox',
    name: '정직한 대현자',
    badge: '👑 정통 역사 & 문명 번영',
    icon: '👑',
    auraText: '황금빛 토템 관과 성스러운 문명 번영의 광채',
    desc: '구석기에서 철기까지 정통 인류 역사 테크트리를 계승하며, 부족민과 펫의 기본기를 완성시키는 위대한 성자.',
    motto: '"땀 흘려 일군 대지와 원칙만이 흔들리지 않는 제국을 낳는다."',
    pros: [
      '모든 부족민 & 펫 영구 스탯 +20% (ATK / DEF / HP 올스탯 증폭)',
      '나무·광석·약초 파밍 채집량 +25% 추가 수확 영구 패시브',
      '모든 시설 건축 및 장비 제작 시 재료 소모량 -15% 절약',
      '실패 없는 완벽한 내실 강화와 안정적인 문명 번영',
    ],
    cons: [
      '순수 기본기 및 스탯 증폭 중심 (화려한 폭딜 마법이나 특수 포탑 없음)',
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
