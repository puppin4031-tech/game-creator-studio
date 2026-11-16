export type TribeClassId = 'tank' | 'gatherer' | 'ranged' | 'assassin';

export interface TribeClassDef {
  id: TribeClassId;
  name: string;
  role: string;
  icon: string;
  weaponName: string;
  shortLabel: string;
  desc: string;
  perkSummary: string;
  /** Multiplier applied to tribe max HP */
  hpMult: number;
  /** Flat defense bonus added to base tribe defense (3) */
  defBonus: number;
  /** Multiplier applied to creature combat attack damage */
  atkMult: number;
  /** Multiplier applied to resource node gathering power */
  gatherMult: number;
  /** Multiplier applied to expedition march speed */
  speedMult: number;
  /** Multiplier applied to attack interval (0.5 = 2x faster attack speed) */
  attackIntervalMult: number;
  /** Engagement radius in meters for creature attacks (30m for ranged) */
  attackRangeM: number;
  /** Radius in meters to pull aggressive monster aggro first */
  aggroRadiusM: number;
  /** Multiplier applied to incoming beast counter-attack damage */
  counterDamageMult: number;
  /** True if opening strike from range takes zero retaliation damage */
  firstStrikeSafe: boolean;
  /** Critical hit probability (0..1) */
  critChance: number;
  /** Critical hit damage multiplier */
  critMult: number;
  /** Auto-pickup radius in meters along movement path for wood/ore/eggs (0 if disabled) */
  autoGatherRadiusM: number;
  /** Player backpack capacity bonus ratio when active (+0.30 = +30%) */
  carryBonusRatio: number;
  /** Wall/base defense damage reduction ratio (0.35 = -35% damage taken at base/palisade) */
  wallDefenseBonus: number;
  /** Number of animation frames in 4-frame leopard-skirt sprite loop */
  spriteFrames: 4;
  /** Animation interval in ms per frame */
  frameIntervalMs: number;
  /** CSS filter for sprite color differentiation */
  spriteFilter: string;
  /** Accent badge class for weapon/class overlay */
  badgeClass: string;
  /** Weapon overlay symbol */
  weaponIcon: string;
}

export const DEFAULT_TRIBE_CLASS: TribeClassId = 'tank';

export const TRIBE_CLASSES: Record<TribeClassId, TribeClassDef> = {
  tank: {
    id: 'tank',
    name: '거인 부족',
    role: '탱커',
    icon: '🛡️',
    weaponName: '거석 방패·곤봉',
    shortLabel: '거인(탱커)',
    desc: '높은 HP와 방어력, 적 몬스터의 어그로를 먼저 끌며 거점 성벽 방어 시 피해 감소 보너스.',
    perkSummary: 'HP +80% · 방어 +5 · 선공 어그로 제압 · 성벽 방어 피해 -35%',
    hpMult: 1.8,
    defBonus: 5,
    atkMult: 1.0,
    gatherMult: 1.0,
    speedMult: 0.95,
    attackIntervalMult: 1.0,
    attackRangeM: 12,
    aggroRadiusM: 25,
    counterDamageMult: 0.65,
    firstStrikeSafe: false,
    critChance: 0.05,
    critMult: 1.5,
    autoGatherRadiusM: 0,
    carryBonusRatio: 0,
    wallDefenseBonus: 0.35,
    spriteFrames: 4,
    frameIntervalMs: 240,
    spriteFilter: 'sepia(0.25) saturate(1.35) brightness(0.98)',
    badgeClass: 'bg-amber-700 text-amber-50 border-amber-300',
    weaponIcon: '🛡️',
  },
  gatherer: {
    id: 'gatherer',
    name: '파밍 부족',
    role: '채집가',
    icon: '🎒',
    weaponName: '채집 망태·돌도끼',
    shortLabel: '파밍(채집)',
    desc: '이동 속도 빠름, 이동 경로 반경 내 나무·광석·알을 별도 조작 없이 자동으로 줍고 배낭 적재량 +30% 증가.',
    perkSummary: '이동속도 +40% · 반경 18m 나무·광석·알 자동 수거 · 배낭 +30%',
    hpMult: 1.05,
    defBonus: 1,
    atkMult: 0.9,
    gatherMult: 1.45,
    speedMult: 1.4,
    attackIntervalMult: 1.0,
    attackRangeM: 10,
    aggroRadiusM: 10,
    counterDamageMult: 0.9,
    firstStrikeSafe: false,
    critChance: 0.08,
    critMult: 1.5,
    autoGatherRadiusM: 18,
    carryBonusRatio: 0.3,
    wallDefenseBonus: 0,
    spriteFrames: 4,
    frameIntervalMs: 160,
    spriteFilter: 'hue-rotate(65deg) saturate(1.3)',
    badgeClass: 'bg-emerald-700 text-emerald-50 border-emerald-300',
    weaponIcon: '⛏️',
  },
  ranged: {
    id: 'ranged',
    name: '원거리 부족',
    role: '원딜',
    icon: '🏹',
    weaponName: '사냥 활·투창',
    shortLabel: '원거리(원딜)',
    desc: '활과 투창 사용, 사거리 30m 밖에서 안전하게 선제 사격 (공룡 반격 피해를 덜 입음).',
    perkSummary: '사거리 30m 선제 사격 · 공룡 반격 피해 -65% 감소',
    hpMult: 0.95,
    defBonus: 0,
    atkMult: 1.25,
    gatherMult: 1.0,
    speedMult: 1.05,
    attackIntervalMult: 0.9,
    attackRangeM: 30,
    aggroRadiusM: 30,
    counterDamageMult: 0.35,
    firstStrikeSafe: true,
    critChance: 0.15,
    critMult: 1.6,
    autoGatherRadiusM: 0,
    carryBonusRatio: 0,
    wallDefenseBonus: 0.1,
    spriteFrames: 4,
    frameIntervalMs: 180,
    spriteFilter: 'hue-rotate(155deg) saturate(1.35)',
    badgeClass: 'bg-sky-700 text-sky-50 border-sky-300',
    weaponIcon: '🏹',
  },
  assassin: {
    id: 'assassin',
    name: '스피드 딜러',
    role: '암살자',
    icon: '⚡',
    weaponName: '쌍수 뼈 단검',
    shortLabel: '스피드(암살)',
    desc: '공격 속도가 2배 빠르며 치명타 확률이 높음, 뼈 단검으로 4프레임 고속 연타 모션 수행.',
    perkSummary: '공격속도 2배(0.5초) · 치명타 40% · 뼈 단검 4프레임 고속 연타',
    hpMult: 0.9,
    defBonus: 0,
    atkMult: 1.15,
    gatherMult: 1.1,
    speedMult: 1.25,
    attackIntervalMult: 0.5,
    attackRangeM: 10,
    aggroRadiusM: 15,
    counterDamageMult: 0.8,
    firstStrikeSafe: false,
    critChance: 0.4,
    critMult: 1.8,
    autoGatherRadiusM: 0,
    carryBonusRatio: 0,
    wallDefenseBonus: 0,
    spriteFrames: 4,
    frameIntervalMs: 90,
    spriteFilter: 'hue-rotate(265deg) saturate(1.5) contrast(1.05)',
    badgeClass: 'bg-purple-800 text-purple-50 border-purple-300',
    weaponIcon: '🗡️',
  },
};

export const TRIBE_CLASS_LIST: TribeClassDef[] = [
  TRIBE_CLASSES.tank,
  TRIBE_CLASSES.gatherer,
  TRIBE_CLASSES.ranged,
  TRIBE_CLASSES.assassin,
];

export function getTribeClass(id?: TribeClassId | string | null): TribeClassDef {
  if (id && id in TRIBE_CLASSES) return TRIBE_CLASSES[id as TribeClassId];
  return TRIBE_CLASSES[DEFAULT_TRIBE_CLASS];
}

/** Backpack capacity multiplier when the player has gatherer tribe members. */
export function tribeCarryBonusKg(baseCapacityKg: number, tribeCount: number, classId?: TribeClassId | null): number {
  if (tribeCount <= 0 || classId !== 'gatherer') return 0;
  return Math.round(baseCapacityKg * TRIBE_CLASSES.gatherer.carryBonusRatio);
}

/** Wall/base defense damage reduction when tank/ranged tribe members guard the base. */
export function applyTribeWallDefense(damage: number, hasPalisade: boolean, tribeCount: number, classId?: TribeClassId | null): number {
  if (!hasPalisade || tribeCount <= 0) return damage;
  const def = getTribeClass(classId);
  if (def.wallDefenseBonus <= 0) return damage;
  return Math.max(1, Math.floor(damage * (1 - def.wallDefenseBonus)));
}
