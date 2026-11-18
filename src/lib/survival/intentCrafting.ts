// User Intent-based AI Architecture & Equipment Crafting Engine
// Analyzes user intent + material physical matrix (elasticity, durability, weather-resistance, density)
// Strictly enforces allowed mechanics pools and realistic primitive anachronism guardrails.

import { MATERIAL_PHYSICS, type MaterialPhysics } from './invention';
import { ITEMS, type ItemId } from './items';

// ==========================================
// 1. Allowed Mechanics Pools (Guardrail)
// ==========================================

export type BuildingMechanicTag =
  | 'WALL_BLOCK'      // 적 이동 차단 & 성벽 방어 (durability: 450)
  | 'NIGHT_VISION'    // 야간 시야 +40m (night_vision_radius: +40m)
  | 'AUTO_ARROW'      // 반경 자동 원거리 공격 (auto_turret_range: 35m, atk: 18)
  | 'HEAL_AURA'       // 주변 펫/부족민 지속 회복
  | 'STORAGE_UP'      // 창고 용량 확장 (+50kg)
  | 'WEATHER_RESIST'; // 부식/내구도 강화 (corrosion_resist: 80%)

export type GearMechanicTag =
  | 'BLEED'          // 출혈 (BLEED)
  | 'POISON'         // 중독 (POISON)
  | 'STUN'           // 기절 (STUN)
  | 'SLOW'           // 둔화 (SLOW)
  | 'CRIT_UP'        // 치명타 증가 (CRIT_UP)
  | 'FAST_ATK'       // 공속 증가 (FAST_ATK)
  | 'GATHER_WOOD'    // 벌목량 증가 (GATHER_WOOD)
  | 'GATHER_ORE'     // 채광량 증가 (GATHER_ORE)
  | 'THORNS'         // 피격 반사 (THORNS)
  // Backward-compatible aliases
  | 'MELEE_FAST'     // 단거리 공속 증가
  | 'RANGED_SNIPE'    // 원거리 사격
  | 'POISON_HIT'      // 중독 지속피해
  | 'BLEED_HIT'       // 출혈 피해
  | 'STUN_HIT'        // 기절 확률
  | 'GATHER_BOOST'    // 채집량 증가
  | 'DAMAGE_REDUCE';  // 방어력/피해감소

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
    name: '적 이동 차단 (WALL_BLOCK)',
    icon: '🛡️',
    desc: '침입자의 경로를 막고 성벽 기본 내구도를 대폭 부여합니다. (durability: 450)',
    badgeClass: 'bg-amber-500/20 text-amber-500 border-amber-500/40',
  },
  NIGHT_VISION: {
    id: 'NIGHT_VISION',
    name: '야간 시야 확장 (NIGHT_VISION)',
    icon: '👁️',
    desc: '건축물 주변 및 거점의 야간 탐색 시야를 +40m 확장합니다. (night_vision_radius: +40m)',
    badgeClass: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
  },
  AUTO_ARROW: {
    id: 'AUTO_ARROW',
    name: '반경 자동 원거리 공격 (AUTO_ARROW)',
    icon: '🏹',
    desc: '접근하는 야생 동물/침입자를 자동 요격 공격합니다. (auto_turret_range: 35m, atk: 18)',
    badgeClass: 'bg-red-500/20 text-red-400 border-red-500/40',
  },
  HEAL_AURA: {
    id: 'HEAL_AURA',
    name: '치유의 안식처 (HEAL_AURA)',
    icon: '💚',
    desc: '거점 내 부족민, 수호 펫, 플레이어의 체력을 틱당 지속 회복합니다.',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  },
  STORAGE_UP: {
    id: 'STORAGE_UP',
    name: '창고 용량 확장 (STORAGE_UP)',
    icon: '📦',
    desc: '거점 보관소의 최대 적재 용량을 +50kg 확장합니다.',
    badgeClass: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
  },
  WEATHER_RESIST: {
    id: 'WEATHER_RESIST',
    name: '부식/내구 강화 (WEATHER_RESIST)',
    icon: '🌧️',
    desc: '풍화와 화학적 부식을 견뎌내며 건축물 내구도 소모를 줄입니다. (corrosion_resist: 80%)',
    badgeClass: 'bg-teal-500/20 text-teal-400 border-teal-500/40',
  },
};

export const GEAR_MECHANICS_META: Record<GearMechanicTag, MechanicMeta> = {
  BLEED: {
    id: 'BLEED',
    name: '출혈 (BLEED)',
    icon: '🩸',
    desc: '급소를 베어 상처를 내며 출혈 지속 피해 및 치명타 추가 피해 +25%를 가합니다.',
    badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  },
  POISON: {
    id: 'POISON',
    name: '중독 (POISON)',
    icon: '🧪',
    desc: '타격 시 맹독을 주입하여 매초 지속 중독 피해(+6)를 입힙니다.',
    badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  },
  STUN: {
    id: 'STUN',
    name: '기절 (STUN)',
    icon: '💫',
    desc: '35% 확률로 몬스터를 충격 기절시켜 반격 행동을 완전히 무력화합니다.',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  },
  SLOW: {
    id: 'SLOW',
    name: '둔화 (SLOW)',
    icon: '❄️',
    desc: '적의 이동속도와 공격속도를 40% 감속시켜 거리를 벌립니다.',
    badgeClass: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  },
  CRIT_UP: {
    id: 'CRIT_UP',
    name: '치명타 증가 (CRIT_UP)',
    icon: '🎯',
    desc: '급소 조준 정밀도를 극대화하여 치명타 확률을 +30% 상승시킵니다.',
    badgeClass: 'bg-red-500/20 text-red-400 border-red-500/40',
  },
  FAST_ATK: {
    id: 'FAST_ATK',
    name: '공속 증가 (FAST_ATK)',
    icon: '⚡',
    desc: '무기 공격 딜레이를 40% 단축하여 신속하게 연속 타격을 가합니다.',
    badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  },
  GATHER_WOOD: {
    id: 'GATHER_WOOD',
    name: '벌목 채집 증가 (GATHER_WOOD)',
    icon: '🪓',
    desc: '나무 벌목 시 추가 목재 및 질긴 나뭇가지를 +1개 더 수확합니다.',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  },
  GATHER_ORE: {
    id: 'GATHER_ORE',
    name: '채광 채집 증가 (GATHER_ORE)',
    icon: '⛏️',
    desc: '광석 및 암석 채굴 시 희귀 광물을 +1개 더 추가 수확합니다.',
    badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  },
  THORNS: {
    id: 'THORNS',
    name: '피격 반사 (THORNS)',
    icon: '🛡️',
    desc: '피격 시 가시 및 반발력으로 공격자에게 피해량의 30%를 반사합니다.',
    badgeClass: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
  },
  // Backward-compatible aliases
  MELEE_FAST: {
    id: 'MELEE_FAST',
    name: '신속 연타 (FAST_ATK)',
    icon: '⚡',
    desc: '무기 공격 딜레이를 40% 단축하여 빠르게 연속 공격합니다.',
    badgeClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  },
  RANGED_SNIPE: {
    id: 'RANGED_SNIPE',
    name: '원거리 저격 (CRIT_UP)',
    icon: '🎯',
    desc: '사거리를 25m 추가 연장하고 원거리 선공 시 치명타를 가합니다.',
    badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  },
  POISON_HIT: {
    id: 'POISON_HIT',
    name: '맹독 지속피해 (POISON)',
    icon: '🧪',
    desc: '타격 시 몬스터에게 맹독을 주입하여 매초 지속 피해를 입힙니다.',
    badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  },
  BLEED_HIT: {
    id: 'BLEED_HIT',
    name: '출혈 급소타격 (BLEED)',
    icon: '🩸',
    desc: '급소를 베어 상처를 내며 치명타 추가 피해 +25%를 가합니다.',
    badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  },
  STUN_HIT: {
    id: 'STUN_HIT',
    name: '충격 기절(스턴) (STUN)',
    icon: '💫',
    desc: '35% 확률로 몬스터를 기절시켜 반격 행동을 완전히 무력화합니다.',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  },
  GATHER_BOOST: {
    id: 'GATHER_BOOST',
    name: '풍요로운 수확 (GATHER_ORE/WOOD)',
    icon: '🌾',
    desc: '나무, 광석 등 자원 채집 시 추가 자원 +1개를 더 수확합니다.',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  },
  DAMAGE_REDUCE: {
    id: 'DAMAGE_REDUCE',
    name: '충격 완화 방어 (THORNS)',
    icon: '🛡️',
    desc: '맹수 및 적의 돌진 공격 피해를 30% 감쇄시키고 반사합니다.',
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
  bitumen: 10.0,
  copper_ore: 7.5,
  copper_ingot: 8.0,
  tin_ore: 8.5,
  bronze_ingot: 9.0,
  silver_ore: 9.0,
  gold_ore: 10.0,
  magnetite: 8.5,
  steel_ingot: 9.5,
  coal: 6.0,
  limestone: 7.5,
  sulfur: 5.5,
  mercury: 9.0,
  meteor_shard: 10.0,
  mana_stone: 9.5,
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

export interface BuildingSpecs {
  night_vision_radius: number; // +40m (밤에 시야 확장)
  auto_turret_range: number;   // 35m (접근하는 적 자동 요격)
  auto_turret_atk: number;     // 18 (공격력)
  durability: number;          // 450 (성벽/망루 내구도)
  corrosion_resist: number;    // 80% (부식/내후 저항률)
}

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
  buildingSpecs?: BuildingSpecs;
}

const ANACHRONISM_PATTERNS = [
  { regex: /(하늘.*요새|공중.*요새|부유.*요새|하늘을\s*나는|공중\s*요새|부유.*구조물|공중.*기지|flying.*fortress|floating.*fortress|floating.*castle|sky.*castle)/i, label: '부유 공중 요새' },
  { regex: /(핵폭탄|원자폭탄|원자력|미사일|폭탄|다이너마이트|레이저|즉사기|즉사|nuke|nuclear|laser|instant.*kill)/i, label: '핵/레이저/즉사기' },
  { regex: /(비행기|항공기|전투기|헬기|드론|우주선|airplane|plane|drone|helicopter)/i, label: '비행기/비행체' },
  { regex: /(총|소총|권총|머스킷|기관총|바주카|탄환|총알|화약|gun|rifle|pistol|bullet)/i, label: '현대 총기' },
  { regex: /(탱크|장갑차|자동차|엔진|모터|오토바이|tank|car|engine|motor)/i, label: '기계/차량' },
  { regex: /(플라즈마|컴퓨터|스마트폰|로봇|전기|plasma|robot|computer)/i, label: '전자/로봇' },
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

  // 1. Specific floating/flying fortress check (Guardrail requirement 3.1)
  const isSkyFortress = /(하늘.*요새|공중.*요새|부유.*요새|하늘을\s*나는|공중\s*요새|부유.*구조물|공중.*기지|flying.*fortress|floating.*fortress|floating.*castle|sky.*castle)/i.test(text);

  // 2. Specific modern impossible weapon / nuke / laser / instant-kill check (Guardrail requirement 3.2)
  const isImpossibleWeapon = /(핵폭탄|원자폭탄|원자력|미사일|폭탄|다이너마이트|레이저|즉사기|즉사|nuke|nuclear|laser|instant.*kill)/i.test(text);

  // 3. General anachronism check
  let anachronisticMatch: string | null = null;
  for (const pat of ANACHRONISM_PATTERNS) {
    if (pat.regex.test(text)) {
      anachronisticMatch = pat.label;
      break;
    }
  }

  const isAnachronistic = isSkyFortress || isImpossibleWeapon || !!anachronisticMatch;
  let anachronismExplanation: string | undefined = undefined;

  // 2. Category & Mechanics Mapping
  if (mode === 'building') {
    const mechanics: BuildingMechanicTag[] = [];

    if (isSkyFortress) {
      anachronismExplanation = '원시 물리 법칙상 중력을 거스르는 부유 구조물은 불가능합니다. 대신 지면 지지력을 높인 고층 목조 망루로 설계합니다.';
      mechanics.push('NIGHT_VISION', 'AUTO_ARROW');
    } else if (isAnachronistic) {
      anachronismExplanation = `⚠️ 시대적 한계 보정: 현재 원시 시대와 재료 환경에서는 현대 문명의 기술(${anachronisticMatch})을 구현할 수 없습니다. 대신 투입하신 재료의 물리 속성(탄성 ${physics.elasticity}, 내구성 ${physics.durability}, 밀도 ${physics.density})을 분석해, 원시 시대에 구현 가능한 [고층 목조 망루 및 강화 방벽]으로 현실적 보정 설계를 진행했습니다.`;
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

    // Material-specific high-tier synergy overrides
    const hasBitumen = (materials.bitumen ?? 0) > 0;
    const hasGold = (materials.gold_ore ?? 0) > 0 || (materials.silver_ore ?? 0) > 0;
    const hasMagnetite = (materials.magnetite ?? 0) > 0;

    if (hasBitumen && !mechanics.includes('WEATHER_RESIST')) {
      mechanics.unshift('WEATHER_RESIST');
    }
    if (hasGold && !mechanics.includes('HEAL_AURA')) {
      mechanics.push('HEAL_AURA');
    }

    // Strictly limit to 1~2 mechanics (Guardrail requirement)
    const awardedMechanics = mechanics.slice(0, 2);

    // Compute building HP based on durability and density (Bitumen grants +400 bonus)
    const baseHp = subCategory === 'fence' ? 250 : subCategory === 'tower' ? 450 : 600;
    const bitumenBonus = hasBitumen ? 400 : hasMagnetite ? 300 : 0;
    const computedHp = isSkyFortress
      ? 450
      : Math.round(baseHp + bitumenBonus + physics.durability * 25 + physics.density * 20);

    const name = isSkyFortress
      ? '고층 목조 망루'
      : isAnachronistic
        ? `보정된 ${matName} 감시망루`
        : hasBitumen && subCategory === 'fence'
          ? `역청 방수 성벽`
          : hasGold
            ? `태양신 영광의 ${matName} 제단`
            : subCategory === 'tower'
              ? `${matName} 요격 망루`
              : subCategory === 'fence'
                ? `강화 ${matName} 방책`
                : `부족 ${matName} 안식소`;

    const desc = isSkyFortress
      ? '지면 지지력을 높이고 야간 시야(+40m)와 자동 요격(35m, atk 18)을 탑재한 고층 목조 망루.'
      : isAnachronistic
        ? `시대적 보정을 거쳐 탄성과 내구성을 살린 원시 요격 건축물.`
        : hasBitumen
          ? `역청의 강력한 점성과 방수성이 목재의 부식을 막고 돌 사이의 틈을 메워 내구도 +400 및 부식 저항 80% 달성.`
          : text.length > 0
            ? `[의도: ${text.slice(0, 30)}] — 탄성 ${physics.elasticity}·내구성 ${physics.durability} 기반 특수 건축물.`
            : `${matName}의 물리적 결합으로 탄생한 특수 마을 건축물.`;

    const buildingSpecs: BuildingSpecs = {
      night_vision_radius: 40,
      auto_turret_range: 35,
      auto_turret_atk: 18,
      durability: computedHp,
      corrosion_resist: hasBitumen ? 95 : 80,
    };

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
      buildingSpecs,
    };
  } else {
    // Mode === 'gear' (Weapons, Tools, Armor)
    const mechanics: GearMechanicTag[] = [];

    if (isImpossibleWeapon) {
      anachronismExplanation = '핵폭탄, 레이저, 즉사기 같은 불가능한 요구는 원시 물리 법칙상 구현할 수 없습니다. 재료의 물성 한계(부싯돌·흑요석의 경도와 독성)에 맞춰 가장 근접한 현실적 원시 무기인 [맹독 흑요석 찌르기 단검]으로 자동 보정 설계합니다.';
      mechanics.push('POISON', 'FAST_ATK');
    } else if (isAnachronistic) {
      anachronismExplanation = `⚠️ 시대적 한계 보정: 현대/미래의 복잡한 공학 무기(${anachronisticMatch})는 제작할 수 없습니다. 대신 투입하신 재료들의 물리 수치(밀도 ${physics.density}, 탄성 ${physics.elasticity}, 내구성 ${physics.durability})를 살려, 같은 수준의 관통력과 살상력을 가진 [원시 결전 저격무기 / 맹독 급소창]으로 현실적 보정 설계를 진행했습니다.`;
      mechanics.push('CRIT_UP', 'POISON');
    } else {
      if (/(출혈|급소|베기|날카로운|찢는|상처)/.test(text)) {
        mechanics.push('BLEED');
      }
      if (/(독|맹독|중독|부식|화학|독침)/.test(text)) {
        mechanics.push('POISON');
      }
      if (/(기절|스턴|충격|강타|무거운|분쇄|넉다운)/.test(text) || physics.density >= 6.5) {
        mechanics.push('STUN');
      }
      if (/(둔화|이속|감속|느리게|얼음|냉기)/.test(text)) {
        mechanics.push('SLOW');
      }
      if (/(치명타|크리티컬|급소|저격|원거리|사거리|멀리|선공|활)/.test(text) || subCategory === 'ranged') {
        mechanics.push('CRIT_UP');
      }
      if (/(빠른|속도|연타|공속|민첩|재빠른)/.test(text) || (subCategory === 'melee' && physics.elasticity >= 5.5)) {
        mechanics.push('FAST_ATK');
      }
      if (/(벌목|나무|목재|나뭇가지)/.test(text)) {
        mechanics.push('GATHER_WOOD');
      }
      if (/(채광|광석|돌|철|금속)/.test(text)) {
        mechanics.push('GATHER_ORE');
      }
      if (/(채집|수확|파밍|풍요)/.test(text) || subCategory === 'tool') {
        if (!mechanics.includes('GATHER_WOOD') && !mechanics.includes('GATHER_ORE')) {
          mechanics.push('GATHER_WOOD', 'GATHER_ORE');
        }
      }
      if (/(방어|반사|가시|피해감소|보호|감쇄|철벽|단단)/.test(text) || subCategory === 'armor') {
        mechanics.push('THORNS');
      }

      // Default fallback
      if (mechanics.length === 0) {
        if (subCategory === 'melee') mechanics.push('FAST_ATK', 'BLEED');
        else if (subCategory === 'ranged') mechanics.push('CRIT_UP', 'POISON');
        else if (subCategory === 'tool') mechanics.push('GATHER_WOOD', 'GATHER_ORE');
        else mechanics.push('THORNS', 'STUN');
      }
    }

    // Material-specific high-tier synergy overrides for gear
    const hasMagnetiteGear = (materials.magnetite ?? 0) > 0;
    const hasGoldGear = (materials.gold_ore ?? 0) > 0 || (materials.silver_ore ?? 0) > 0;
    const hasSulfurGear = (materials.sulfur ?? 0) > 0;

    if (hasMagnetiteGear) {
      if (subCategory === 'tool' && !mechanics.includes('GATHER_ORE')) mechanics.unshift('GATHER_ORE');
      else if (!mechanics.includes('STUN')) mechanics.unshift('STUN');
    }
    if (hasGoldGear && !mechanics.includes('FAST_ATK') && subCategory === 'melee') {
      mechanics.unshift('FAST_ATK');
    }
    if (hasSulfurGear && !mechanics.includes('POISON')) {
      mechanics.unshift('POISON');
    }

    // Strictly limit to 1~2 mechanics (Guardrail requirement)
    const awardedMechanics = mechanics.slice(0, 2);

    const baseAtk = subCategory === 'ranged' ? 18 : subCategory === 'melee' ? 14 : 6;
    const computedAtk = Math.round(baseAtk + physics.durability * 1.4 + physics.density * 1.2);
    const computedDef = Math.round(physics.durability * 1.8 + physics.weatherResist * 0.8);

    const name = isImpossibleWeapon
      ? '맹독 흑요석 찌르기 단검'
      : isAnachronistic
        ? `보정된 ${matName} 결전기`
        : hasMagnetiteGear && subCategory === 'tool'
          ? `자력 탐사 곡괭이`
          : hasGoldGear && subCategory === 'melee'
            ? `태양신 의식용 단검`
            : subCategory === 'ranged'
              ? `정밀 ${matName} 저격활`
              : subCategory === 'melee'
                ? `쾌속 ${matName} 칼날`
                : subCategory === 'tool'
                  ? `풍요의 ${matName} 도구`
                  : `수호의 ${matName} 갑옷`;

    const desc = isImpossibleWeapon
      ? '재료의 물성 한계(부싯돌·흑요석 경도와 독성)에 맞춰 찌를 때마다 맹독을 주입하는 현실적 원시 단검.'
      : isAnachronistic
        ? `시대적 보정을 거쳐 밀도와 파괴력을 극대화한 원시 결전 무기.`
        : hasMagnetiteGear && subCategory === 'tool'
          ? `자철석의 자성이 금속 광맥을 끌어당겨 채광 시 추가 광석을 획득.`
          : hasGoldGear && subCategory === 'melee'
            ? `부식되지 않는 순금의 전도성과 흑요석의 예리함이 결합되어 치명타 및 공속 극대화.`
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
