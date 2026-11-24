import type { SubEnergyId } from './affinitySystem';
import type { ItemId } from '@/lib/survival/items';

export type SkillCategory = 'attack' | 'defense' | 'buff';
export type AttackSubtype = 'ranged' | 'melee';

export type BaseActionId = 'stone_throw' | 'heavy_strike' | 'guard_brace' | 'primal_shout';

export interface BaseActionDef {
  id: BaseActionId;
  name: string;
  category: SkillCategory;
  attackSubtype?: AttackSubtype;
  icon: string;
  desc: string;
  cooldownMs: number;
  basePower: number;
  requiresWeapon?: boolean;
}

export interface SkillSpecializationOption {
  id: string;
  name: string;
  icon: string;
  desc: string;
}

export interface FusedSkillDef {
  id: string;
  baseActionId: BaseActionId;
  subEnergyId: SubEnergyId;
  category: SkillCategory;
  attackSubtype?: AttackSubtype;
  nameStage1: string; // Lv.1~9
  nameStage2: string; // Lv.10+ Awakened
  icon: string;
  elementColor: string; // Hex color for glow and UI tags
  badgeColor: string; // Tailwind class
  vfx:
    | 'fire'
    | 'water'
    | 'wind'
    | 'steam'
    | 'toxic'
    | 'sun'
    | 'pain'
    | 'soul'
    | 'ice'
    | 'shield'
    | 'holy'
    | 'turret'
    | 'skeleton';
  descStage1: string;
  descStage2: string;
  cooldownMs: number;
  durationMs?: number;
  basePower: number;
  powerPerLevel: number;
  stage1RequiredItem?: ItemId;
  stage1RequiredItemName?: string;
  specializations: [
    SkillSpecializationOption,
    SkillSpecializationOption,
    SkillSpecializationOption
  ];
}

export interface PlayerModularSkill {
  id: string;
  masteryLevel: number; // 1 ~ 20
  masteryExp: number;
  isAwakened: boolean; // Lv.10+
  chosenSpecialization: string | null; // Strictly 1 of 3 at Lv.20
  fusedAt: number;
  totalCasts: number;
}

export interface ModularSkillsSaveState {
  unlockedSkills: Record<string, PlayerModularSkill>;
  equippedSkillIds: string[]; // Up to 4 active skills (backward compatible)
  equippedSkillSlots?: [string | null, string | null, string | null]; // 3 quick bar slots
}

// ── 1. Starter Base Actions (항상 사용 가능) ──
export const BASE_ACTIONS: Record<BaseActionId, BaseActionDef> = {
  stone_throw: {
    id: 'stone_throw',
    name: '돌팔매질',
    category: 'attack',
    attackSubtype: 'ranged',
    icon: '🪨',
    desc: '돌멩이나 슬링으로 원거리의 적을 정확히 타격합니다.',
    cooldownMs: 6_000,
    basePower: 12,
    requiresWeapon: true,
  },
  heavy_strike: {
    id: 'heavy_strike',
    name: '내려찍기',
    category: 'attack',
    attackSubtype: 'melee',
    icon: '🔨',
    desc: '온 체중을 실어 묵직한 타격으로 근접한 적에게 강한 피해를 입힙니다.',
    cooldownMs: 6_000,
    basePower: 16,
    requiresWeapon: false,
  },
  guard_brace: {
    id: 'guard_brace',
    name: '웅크려 막기',
    category: 'defense',
    icon: '🛡️',
    desc: '자세를 낮추고 가드를 굳혀 4초간 받는 피해를 35% 감소시킵니다.',
    cooldownMs: 10_000,
    basePower: 35, // 35% damage reduction
  },
  primal_shout: {
    id: 'primal_shout',
    name: '원시 함성',
    category: 'buff',
    icon: '📢',
    desc: '포효를 내질러 10초간 공격력을 +20% 상승시키고 야수를 위협합니다.',
    cooldownMs: 18_000,
    basePower: 20, // +20% buff
  },
};

// ── 2. Standard 1-of-3 Specializations per Category (Lv.20 선택) ──
export const ATTACK_SPECIALIZATIONS: [
  SkillSpecializationOption,
  SkillSpecializationOption,
  SkillSpecializationOption
] = [
  {
    id: 'strike',
    name: '💥 강타 (Heavy Crush)',
    icon: '💥',
    desc: '단일 대상 및 보스에게 입히는 피해량이 +70% 증가합니다.',
  },
  {
    id: 'spread',
    name: '🌊 확산 (Splash AoE)',
    icon: '🌊',
    desc: '타격 시 반경 15m 내 모든 주변 적들에게 65%의 광역 분산 피해를 입힙니다.',
  },
  {
    id: 'crit',
    name: '⚡ 급소 (Lethal Proc)',
    icon: '⚡',
    desc: '치명타 확률 +35%가 부여되며 원소 상태이상(화상/동결/중독)이 100% 발동합니다.',
  },
];

export const DEFENSE_SPECIALIZATIONS: [
  SkillSpecializationOption,
  SkillSpecializationOption,
  SkillSpecializationOption
] = [
  {
    id: 'iron_wall',
    name: '🧱 철벽 (Iron Wall)',
    icon: '🧱',
    desc: '방어막 흡수량 및 피해 감소율(DR)이 2배로 증가합니다.',
  },
  {
    id: 'reflect',
    name: '🪞 반사 (Mirror Thorns)',
    icon: '🪞',
    desc: '방어 중 적에게 피격당할 때마다 차단한 피해량의 50%를 적에게 반사합니다.',
  },
  {
    id: 'regen',
    name: '💚 재생 (Vital Ward)',
    icon: '💚',
    desc: '피격 시 최대 체력의 15%를 즉시 회복하고 모든 상태이상을 정화합니다.',
  },
];

export const BUFF_SPECIALIZATIONS: [
  SkillSpecializationOption,
  SkillSpecializationOption,
  SkillSpecializationOption
] = [
  {
    id: 'maximize',
    name: '🔥 극대화 (Overpower)',
    icon: '🔥',
    desc: '버프 효과 및 소환수의 스탯/공격력이 +60% (1.8배) 대폭 강화됩니다.',
  },
  {
    id: 'wide',
    name: '👥 광역화 (Pack Unity)',
    icon: '👥',
    desc: '버프 효과가 동행 중인 모든 공룡 펫과 부족원에게도 온전히 100% 적용됩니다.',
  },
  {
    id: 'eternal',
    name: '⏳ 영속 (Perpetual)',
    icon: '⏳',
    desc: '버프 지속 시간이 2배로 늘어나고 스킬 쿨타임이 -35% 감소합니다.',
  },
];

// ── 3. Modular Fused Skills (기본 동작 + 12원소 기운 조합) ──
export const FUSED_SKILLS: FusedSkillDef[] = [
  // ── Attack (원거리: stone_throw)
  {
    id: 'pyro_sling',
    baseActionId: 'stone_throw',
    subEnergyId: 'fire',
    category: 'attack',
    attackSubtype: 'ranged',
    nameStage1: '불붙인 돌팔매',
    nameStage2: '화염구 (Fireball)',
    icon: '🔥',
    elementColor: '#f97316',
    badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    vfx: 'fire',
    descStage1: '불타는 탄환을 투척하여 적중 시 폭발 화염 피해를 입힙니다 (슬링/돌 탄환 필요).',
    descStage2: '순수 화염구 마법으로 각성! 무기·탄환 없이 맨손으로 작열하는 화염구를 투척합니다.',
    cooldownMs: 7_000,
    basePower: 26,
    powerPerLevel: 3.5,
    stage1RequiredItem: 'sling_stone',
    stage1RequiredItemName: '돌멩이/부싯돌 탄환',
    specializations: ATTACK_SPECIALIZATIONS,
  },
  {
    id: 'wind_blade',
    baseActionId: 'stone_throw',
    subEnergyId: 'wind',
    category: 'attack',
    attackSubtype: 'ranged',
    nameStage1: '칼바람 슬링',
    nameStage2: '진공 절단파',
    icon: '🌪️',
    elementColor: '#2dd4bf',
    badgeColor: 'bg-teal-500/20 text-teal-400 border-teal-500/40',
    vfx: 'wind',
    descStage1: '돌에 회오리바람을 휘감아 적의 방어구를 관통하는 투석 사격을 가합니다.',
    descStage2: '무기 없이 날카로운 진공 풍압을 날려 직선상의 적들을 궤멸시킵니다.',
    cooldownMs: 6_000,
    basePower: 22,
    powerPerLevel: 3.0,
    stage1RequiredItem: 'sling_stone',
    stage1RequiredItemName: '돌멩이 탄환',
    specializations: ATTACK_SPECIALIZATIONS,
  },
  {
    id: 'hydro_jet',
    baseActionId: 'stone_throw',
    subEnergyId: 'water',
    category: 'attack',
    attackSubtype: 'ranged',
    nameStage1: '물줄기 발사',
    nameStage2: '고압 수류포',
    icon: '🌊',
    elementColor: '#38bdf8',
    badgeColor: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
    vfx: 'water',
    descStage1: '가죽 물주머니로 압축 수류탄을 날려 적을 뒤로 밀어내고 감속시킵니다.',
    descStage2: '대기 중의 수분을 응축한 고압 물줄기로 적을 넉백시키고 기절시킵니다.',
    cooldownMs: 8_000,
    basePower: 24,
    powerPerLevel: 3.2,
    stage1RequiredItem: 'sling_stone',
    stage1RequiredItemName: '돌멩이 탄환',
    specializations: ATTACK_SPECIALIZATIONS,
  },
  {
    id: 'wrist_repeater',
    baseActionId: 'stone_throw',
    subEnergyId: 'tension',
    category: 'attack',
    attackSubtype: 'ranged',
    nameStage1: '손목 연발 쇠뇌',
    nameStage2: '태엽 연발포',
    icon: '🏹',
    elementColor: '#f59e0b',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    vfx: 'steam',
    descStage1: '노끈의 고탄성을 응용한 3연발 속사 쇠뇌입니다 (화살 1개 소모).',
    descStage2: '태엽 장치 가젯으로 완전 자동화! 화살 소모 없이 4연속 고속 볼트를 난사합니다.',
    cooldownMs: 5_500,
    basePower: 30, // total 3 hits
    powerPerLevel: 4.0,
    stage1RequiredItem: 'arrow',
    stage1RequiredItemName: '화살 1발',
    specializations: ATTACK_SPECIALIZATIONS,
  },
  {
    id: 'toxic_cloud',
    baseActionId: 'stone_throw',
    subEnergyId: 'decay',
    category: 'attack',
    attackSubtype: 'ranged',
    nameStage1: '독물 탄환',
    nameStage2: '맹독 구름',
    icon: '☣️',
    elementColor: '#a855f7',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    vfx: 'toxic',
    descStage1: '역청과 독버섯을 묻힌 탄환으로 적에게 6초간 지속되는 맹독 피해를 입힙니다.',
    descStage2: '부패 독기를 폭발시켜 범위 내 적들을 중독시키고 방어력을 25% 깎습니다.',
    cooldownMs: 8_500,
    basePower: 25,
    powerPerLevel: 3.4,
    stage1RequiredItem: 'sling_stone',
    stage1RequiredItemName: '돌멩이 탄환',
    specializations: ATTACK_SPECIALIZATIONS,
  },
  {
    id: 'solar_flash',
    baseActionId: 'stone_throw',
    subEnergyId: 'sun',
    category: 'attack',
    attackSubtype: 'ranged',
    nameStage1: '태양 섬광탄',
    nameStage2: '일광 초신성',
    icon: '☀️',
    elementColor: '#fbbf24',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    vfx: 'sun',
    descStage1: '금빛 광석 가루를 터뜨려 적을 2.5초간 실명시키고 신성 피해를 입힙니다.',
    descStage2: '눈부신 태양빛 섬광을 폭발시켜 적을 4초간 무력화하고 언데드에게 2배 피해를 줍니다.',
    cooldownMs: 10_000,
    basePower: 28,
    powerPerLevel: 3.8,
    stage1RequiredItem: 'sling_stone',
    stage1RequiredItemName: '돌멩이 탄환',
    specializations: ATTACK_SPECIALIZATIONS,
  },

  // ── Attack (근접: heavy_strike)
  {
    id: 'death_surge',
    baseActionId: 'heavy_strike',
    subEnergyId: 'pain',
    category: 'attack',
    attackSubtype: 'melee',
    nameStage1: '상흔 강타',
    nameStage2: '죽음의 파동',
    icon: '🩸',
    elementColor: '#ef4444',
    badgeColor: 'bg-red-500/20 text-red-400 border-red-500/40',
    vfx: 'pain',
    descStage1: '자신의 상처에서 뿜어져 나온 고통을 타격에 실어 잃은 체력 비례 큰 피해를 줍니다.',
    descStage2: '심연의 죽음 파동으로 각성! 체력이 50% 이하일 때 치명타 피해량이 2.5배 폭증합니다.',
    cooldownMs: 8_000,
    basePower: 34,
    powerPerLevel: 4.5,
    specializations: ATTACK_SPECIALIZATIONS,
  },
  {
    id: 'steam_impact',
    baseActionId: 'heavy_strike',
    subEnergyId: 'smelting',
    category: 'attack',
    attackSubtype: 'melee',
    nameStage1: '가열 망치질',
    nameStage2: '증기 압력 타격',
    icon: '⛏️',
    elementColor: '#fb923c',
    badgeColor: 'bg-orange-600/20 text-orange-400 border-orange-500/40',
    vfx: 'steam',
    descStage1: '광석 제련 망치로 강하게 내려찍어 적의 단단한 껍질을 부수고 기절시킵니다.',
    descStage2: '고온 증기 피스톤 타격으로 지면을 강타하여 대상의 방어력을 5초간 0으로 만듭니다.',
    cooldownMs: 7_500,
    basePower: 32,
    powerPerLevel: 4.2,
    specializations: ATTACK_SPECIALIZATIONS,
  },
  {
    id: 'soul_cleave',
    baseActionId: 'heavy_strike',
    subEnergyId: 'soul',
    category: 'attack',
    attackSubtype: 'melee',
    nameStage1: '원혼 베기',
    nameStage2: '영혼 참수',
    icon: '👻',
    elementColor: '#c084fc',
    badgeColor: 'bg-purple-600/20 text-purple-300 border-purple-500/40',
    vfx: 'soul',
    descStage1: '뼈 칼날로 영혼을 베어내며 입힌 피해의 25%를 플레이어의 체력으로 흡수합니다.',
    descStage2: '거대한 유령 낫으로 적을 참수하여 즉사 또는 대량의 생명력을 흡혈합니다.',
    cooldownMs: 8_500,
    basePower: 30,
    powerPerLevel: 4.0,
    specializations: ATTACK_SPECIALIZATIONS,
  },
  {
    id: 'magma_slam',
    baseActionId: 'heavy_strike',
    subEnergyId: 'fire',
    category: 'attack',
    attackSubtype: 'melee',
    nameStage1: '화염 내려찍기',
    nameStage2: '마그마 균열',
    icon: '🌋',
    elementColor: '#dc2626',
    badgeColor: 'bg-red-600/20 text-red-300 border-red-500/40',
    vfx: 'fire',
    descStage1: '화염을 두른 무기로 지면을 내려찍어 불꽃 파편을 튀깁니다.',
    descStage2: '대지를 가르는 용암 균열을 일으켜 반경 10m 내 적들에게 5초간 지속 화염을 입힙니다.',
    cooldownMs: 8_000,
    basePower: 33,
    powerPerLevel: 4.3,
    specializations: ATTACK_SPECIALIZATIONS,
  },

  // ── Defense (guard_brace)
  {
    id: 'frost_armor',
    baseActionId: 'guard_brace',
    subEnergyId: 'water',
    category: 'defense',
    nameStage1: '얼음 껍질',
    nameStage2: '빙하 갑옷',
    icon: '❄️',
    elementColor: '#38bdf8',
    badgeColor: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
    vfx: 'ice',
    descStage1: '단단한 얼음 껍질을 둘러 피해를 45% 줄이고 공격한 적을 3초간 서서히 얼립니다.',
    descStage2: '거대한 빙하 갑옷이 생성되어 적 공격 시 30% 확률로 공격자를 2초간 동결시킵니다.',
    cooldownMs: 14_000,
    durationMs: 7_000,
    basePower: 45, // 45% DR
    powerPerLevel: 1.5,
    specializations: DEFENSE_SPECIALIZATIONS,
  },
  {
    id: 'gale_shroud',
    baseActionId: 'guard_brace',
    subEnergyId: 'wind',
    category: 'defense',
    nameStage1: '바람 장막',
    nameStage2: '질풍의 장막',
    icon: '💨',
    elementColor: '#2dd4bf',
    badgeColor: 'bg-teal-500/20 text-teal-400 border-teal-500/40',
    vfx: 'wind',
    descStage1: '몸 주위에 거센 돌풍을 일으켜 적 공격의 50%를 회피하고 이동 속도를 25% 높입니다.',
    descStage2: '질풍과 하나가 되어 7초간 70% 회피율과 함께 투사체 공격을 100% 빗나가게 합니다.',
    cooldownMs: 12_000,
    durationMs: 6_000,
    basePower: 50, // 50% evasion
    powerPerLevel: 1.0,
    specializations: DEFENSE_SPECIALIZATIONS,
  },
  {
    id: 'steel_bulwark',
    baseActionId: 'guard_brace',
    subEnergyId: 'smelting',
    category: 'defense',
    nameStage1: '단단한 방패막',
    nameStage2: '강철 방벽',
    icon: '🧱',
    elementColor: '#94a3b8',
    badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    vfx: 'shield',
    descStage1: '제련된 금속 판금으로 방어벽을 세워 최대 체력의 35%에 달하는 보호막을 얻습니다.',
    descStage2: '절대 깨지지 않는 강철 방벽 전개! 8초간 최대 체력의 60% 흡수 보호막을 생성합니다.',
    cooldownMs: 15_000,
    durationMs: 8_000,
    basePower: 35, // 35% of max HP shield
    powerPerLevel: 2.0,
    specializations: DEFENSE_SPECIALIZATIONS,
  },
  {
    id: 'undying_will',
    baseActionId: 'guard_brace',
    subEnergyId: 'pain',
    category: 'defense',
    nameStage1: '고통 인내',
    nameStage2: '불사의 각오',
    icon: '❤️‍🔥',
    elementColor: '#ef4444',
    badgeColor: 'bg-red-500/20 text-red-400 border-red-500/40',
    vfx: 'pain',
    descStage1: '치명적인 공격을 받아도 체력 1로 버텨내는 불굴의 근성을 발휘합니다 (쿨타임 45초).',
    descStage2: '불사의 각오 발동 시 사망 대신 체력 1로 생존하며, 3초간 완전 무적 상태가 됩니다.',
    cooldownMs: 45_000,
    durationMs: 8_000,
    basePower: 1, // 1 HP survival guarantee
    powerPerLevel: 0,
    specializations: DEFENSE_SPECIALIZATIONS,
  },
  {
    id: 'plague_carapace',
    baseActionId: 'guard_brace',
    subEnergyId: 'decay',
    category: 'defense',
    nameStage1: '독가시 껍질',
    nameStage2: '역병 갑옷',
    icon: '🦔',
    elementColor: '#a855f7',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    vfx: 'toxic',
    descStage1: '부식성 독가시를 세워 공격자에게 받은 피해의 35%를 역병 독으로 되돌려줍니다.',
    descStage2: '온몸에서 뿜어져 나오는 맹독 오라로 적의 근접 타격마다 70% 피해를 반사합니다.',
    cooldownMs: 13_000,
    durationMs: 8_000,
    basePower: 35, // 35% thorns
    powerPerLevel: 2.5,
    specializations: DEFENSE_SPECIALIZATIONS,
  },
  {
    id: 'sacred_aegis',
    baseActionId: 'guard_brace',
    subEnergyId: 'blessing',
    category: 'defense',
    nameStage1: '수호 기도',
    nameStage2: '성스러운 보호막',
    icon: '🕊️',
    elementColor: '#fbbf24',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    vfx: 'holy',
    descStage1: '신성한 빛의 막(최대 체력 25%)을 펼치고 2초마다 체력을 5%씩 치유합니다.',
    descStage2: '찬란한 성역의 방벽! 보호막 유지 동안 아군 전체가 초당 4% 지속 재생을 누립니다.',
    cooldownMs: 16_000,
    durationMs: 8_000,
    basePower: 25,
    powerPerLevel: 2.0,
    specializations: DEFENSE_SPECIALIZATIONS,
  },

  // ── Buff / Summon (primal_shout)
  {
    id: 'battle_frenzy',
    baseActionId: 'primal_shout',
    subEnergyId: 'fire',
    category: 'buff',
    nameStage1: '타오르는 투지',
    nameStage2: '화염의 투지',
    icon: '🔥',
    elementColor: '#f97316',
    badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    vfx: 'fire',
    descStage1: '가슴 속 열정을 불태워 10초간 공격력 +35%, 공격 속도 +25%를 얻습니다.',
    descStage2: '화염의 투지가 각성하여 모든 일반 공격에 폭발 화염 타격이 100% 추가됩니다.',
    cooldownMs: 20_000,
    durationMs: 10_000,
    basePower: 35, // +35% ATK
    powerPerLevel: 2.5,
    specializations: BUFF_SPECIALIZATIONS,
  },
  {
    id: 'clockwork_turret',
    baseActionId: 'primal_shout',
    subEnergyId: 'machinery',
    category: 'buff',
    nameStage1: '간이 투석기',
    nameStage2: '자동 톱니 포탑',
    icon: '⚙️',
    elementColor: '#f59e0b',
    badgeColor: 'bg-amber-600/20 text-amber-400 border-amber-500/40',
    vfx: 'turret',
    descStage1: '12초간 지속되며 주변 30m 안의 적에게 1.5초마다 돌을 발사하는 포탑을 세웁니다.',
    descStage2: '자동 태엽 개틀링 포탑으로 각성! 15초간 0.8초마다 관통 볼트를 난사합니다.',
    cooldownMs: 25_000,
    durationMs: 15_000,
    basePower: 18,
    powerPerLevel: 2.5,
    specializations: BUFF_SPECIALIZATIONS,
  },
  {
    id: 'summon_skeletons',
    baseActionId: 'primal_shout',
    subEnergyId: 'soul',
    category: 'buff',
    nameStage1: '뼈 병사 부르기',
    nameStage2: '스컬 병사 소환',
    icon: '💀',
    elementColor: '#c084fc',
    badgeColor: 'bg-purple-600/20 text-purple-300 border-purple-500/40',
    vfx: 'skeleton',
    descStage1: '대지에서 뼈 전사 2구를 일으켜 15초간 적의 어그로를 끌고 협공을 펼칩니다.',
    descStage2: '단단한 스컬 병사 2구가 각성하여 적의 공격을 흡수하고 뼈 칼날로 베어냅니다.',
    cooldownMs: 28_000,
    durationMs: 18_000,
    basePower: 22,
    powerPerLevel: 2.8,
    specializations: BUFF_SPECIALIZATIONS,
  },
  {
    id: 'wither_hex',
    baseActionId: 'primal_shout',
    subEnergyId: 'decay',
    category: 'buff',
    nameStage1: '부식 악담',
    nameStage2: '약화 저주 (Hex)',
    icon: '👁️',
    elementColor: '#a855f7',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    vfx: 'toxic',
    descStage1: '적에게 부패의 저주를 내려 10초간 적/보스의 공격력을 -40%, 방어력을 -30% 깎습니다.',
    descStage2: '광역 심연 저주로 각성하여 주변 모든 적의 공격력을 -50% 반토막 내고 이동 속도를 늦춥니다.',
    cooldownMs: 20_000,
    durationMs: 10_000,
    basePower: 40, // -40% enemy ATK
    powerPerLevel: 1.5,
    specializations: BUFF_SPECIALIZATIONS,
  },
  {
    id: 'sanctuary_of_unity',
    baseActionId: 'primal_shout',
    subEnergyId: 'bond',
    category: 'buff',
    nameStage1: '부족의 연대',
    nameStage2: '수호의 성역',
    icon: '🤝',
    elementColor: '#10b981',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    vfx: 'holy',
    descStage1: '부족원과 펫에게 결속의 기운을 불어넣어 12초간 파티 전체 ATK +30%, DEF +30%를 부여합니다.',
    descStage2: '황금빛 수호의 성역을 발현하여 15초간 파티 전체 ATK/DEF +50% 및 넉백 면역을 부여합니다.',
    cooldownMs: 25_000,
    durationMs: 15_000,
    basePower: 30, // +30% party ATK/DEF
    powerPerLevel: 2.0,
    specializations: BUFF_SPECIALIZATIONS,
  },
  {
    id: 'solar_grace',
    baseActionId: 'primal_shout',
    subEnergyId: 'sun',
    category: 'buff',
    nameStage1: '햇살 기도',
    nameStage2: '태양의 축복',
    icon: '☀️',
    elementColor: '#fbbf24',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    vfx: 'sun',
    descStage1: '태양의 가호를 받아 모든 상태이상을 즉시 정화하고 야간에도 대낮처럼 시야를 확보합니다.',
    descStage2: '15초간 이동 속도 +35%, 상태이상 완전 면역, 야간 시야 반경 2배 확장 효과를 누립니다.',
    cooldownMs: 22_000,
    durationMs: 15_000,
    basePower: 35,
    powerPerLevel: 1.5,
    specializations: BUFF_SPECIALIZATIONS,
  },
];

// ── 4. Helper Functions ──
export const FUSED_SKILLS_MAP: Record<string, FusedSkillDef> = Object.fromEntries(
  FUSED_SKILLS.map(s => [s.id, s])
);

export const FUSION_RECIPES_BY_PAIR: Record<string, FusedSkillDef> = Object.fromEntries(
  FUSED_SKILLS.map(s => [`${s.baseActionId}:${s.subEnergyId}`, s])
);

export function getFusionRecipe(
  baseActionId: BaseActionId,
  subEnergyId: SubEnergyId
): FusedSkillDef | undefined {
  return FUSION_RECIPES_BY_PAIR[`${baseActionId}:${subEnergyId}`];
}

export function expRequiredForMasteryLevel(level: number): number {
  if (level >= 20) return Infinity;
  return level * 3; // Lv.1 requires 3, Lv.2 requires 6, ..., Lv.19 requires 57
}

export function defaultPlayerSkill(skillId: string): PlayerModularSkill {
  return {
    id: skillId,
    masteryLevel: 1,
    masteryExp: 0,
    isAwakened: false,
    chosenSpecialization: null,
    fusedAt: Date.now(),
    totalCasts: 0,
  };
}

export function defaultModularSkillsState(): ModularSkillsSaveState {
  return {
    unlockedSkills: {
      stone_throw: defaultPlayerSkill('stone_throw'),
      heavy_strike: defaultPlayerSkill('heavy_strike'),
      guard_brace: defaultPlayerSkill('guard_brace'),
      primal_shout: defaultPlayerSkill('primal_shout'),
    },
    equippedSkillIds: ['stone_throw', 'heavy_strike', 'guard_brace'],
    equippedSkillSlots: ['stone_throw', 'heavy_strike', 'guard_brace'],
  };
}

export function getSkillDisplayName(
  skillId: string,
  playerSkill?: PlayerModularSkill
): string {
  const base = BASE_ACTIONS[skillId as BaseActionId];
  if (base) return base.name;
  const fused = FUSED_SKILLS_MAP[skillId];
  if (!fused) return skillId;
  const isAwakened = (playerSkill?.masteryLevel ?? 1) >= 10 || !!playerSkill?.isAwakened;
  return isAwakened ? fused.nameStage2 : fused.nameStage1;
}

export function getSkillDisplayIcon(skillId: string): string {
  const base = BASE_ACTIONS[skillId as BaseActionId];
  if (base) return base.icon;
  const fused = FUSED_SKILLS_MAP[skillId];
  return fused?.icon ?? '⚡';
}

export function getSkillCooldownMs(
  skillId: string,
  playerSkill?: PlayerModularSkill
): number {
  const base = BASE_ACTIONS[skillId as BaseActionId];
  let cd = base ? base.cooldownMs : (FUSED_SKILLS_MAP[skillId]?.cooldownMs ?? 10_000);
  if (playerSkill?.chosenSpecialization === 'eternal') {
    cd = Math.round(cd * 0.65); // -35% cooldown
  }
  return cd;
}
