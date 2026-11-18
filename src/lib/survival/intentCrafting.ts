// User Intent-based AI Architecture & Equipment Crafting Engine
// Analyzes user intent + material physical matrix (elasticity, durability, weather-resistance, density)
// Strictly enforces allowed mechanics pools and realistic primitive anachronism guardrails.

import { MATERIAL_PHYSICS, type MaterialPhysics } from './invention';
import { ITEMS, type ItemId } from './items';

// ==========================================
// 1. Allowed Mechanics Pools (Guardrail)
// ==========================================

export type BuildingMechanicTag =
  | 'WALL_BLOCK'      // 적 이동 차단 & 성벽 방어
  | 'NIGHT_VISION'    // 야간 시야 +30m
  | 'AUTO_ARROW'      // 반경 내 적 자동 원거리 요격
  | 'HEAL_AURA'       // 주변 펫/부족민 지속 회복
  | 'STORAGE_UP'      // 창고 용량 확장 (+50kg)
  | 'WEATHER_RESIST'; // 부식/내구도 소모 -50% 강화

export type GearMechanicTag =
  | 'MELEE_FAST'     // 단거리 공속 증가 (공격 딜레이 -40%)
  | 'RANGED_SNIPE'    // 원거리 사격 (사거리 +25m & 선공 치명타)
  | 'POISON_HIT'      // 중독 지속피해 (+6 맹독 피해)
  | 'BLEED_HIT'       // 출혈 피해 (출혈 치명타 +25%)
  | 'STUN_HIT'        // 기절 확률 (35% 확률로 몬스터 스턴 & 반격 무력화)
  | 'GATHER_BOOST'    // 채집량 증가 (자원 채집 시 +1 추가 수확)
  | 'DAMAGE_REDUCE';  // 방어력/피해감소 (받는 피해 -30%)

export interface MechanicMeta {
  id: string;
  name: string;
  icon: string;
  desc: string;
  badgeClass: string;
}

export const BUILDING_MECHANICS_META: Record<BuildingMechanicTag, MechanicMeta> = {
  WALL_BLOCK: {
    id: 'WALL_BLOCK',
    name: '적 이동 차단',
    icon: '🛡️',
    desc: '침입자의 경로를 막고 성벽 방어력을 대폭 가산합니다.',
    badgeClass: 'bg-amber-500/20 text-amber-500 border-amber-500/40',
  },
  NIGHT_VISION: {
    id: 'NIGHT_VISION',
    name: '야간 시야 +30m',
    icon: '👁️',
    desc: '건축물 주변 및 거점의 야간 탐색 시야를 30m 확장합니다.',
    badgeClass: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
  },
  AUTO_ARROW: {
    id: 'AUTO_ARROW',
    name: '반경 자동 요격',
    icon: '🏹',
    desc: '반경 30m 내로 접근하는 적이나 침입자를 자동으로 요격 사격합니다.',
    badgeClass: 'bg-red-500/20 text-red-400 border-red-500/40',
  },
  HEAL_AURA: {
    id: 'HEAL_AURA',
    name: '치유의 안식처',
    icon: '💚',
    desc: '거점 내 부족민, 수호 펫, 플레이어의 체력을 틱당 지속 회복합니다.',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  },
  STORAGE_UP: {
    id: 'STORAGE_UP',
    name: '창고 용량 확장',
    icon: '📦',
    desc: '거점 보관소의 최대 적재 용량을 +50kg 확장합니다.',
    badgeClass: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
  },
  WEATHER_RESIST: {
    id: 'WEATHER_RESIST',
    name: '내후/부식 강화',
    icon: '🌧️',
    desc: '풍화와 화학적 부식을 견뎌내며 건축물 내구도 손상을 50% 줄입니다.',
    badgeClass: 'bg-teal-500/20 text-teal-400 border-teal-500/40',
  },
};

export const GEAR_MECHANICS_META: Record<GearMechanicTag, MechanicMeta> = {
  MELEE_FAST: {
    id: 'MELEE_FAST',
    name: '신속 연타',
    icon: '⚡',
    desc: '무기 공격 딜레이를 40% 단축하여 빠르게 연속 공격합니다.',
    badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  },
  RANGED_SNIPE: {
    id: 'RANGED_SNIPE',
    name: '원거리 저격',
    icon: '🎯',
    desc: '사거리를 25m 추가 연장하고 원거리 선공 시 치명타를 가합니다.',
    badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  },
  POISON_HIT: {
    id: 'POISON_HIT',
    name: '맹독 지속피해',
    icon: '🧪',
    desc: '타격 시 몬스터에게 맹독을 주입하여 매초 지속 피해를 입힙니다.',
    badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  },
  BLEED_HIT: {
    id: 'BLEED_HIT',
    name: '출혈 급소타격',
    icon: '🩸',
    desc: '급소를 베어 상처를 내며 치명타 추가 피해 +25%를 가합니다.',
    badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  },
  STUN_HIT: {
    id: 'STUN_HIT',
    name: '충격 기절(스턴)',
    icon: '💫',
    desc: '35% 확률로 몬스터를 기절시켜 반격 행동을 완전히 무력화합니다.',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  },
  GATHER_BOOST: {
    id: 'GATHER_BOOST',
    name: '풍요로운 수확',
    icon: '🌾',
    desc: '나무, 광석 등 자원 채집 시 추가 자원 +1개를 더 수확합니다.',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  },
  DAMAGE_REDUCE: {
    id: 'DAMAGE_REDUCE',
    name: '충격 완화 방어',
    icon: '🛡️',
    desc: '맹수 및 적의 돌진 공격 피해를 30% 감쇄시킵니다.',
    badgeClass: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  },
};

// ==========================================
// 2. Physical Properties Matrix (0 ~ 10)
// ==========================================

export interface PhysicalAttributes {
  elasticity: number;   // 탄성 (유연성, 반발력, 활/스피드에 기여)
  durability: number;   // 내구성 (단단함, 마모 저항, 방어벽에 기여)
  weatherResist: number;// 내후/부식성 (화학적 안정성, 비바람 저항)
  density: number;      // 밀도 (질량, 중량감, 타격력/스턴에 기여)
}

/** Weather-resistance ratings per material (resins, jades, quartz are extremely resistant). */
const MATERIAL_WEATHER_RESIST: Record<string, number> = {
  resin: 9.5,
  jade: 10,
  quartz: 10,
  obsidian: 9.0,
  clay_pot: 8.5,
  bone: 7.0,
  tusk: 8.0,
  leather: 7.5,
  frost_shard: 8.5,
  frost_pelt: 7.0,
  prime_pelt: 6.5,
  ancient_fang: 9.0,
  log: 6.0,
  flint: 8.0,
  branch: 4.5,
  fiber: 3.5,
  soil: 3.0,
  clay: 4.0,
  hide: 4.5,
  ochre: 7.0,
};

export function computeMaterialPhysics(materials: Record<string, number>): PhysicalAttributes {
  const entries = Object.entries(materials).filter(([, q]) => q > 0);
  const total = entries.reduce((sum, [, q]) => sum + q, 0);
  if (!total) {
    return { elasticity: 2, durability: 2, weatherResist: 2, density: 2 };
  }

  let weightedElasticity = 0;
  let weightedDurability = 0;
  let weightedWeather = 0;
  let weightedDensity = 0;

  for (const [id, count] of entries) {
    const p: MaterialPhysics = MATERIAL_PHYSICS[id] ?? {
      hardness: 2,
      toughness: 2,
      sharpness: 2,
      binding: 2,
      mass: 2,
      mystic: 0,
      color: '#888',
    };
    const weather = MATERIAL_WEATHER_RESIST[id] ?? 5;

    weightedElasticity += p.toughness * count;
    weightedDurability += p.hardness * count;
    weightedWeather += weather * count;
    weightedDensity += p.mass * count;
  }

  return {
    elasticity: Math.round((weightedElasticity / total) * 10) / 10,
    durability: Math.round((weightedDurability / total) * 10) / 10,
    weatherResist: Math.round((weightedWeather / total) * 10) / 10,
    density: Math.round((weightedDensity / total) * 10) / 10,
  };
}

// ==========================================
// 3. AI Safety Guardrail & Analysis
// ==========================================

export interface IntentCraftResult {
  ok: boolean;
  name: string;
  desc: string;
  category: string;
  isAnachronistic: boolean;
  anachronismExplanation?: string;
  physics: PhysicalAttributes;
  awardedMechanics: (BuildingMechanicTag | GearMechanicTag)[];
  powerScore: number;
  statsLabel: string;
  hp?: number;
  atk?: number;
  def?: number;
}

const ANACHRONISM_PATTERNS = [
  { regex: /(비행기|항공기|전투기|헬기|드론|우주선|airplane|plane|drone|helicopter)/i, label: '비행기/비행체' },
  { regex: /(총|소총|권총|머스킷|기관총|바주카|탄환|총알|화약|gun|rifle|pistol|bullet)/i, label: '현대 총기' },
  { regex: /(핵|원자폭탄|원자력|미사일|폭탄|다이너마이트|nuclear|bomb|missile|dynamite)/i, label: '핵/폭탄' },
  { regex: /(탱크|장갑차|자동차|엔진|모터|오토바이|tank|car|engine|motor)/i, label: '기계/차량' },
  { regex: /(레이저|플라즈마|컴퓨터|스마트폰|로봇|전기|laser|plasma|robot|computer)/i, label: '전자/레이저' },
];

export function analyzeCraftingIntent({
  mode,
  subCategory,
  materials,
  userIntent,
}: {
  mode: 'building' | 'gear';
  subCategory: 'fence' | 'tower' | 'building' | 'melee' | 'ranged' | 'tool' | 'armor';
  materials: Record<string, number>;
  userIntent: string;
}): IntentCraftResult {
  const text = (userIntent || '').trim();
  const physics = computeMaterialPhysics(materials);
  const primaryMat = Object.entries(materials).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'branch';
  const matName = ITEMS[primaryMat as ItemId]?.name ?? '원시 재료';

  // 1. Check for modern / impossible anachronisms (Safety Guardrail)
  let anachronisticMatch: string | null = null;
  for (const pat of ANACHRONISM_PATTERNS) {
    if (pat.regex.test(text)) {
      anachronisticMatch = pat.label;
      break;
    }
  }

  const isAnachronistic = !!anachronisticMatch;
  let anachronismExplanation: string | undefined = undefined;

  // 2. Category & Mechanics Mapping
  if (mode === 'building') {
    const mechanics: BuildingMechanicTag[] = [];

    if (isAnachronistic) {
      anachronismExplanation = `⚠️ 시대적 한계 보정: 현재 원시 시대와 재료 환경에서는 현대 문명의 기술(${anachronisticMatch})을 구현할 수 없습니다. 대신 투입하신 재료의 물리 속성(탄성 ${physics.elasticity}, 내구성 ${physics.durability}, 밀도 ${physics.density})을 분석해, 같은 의도를 원시 시대에 구현할 수 있는 [고지대 원거리 요격 망루 및 강화 방벽]으로 현실적 보정 설계를 진행했습니다.`;
      mechanics.push('NIGHT_VISION', 'AUTO_ARROW');
    } else {
      // Intent parsing with semantic keyword detection
      if (/(밤|야간|시야|빛|불|감시|관측|망루|전망)/.test(text) || subCategory === 'tower') {
        mechanics.push('NIGHT_VISION');
      }
      if (/(화살|쏘는|요격|사격|투척|공격|자동|방어사격)/.test(text) || (subCategory === 'tower' && physics.elasticity >= 4.0)) {
        if (!mechanics.includes('AUTO_ARROW')) mechanics.push('AUTO_ARROW');
      }
      if (/(치료|회복|힐|생명|안식|휴식|약초)/.test(text)) {
        mechanics.push('HEAL_AURA');
      }
      if (/(창고|보관|저장|적재|수납|적치)/.test(text)) {
        mechanics.push('STORAGE_UP');
      }
      if (/(막는|차단|울타리|방책|성벽|철벽|가시)/.test(text) || subCategory === 'fence') {
        if (!mechanics.includes('WALL_BLOCK')) mechanics.push('WALL_BLOCK');
      }
      if (/(단단|내구|부식|날씨|비바람|영구|비)/.test(text) || physics.weatherResist >= 7.5) {
        if (!mechanics.includes('WEATHER_RESIST')) mechanics.push('WEATHER_RESIST');
      }

      // Default fallback if no keywords matched: use dominant physical attribute
      if (mechanics.length === 0) {
        if (subCategory === 'tower') mechanics.push('NIGHT_VISION', 'AUTO_ARROW');
        else if (subCategory === 'fence') mechanics.push('WALL_BLOCK', 'WEATHER_RESIST');
        else mechanics.push('HEAL_AURA', 'STORAGE_UP');
      }
    }

    // Strictly limit to 1~2 mechanics (Guardrail requirement)
    const awardedMechanics = mechanics.slice(0, 2);

    // Compute building HP based on durability and density
    const baseHp = subCategory === 'fence' ? 250 : subCategory === 'tower' ? 450 : 600;
    const computedHp = Math.round(baseHp + physics.durability * 25 + physics.density * 20);

    const name = isAnachronistic
      ? `보정된 ${matName} 감시망루`
      : subCategory === 'tower'
        ? `${matName} 요격 망루`
        : subCategory === 'fence'
          ? `강화 ${matName} 방책`
          : `부족 ${matName} 안식소`;

    const desc = isAnachronistic
      ? `시대적 보정을 거쳐 탄성과 내구성을 살린 원시 요격 건축물.`
      : text.length > 0
        ? `[의도: ${text.slice(0, 30)}] — 탄성 ${physics.elasticity}·내구성 ${physics.durability} 기반 특수 건축물.`
        : `${matName}의 물리적 결합으로 탄생한 특수 마을 건축물.`;

    return {
      ok: true,
      name,
      desc,
      category: subCategory,
      isAnachronistic,
      anachronismExplanation,
      physics,
      awardedMechanics,
      powerScore: Math.round((physics.durability * 1.5 + physics.density) * 10) / 10,
      statsLabel: `내구도(HP) ${computedHp}`,
      hp: computedHp,
    };
  } else {
    // Mode === 'gear' (Weapons, Tools, Armor)
    const mechanics: GearMechanicTag[] = [];

    if (isAnachronistic) {
      anachronismExplanation = `⚠️ 시대적 한계 보정: 현대/미래의 복잡한 공학 무기(${anachronisticMatch})는 제작할 수 없습니다. 대신 투입하신 재료들의 물리 수치(밀도 ${physics.density}, 탄성 ${physics.elasticity}, 내구성 ${physics.durability})를 살려, 같은 수준의 관통력과 살상력을 가진 [원시 결전 저격무기 / 맹독 급소창]으로 현실적 보정 설계를 진행했습니다.`;
      mechanics.push('RANGED_SNIPE', 'POISON_HIT');
    } else {
      if (/(빠른|속도|연타|공속|민첩|재빠른)/.test(text) || (subCategory === 'melee' && physics.elasticity >= 5.5)) {
        mechanics.push('MELEE_FAST');
      }
      if (/(저격|원거리|사거리|멀리|선공|활)/.test(text) || subCategory === 'ranged') {
        mechanics.push('RANGED_SNIPE');
      }
      if (/(독|맹독|중독|부식|화학|독침)/.test(text)) {
        mechanics.push('POISON_HIT');
      }
      if (/(출혈|급소|베기|날카로운|찢는|상처)/.test(text)) {
        mechanics.push('BLEED_HIT');
      }
      if (/(기절|스턴|충격|강타|무거운|분쇄|넉다운)/.test(text) || physics.density >= 6.5) {
        mechanics.push('STUN_HIT');
      }
      if (/(채집|수확|벌목|채굴|파밍|풍요)/.test(text) || subCategory === 'tool') {
        mechanics.push('GATHER_BOOST');
      }
      if (/(방어|피해감소|보호|감쇄|철벽|단단)/.test(text) || subCategory === 'armor') {
        mechanics.push('DAMAGE_REDUCE');
      }

      // Default fallback
      if (mechanics.length === 0) {
        if (subCategory === 'melee') mechanics.push('MELEE_FAST', 'BLEED_HIT');
        else if (subCategory === 'ranged') mechanics.push('RANGED_SNIPE', 'POISON_HIT');
        else if (subCategory === 'tool') mechanics.push('GATHER_BOOST');
        else mechanics.push('DAMAGE_REDUCE', 'STUN_HIT');
      }
    }

    // Strictly limit to 1~2 mechanics (Guardrail requirement)
    const awardedMechanics = mechanics.slice(0, 2);

    const baseAtk = subCategory === 'ranged' ? 18 : subCategory === 'melee' ? 14 : 6;
    const computedAtk = Math.round(baseAtk + physics.durability * 1.4 + physics.density * 1.2);
    const computedDef = Math.round(physics.durability * 1.8 + physics.weatherResist * 0.8);

    const name = isAnachronistic
      ? `보정된 ${matName} 결전기`
      : subCategory === 'ranged'
        ? `정밀 ${matName} 저격활`
        : subCategory === 'melee'
          ? `쾌속 ${matName} 칼날`
          : subCategory === 'tool'
            ? `풍요의 ${matName} 도구`
            : `수호의 ${matName} 갑옷`;

    const desc = isAnachronistic
      ? `시대적 보정을 거쳐 밀도와 파괴력을 극대화한 원시 결전 무기.`
      : text.length > 0
        ? `[의도: ${text.slice(0, 30)}] — 탄성 ${physics.elasticity}·밀도 ${physics.density} 부여 장비.`
        : `${matName}을(를) 정밀 가공하여 제작한 맞춤형 장비.`;

    return {
      ok: true,
      name,
      desc,
      category: subCategory,
      isAnachronistic,
      anachronismExplanation,
      physics,
      awardedMechanics,
      powerScore: Math.round((physics.durability * 1.2 + physics.elasticity * 1.2) * 10) / 10,
      statsLabel: subCategory === 'armor' ? `방어력(DEF) +${computedDef}` : `공격력(ATK) ${computedAtk}`,
      atk: computedAtk,
      def: computedDef,
    };
  }
}
