import type { ItemId } from '@/lib/survival/items';
import { ITEMS } from '@/lib/survival/items';
import type { Stack } from '@/lib/survival/types';

export interface SkillCost {
  itemId: ItemId;
  count: number;
}

export type ShamanClassType = 'ENGINEER' | 'MAGE' | 'NECROMANCER' | 'HONEST';

export interface ClassSkillNode {
  id: string;
  classId: ShamanClassType;
  branch: string;
  branchName: string;
  tier: 1 | 2 | 3 | 4;
  name: string;
  icon: string;
  desc: string;
  reqLevel: number;
  reqSkillId: string | null;
  costItems: SkillCost[];
  effectKey: string;
  effectValue?: number | string;
}

export const CLASS_SKILL_TREES: Record<ShamanClassType, {
  className: string;
  themeColor: string;
  borderTheme: string;
  bgTheme: string;
  branch1: { id: string; name: string; skills: ClassSkillNode[] };
  branch2: { id: string; name: string; skills: ClassSkillNode[] };
}> = {
  ENGINEER: {
    className: '공학 주술사',
    themeColor: 'text-amber-400',
    borderTheme: 'border-amber-500',
    bgTheme: 'bg-amber-950/40',
    branch1: {
      id: 'vehicle',
      name: '이동수단 (GPS 속도 제한 완화)',
      skills: [
        {
          id: 'wooden_sled',
          classId: 'ENGINEER',
          branch: 'vehicle',
          branchName: '이동수단',
          tier: 1,
          name: '지게와 나무 썰매',
          icon: '🛷',
          desc: '배낭 운반 무게 +20% 증가, 실제 GPS 파밍 허용 속도 13 → 16 km/h로 상향 (가벼운 조깅 가능)',
          reqLevel: 5,
          reqSkillId: null,
          costItems: [
            { itemId: 'branch', count: 10 },
            { itemId: 'cordage', count: 4 },
          ],
          effectKey: 'gps_speed_limit',
          effectValue: 16,
        },
        {
          id: 'wooden_cart',
          classId: 'ENGINEER',
          branch: 'vehicle',
          branchName: '이동수단',
          tier: 2,
          name: '통나무 손수레 · 원시 마차',
          icon: '🛒',
          desc: '실제 GPS 파밍 허용 속도 22 km/h로 상향 (자전거 산책 중 파밍 가능)',
          reqLevel: 12,
          reqSkillId: 'wooden_sled',
          costItems: [
            { itemId: 'log', count: 15 },
            { itemId: 'leather', count: 6 },
            { itemId: 'flint', count: 8 },
          ],
          effectKey: 'gps_speed_limit',
          effectValue: 22,
        },
        {
          id: 'clockwork_bike',
          classId: 'ENGINEER',
          branch: 'vehicle',
          branchName: '이동수단',
          tier: 3,
          name: '태엽 나무 자전거',
          icon: '🚲',
          desc: '실제 GPS 파밍 허용 속도 35 km/h로 상향 (시내버스 서행 구간 파밍 가능)',
          reqLevel: 18,
          reqSkillId: 'wooden_cart',
          costItems: [
            { itemId: 'log', count: 20 },
            { itemId: 'copper_ore', count: 10 },
            { itemId: 'resin', count: 6 },
          ],
          effectKey: 'gps_speed_limit',
          effectValue: 35,
        },
        {
          id: 'steam_carriage',
          classId: 'ENGINEER',
          branch: 'vehicle',
          branchName: '이동수단',
          tier: 4,
          name: '증기 동력 마차',
          icon: '🚂',
          desc: '실제 GPS 파밍 허용 속도 60 km/h로 상향 (전철·자동차 이동 중 고속 채집 및 정찰 허용)',
          reqLevel: 25,
          reqSkillId: 'clockwork_bike',
          costItems: [
            { itemId: 'hematite', count: 15 },
            { itemId: 'coal', count: 15 },
            { itemId: 'copper_ore', count: 15 },
          ],
          effectKey: 'gps_speed_limit',
          effectValue: 60,
        },
      ],
    },
    branch2: {
      id: 'forge',
      name: '제련 & 병기',
      skills: [
        {
          id: 'bronze_smelting',
          classId: 'ENGINEER',
          branch: 'forge',
          branchName: '제련 & 병기',
          tier: 1,
          name: '청동 제련술',
          icon: '🥉',
          desc: '구리+주석 합금 청동 도구 및 중무기 제작법 해금',
          reqLevel: 11,
          reqSkillId: null,
          costItems: [
            { itemId: 'copper_ore', count: 8 },
            { itemId: 'tin_ore', count: 8 },
          ],
          effectKey: 'unlock_recipe_bronze',
        },
        {
          id: 'repeating_crossbow',
          classId: 'ENGINEER',
          branch: 'forge',
          branchName: '제련 & 병기',
          tier: 2,
          name: '연발 쇠뇌 (Crossbow)',
          icon: '🏹',
          desc: '원거리 사격 시 적의 방어력을 50% 무시하는 고속 연발 관통 사격 해금',
          reqLevel: 15,
          reqSkillId: 'bronze_smelting',
          costItems: [
            { itemId: 'log', count: 12 },
            { itemId: 'cordage', count: 8 },
            { itemId: 'flint', count: 10 },
          ],
          effectKey: 'armor_pierce',
          effectValue: 50,
        },
        {
          id: 'steel_smelting',
          classId: 'ENGINEER',
          branch: 'forge',
          branchName: '제련 & 병기',
          tier: 3,
          name: '고온 강철 제련',
          icon: '⚔️',
          desc: '자철석과 석탄을 고열 제련하여 강철 무기·판금 갑옷 제작 해금',
          reqLevel: 20,
          reqSkillId: 'repeating_crossbow',
          costItems: [
            { itemId: 'hematite', count: 12 },
            { itemId: 'coal', count: 12 },
            { itemId: 'clay', count: 10 },
          ],
          effectKey: 'unlock_recipe_steel',
        },
        {
          id: 'auto_ballista',
          classId: 'ENGINEER',
          branch: 'forge',
          branchName: '제련 & 병기',
          tier: 4,
          name: '자동 발리스타 포탑',
          icon: '🛡️',
          desc: '거점에 접근하는 맹수를 자동으로 감지하고 요격하는 방어 포탑 구축',
          reqLevel: 24,
          reqSkillId: 'steel_smelting',
          costItems: [
            { itemId: 'log', count: 25 },
            { itemId: 'hematite', count: 15 },
            { itemId: 'cordage', count: 15 },
          ],
          effectKey: 'base_auto_turret',
        },
      ],
    },
  },
  MAGE: {
    className: '마법술사',
    themeColor: 'text-sky-400',
    borderTheme: 'border-sky-500',
    bgTheme: 'bg-sky-950/40',
    branch1: {
      id: 'spatial',
      name: '공간 간섭 (GPS 터치 반경 확장)',
      skills: [
        {
          id: 'mana_sense',
          classId: 'MAGE',
          branch: 'spatial',
          branchName: '공간 간섭',
          tier: 1,
          name: '마력 감지',
          icon: '👁️',
          desc: '야외 자원 채집 가능 반경 +15m 영구 확장',
          reqLevel: 5,
          reqSkillId: null,
          costItems: [
            { itemId: 'quartz', count: 4 },
            { itemId: 'herb', count: 6 },
          ],
          effectKey: 'reach_bonus',
          effectValue: 15,
        },
        {
          id: 'telekinesis_gather',
          classId: 'MAGE',
          branch: 'spatial',
          branchName: '공간 간섭',
          tier: 2,
          name: '염동력 채집',
          icon: '🌀',
          desc: '반경 50m 밖의 자원과 공룡 알을 걸어가지 않고 원격 터치로 즉시 습득',
          reqLevel: 12,
          reqSkillId: 'mana_sense',
          costItems: [
            { itemId: 'quartz', count: 8 },
            { itemId: 'jade', count: 6 },
          ],
          effectKey: 'remote_gather',
          effectValue: 50,
        },
        {
          id: 'astral_projection',
          classId: 'MAGE',
          branch: 'spatial',
          branchName: '공간 간섭',
          tier: 3,
          name: '아스트랄 투영 (공간 도약)',
          icon: '🌌',
          desc: '하루 3회, 즐겨찾기 해둔 먼 좌표로 직접 이동하지 않고 5분간 원격 파밍 수행',
          reqLevel: 20,
          reqSkillId: 'telekinesis_gather',
          costItems: [
            { itemId: 'quartz', count: 15 },
            { itemId: 'obsidian', count: 10 },
            { itemId: 'jade', count: 10 },
          ],
          effectKey: 'astral_farm_3x',
        },
      ],
    },
    branch2: {
      id: 'element',
      name: '원소 마법 & 결계',
      skills: [
        {
          id: 'fire_ice_bolt',
          classId: 'MAGE',
          branch: 'element',
          branchName: '원소 마법',
          tier: 1,
          name: '파이어볼 / 아이스볼',
          icon: '🔥',
          desc: '화염구 및 얼음 화살 원소 기본 공격 마법 해금',
          reqLevel: 5,
          reqSkillId: null,
          costItems: [
            { itemId: 'flint', count: 6 },
            { itemId: 'resin', count: 4 },
          ],
          effectKey: 'element_bolts',
        },
        {
          id: 'elemental_enchant',
          classId: 'MAGE',
          branch: 'element',
          branchName: '원소 마법',
          tier: 2,
          name: '원소 무기 인챈트',
          icon: '⚡',
          desc: '평타 무기 공격에 화염·빙결·번개 속성 부여 (원소 공명 폭발 발동)',
          reqLevel: 14,
          reqSkillId: 'fire_ice_bolt',
          costItems: [
            { itemId: 'quartz', count: 8 },
            { itemId: 'flint', count: 10 },
          ],
          effectKey: 'element_enchant',
        },
        {
          id: 'thunder_shield',
          classId: 'MAGE',
          branch: 'element',
          branchName: '원소 마법',
          tier: 3,
          name: '썬더볼트 & 마나 실드',
          icon: '🔮',
          desc: '단일 극딜 번개 기절 타격 + 공룡 원정대 마나 보호막 부여',
          reqLevel: 18,
          reqSkillId: 'elemental_enchant',
          costItems: [
            { itemId: 'quartz', count: 12 },
            { itemId: 'copper_ore', count: 8 },
          ],
          effectKey: 'mana_shield',
        },
        {
          id: 'meteor_shower',
          classId: 'MAGE',
          branch: 'element',
          branchName: '원소 마법',
          tier: 4,
          name: '메테오 샤워',
          icon: '☄️',
          desc: '화면 전체에 거대한 운석을 연속 투하하는 광역 원소 파멸 마법',
          reqLevel: 25,
          reqSkillId: 'thunder_shield',
          costItems: [
            { itemId: 'obsidian', count: 20 },
            { itemId: 'sulfur', count: 12 },
          ],
          effectKey: 'meteor_shower',
        },
      ],
    },
  },
  NECROMANCER: {
    className: '흑마술사',
    themeColor: 'text-purple-400',
    borderTheme: 'border-purple-500',
    bgTheme: 'bg-purple-950/40',
    branch1: {
      id: 'night',
      name: '어둠의 지배 & 영혼',
      skills: [
        {
          id: 'night_vision',
          classId: 'NECROMANCER',
          branch: 'night',
          branchName: '어둠의 지배',
          tier: 1,
          name: '야간 투시',
          icon: '🦇',
          desc: '밤·동굴 모드 시야 2배 확장, 야간 채집 시 희귀 자원 드랍률 +30%',
          reqLevel: 5,
          reqSkillId: null,
          costItems: [
            { itemId: 'bone', count: 8 },
            { itemId: 'herb', count: 5 },
          ],
          effectKey: 'night_vision_bonus',
          effectValue: 30,
        },
        {
          id: 'soul_harvest',
          classId: 'NECROMANCER',
          branch: 'night',
          branchName: '어둠의 지배',
          tier: 2,
          name: '영혼 수확',
          icon: '🩸',
          desc: '적 처치 시 영혼 파편을 흡수하여 족장 및 펫 체력 10% 즉시 흡혈',
          reqLevel: 12,
          reqSkillId: 'night_vision',
          costItems: [
            { itemId: 'bone', count: 15 },
            { itemId: 'raw_meat', count: 10 },
          ],
          effectKey: 'lifesteal_10pct',
        },
        {
          id: 'undying_march',
          classId: 'NECROMANCER',
          branch: 'night',
          branchName: '어둠의 지배',
          tier: 3,
          name: '불사의 행군',
          icon: '💀',
          desc: '공룡 모험 중 공룡 펫 사망 시 1회 한정 해골 상태로 부활해 전투 지속',
          reqLevel: 20,
          reqSkillId: 'soul_harvest',
          costItems: [
            { itemId: 'bone', count: 25 },
            { itemId: 'obsidian', count: 10 },
          ],
          effectKey: 'skeletal_revive_1x',
        },
      ],
    },
    branch2: {
      id: 'curse',
      name: '저주 & 언데드 소환',
      skills: [
        {
          id: 'venom_curse',
          classId: 'NECROMANCER',
          branch: 'curse',
          branchName: '저주 & 소환',
          tier: 1,
          name: '맹독 코팅 & 약화 저주',
          icon: '🧪',
          desc: '공격 대상 및 보스의 공격력 40% 약화 및 강력한 지속 독 피해',
          reqLevel: 8,
          reqSkillId: null,
          costItems: [
            { itemId: 'herb', count: 10 },
            { itemId: 'bone', count: 6 },
          ],
          effectKey: 'curse_weaken_40',
        },
        {
          id: 'summon_skulls',
          classId: 'NECROMANCER',
          branch: 'curse',
          branchName: '저주 & 소환',
          tier: 2,
          name: '스컬 병사 소환',
          icon: '☠️',
          desc: '전투 개시 시 전방에 피해를 대신 흡수하는 해골 탱커 2기 자동 소환',
          reqLevel: 15,
          reqSkillId: 'venom_curse',
          costItems: [
            { itemId: 'bone', count: 20 },
            { itemId: 'leather', count: 8 },
          ],
          effectKey: 'summon_skull_tanks',
        },
        {
          id: 'skull_dragon_ritual',
          classId: 'NECROMANCER',
          branch: 'curse',
          branchName: '저주 & 소환',
          tier: 3,
          name: '스컬 드래곤 진화 의식',
          icon: '🐉',
          desc: 'Lv.4 이상 공룡 펫을 전설의 불사체 [스컬 드래곤]으로 영구 진화',
          reqLevel: 24,
          reqSkillId: 'summon_skulls',
          costItems: [
            { itemId: 'bone', count: 35 },
            { itemId: 'obsidian', count: 15 },
            { itemId: 'jade', count: 8 },
          ],
          effectKey: 'skull_dragon_evolution',
        },
      ],
    },
  },
  HONEST: {
    className: '정직한 주술사',
    themeColor: 'text-emerald-400',
    borderTheme: 'border-emerald-500',
    bgTheme: 'bg-emerald-950/40',
    branch1: {
      id: 'exploration',
      name: '생활 & 탐험 효율',
      skills: [
        {
          id: 'straw_sandals',
          classId: 'HONEST',
          branch: 'exploration',
          branchName: '생활 & 탐험',
          tier: 1,
          name: '튼튼한 짚신',
          icon: '🩴',
          desc: '공룡 알 부화 필요 도보 거리 20% 단축, 원정대 이동 속도 +15% 가속',
          reqLevel: 5,
          reqSkillId: null,
          costItems: [
            { itemId: 'fiber', count: 10 },
            { itemId: 'leather', count: 4 },
          ],
          effectKey: 'hatch_discount_20',
          effectValue: 20,
        },
        {
          id: 'natures_blessing',
          classId: 'HONEST',
          branch: 'exploration',
          branchName: '생활 & 탐험',
          tier: 2,
          name: '대자연의 축복',
          icon: '🍀',
          desc: '모든 야외 채집 및 암바초 파밍 시 25% 확률로 수확량 2배 획득',
          reqLevel: 12,
          reqSkillId: 'straw_sandals',
          costItems: [
            { itemId: 'apple', count: 10 },
            { itemId: 'herb', count: 10 },
          ],
          effectKey: 'double_gather_chance',
          effectValue: 25,
        },
        {
          id: 'great_migration',
          classId: 'HONEST',
          branch: 'exploration',
          branchName: '생활 & 탐험',
          tier: 3,
          name: '부족 대이동',
          icon: '🏕️',
          desc: '거점 보호 반경 50m → 100m 확장, 원정대 동시 파견 인원 +2명 증가',
          reqLevel: 20,
          reqSkillId: 'natures_blessing',
          costItems: [
            { itemId: 'log', count: 25 },
            { itemId: 'cooked_meat', count: 20 },
          ],
          effectKey: 'base_radius_100',
        },
      ],
    },
    branch2: {
      id: 'tribe',
      name: '공동체 & 번영',
      skills: [
        {
          id: 'pet_bond',
          classId: 'HONEST',
          branch: 'tribe',
          branchName: '공동체 & 번영',
          tier: 1,
          name: '가축화 교감',
          icon: '🐾',
          desc: '거점 수호 펫 최대 배치 한도 3마리 → 4마리로 확장',
          reqLevel: 8,
          reqSkillId: null,
          costItems: [
            { itemId: 'raw_meat', count: 12 },
            { itemId: 'cordage', count: 6 },
          ],
          effectKey: 'guard_pets_4',
        },
        {
          id: 'ancient_trade',
          classId: 'HONEST',
          branch: 'tribe',
          branchName: '공동체 & 번영',
          tier: 2,
          name: '고대 교역술',
          icon: '⚖️',
          desc: '흔한 목재·석재 자원을 구리·주석·은 희귀 광물로 교환하는 교역로 개척',
          reqLevel: 15,
          reqSkillId: 'pet_bond',
          costItems: [
            { itemId: 'log', count: 30 },
            { itemId: 'flint', count: 20 },
          ],
          effectKey: 'ancient_trade_route',
        },
        {
          id: 'sun_festival',
          classId: 'HONEST',
          branch: 'tribe',
          branchName: '공동체 & 번영',
          tier: 3,
          name: '태양의 대축제',
          icon: '☀️',
          desc: '24시간 동안 모든 자원 채집량 +50% 증가 및 제작 재료 소모량 20% 절감',
          reqLevel: 22,
          reqSkillId: 'ancient_trade',
          costItems: [
            { itemId: 'cooked_meat', count: 30 },
            { itemId: 'shell', count: 25 },
          ],
          effectKey: 'sun_festival_buff',
        },
      ],
    },
  },
};

/** Flattened lookup map of all class skill nodes */
export const ALL_CLASS_SKILL_NODES: Record<string, ClassSkillNode> = {};
for (const classConfig of Object.values(CLASS_SKILL_TREES)) {
  for (const s of classConfig.branch1.skills) {
    ALL_CLASS_SKILL_NODES[s.id] = s;
  }
  for (const s of classConfig.branch2.skills) {
    ALL_CLASS_SKILL_NODES[s.id] = s;
  }
}

/** Compute player max GPS speed limit (km/h) based on unlocked Vehicle skills or Engineering Affinity */
export function getPlayerSpeedLimitKmh(classSkills: string[] = [], engineeringAffinity: number = 0): number {
  if (engineeringAffinity >= 250 || classSkills.includes('steam_carriage')) return 60;
  if (engineeringAffinity >= 100 || classSkills.includes('clockwork_bike')) return 35;
  if (engineeringAffinity >= 30 || classSkills.includes('wooden_cart')) return 22;
  if (classSkills.includes('wooden_sled')) return 16;
  return 16;
}

/** Compute player extra reach (meters) based on unlocked Mage skills or Nature Affinity */
export function getPlayerReachBonusM(classSkills: string[] = [], natureAffinity: number = 0): number {
  let bonus = 0;
  if (natureAffinity >= 250 || classSkills.includes('telekinesis_gather')) bonus = Math.max(bonus, 50);
  else if (natureAffinity >= 100) bonus = Math.max(bonus, 30);
  else if (natureAffinity >= 30 || classSkills.includes('mana_sense')) bonus = Math.max(bonus, 15);
  return bonus;
}

/** Validate unlock requirements for a skill node */
export function checkSkillUnlockRequirements(
  skill: ClassSkillNode,
  playerLevel: number,
  learnedSkills: string[],
  ownedStacks: Stack[]
): {
  isUnlockable: boolean;
  isLearned: boolean;
  missingRequirements: string[];
} {
  const isLearned = learnedSkills.includes(skill.id);
  if (isLearned) {
    return { isUnlockable: false, isLearned: true, missingRequirements: [] };
  }

  const missing: string[] = [];

  // 1. Level check
  if (playerLevel < skill.reqLevel) {
    missing.push(`족장 Lv.${skill.reqLevel} 필요 (현재 Lv.${playerLevel})`);
  }

  // 2. Prerequisite skill check
  if (skill.reqSkillId) {
    const parentSkill = ALL_CLASS_SKILL_NODES[skill.reqSkillId];
    if (!learnedSkills.includes(skill.reqSkillId)) {
      missing.push(`선행 기술 [${parentSkill?.name ?? skill.reqSkillId}] 필요`);
    }
  }

  // 3. Item costs check
  const ownedMap = new Map<string, number>();
  for (const s of ownedStacks) {
    ownedMap.set(s.itemId, (ownedMap.get(s.itemId) ?? 0) + s.count);
  }

  for (const cost of skill.costItems) {
    const have = ownedMap.get(cost.itemId) ?? 0;
    if (have < cost.count) {
      const itName = ITEMS[cost.itemId]?.name ?? cost.itemId;
      missing.push(`${itName} ${cost.count - have}개 부족 (보유 ${have}/${cost.count})`);
    }
  }

  return {
    isUnlockable: missing.length === 0,
    isLearned: false,
    missingRequirements: missing,
  };
}
