// Organic 4-Affinity & 12-Sub-Energy Progression System
// Replaces rigid one-time Shaman class locks with behavior-driven, continuous growth.

export type AffinityId = 'nature' | 'engineering' | 'death' | 'divinity';

export type SubEnergyId =
  // Nature (대자연)
  | 'wind'      // 바람: 100m 걷기 +2, 스캔 +1
  | 'water'     // 물: 음수/수변 채집 +2~3 (허기/갈증 < 95% 시)
  | 'fire'      // 불: 모닥불 요리 +3, 화공/연료 채집 +2
  // Engineering (공학·기술)
  | 'tension'   // 장력: 원거리 5타격 +1, 노끈/활/물매 제작 +2
  | 'smelting'  // 제련: 광석 채굴 +2, 주괴 제련 +4, 도구 파괴(내구도 0) +5
  | 'machinery' // 기계: 시설 건축 +5, AI 제단 발명 +6
  // Death (심연·죽음)
  | 'pain'      // 고통: 체력 20% 미만 승리 +8, 플레이어/펫 사망 +15 (5분 쿨타임)
  | 'decay'     // 부패: 몹 처치 +2, 부패물/역청 채집 +3
  | 'soul'      // 영혼: 뼈 채집 +2, 야간/동굴 전투 승리 +4
  // Divinity (신성·조화)
  | 'blessing'  // 축복: 고인돌 성소/제단 봉헌 +5, 체력 회복 +3 (실제 부상 시)
  | 'sun'       // 태양: 주간 100m 걷기 +1, 금/은 봉헌 +10
  | 'bond';     // 결속: 부족원 동행 100m +2, 거점 방어전 승리 +10

export interface SubEnergyMeta {
  id: SubEnergyId;
  affinity: AffinityId;
  name: string;
  icon: string;
  desc: string;
  howToGain: string;
  baseGain: number;
}

export interface AffinityMilestone {
  points: number;
  title: string;
  perk: string;
}

export interface AffinityMeta {
  id: AffinityId;
  name: string;
  title: string;
  icon: string;
  themeColor: string;
  borderColor: string;
  bgGradient: string;
  subEnergies: SubEnergyId[];
  desc: string;
  shamanClassId: 'mage' | 'engineer' | 'warlock' | 'orthodox';
  milestones: AffinityMilestone[];
}

export const SUB_ENERGIES: Record<SubEnergyId, SubEnergyMeta> = {
  wind: {
    id: 'wind',
    affinity: 'nature',
    name: '바람 기운',
    icon: '💨',
    desc: '자연의 숨결과 기동력. 빠르게 대지를 탐험할 때 축적됩니다.',
    howToGain: '유효 속도 내 100m 걷기 (+2), 레이더 스캔 (+1)',
    baseGain: 2,
  },
  water: {
    id: 'water',
    affinity: 'nature',
    name: '물 기운',
    icon: '💧',
    desc: '갈증을 해소하고 대지를 적시는 생명력의 원천입니다.',
    howToGain: '샘물/야자 섭취 (+3, 허기<95%), 수변/약초 채집 (+2)',
    baseGain: 3,
  },
  fire: {
    id: 'fire',
    affinity: 'nature',
    name: '불 기운',
    icon: '🔥',
    desc: '어둠과 추위를 물리치고 원시의 밤을 밝히는 온기입니다.',
    howToGain: '모닥불 요리/훈제 (+3), 석탄/유황/역청 채취 (+2)',
    baseGain: 3,
  },

  tension: {
    id: 'tension',
    affinity: 'engineering',
    name: '장력 기운',
    icon: '🏹',
    desc: '시위를 당기고 밧줄을 엮는 탄성과 원거리 제어력입니다.',
    howToGain: '원거리 무기 5회 적중 (+1), 노끈/가죽/활/물매 제작 (+2)',
    baseGain: 2,
  },
  smelting: {
    id: 'smelting',
    affinity: 'engineering',
    name: '제련 기운',
    icon: '⛏️',
    desc: '단단한 광석을 녹이고 망치로 두드려 강철을 빚는 힘입니다.',
    howToGain: '광석 채굴 (+2), 금속 주괴 제련 (+4), 도구 파괴(내구도 0) (+5)',
    baseGain: 4,
  },
  machinery: {
    id: 'machinery',
    affinity: 'engineering',
    name: '기계 기운',
    icon: '⚙️',
    desc: '문명의 정밀한 시설과 태엽 구조물을 세우는 발명의 힘입니다.',
    howToGain: '거점·마을 건물 축조 (+5), AI 제단 발명 (+6)',
    baseGain: 5,
  },

  pain: {
    id: 'pain',
    affinity: 'death',
    name: '고통 기운',
    icon: '🩸',
    desc: '죽음의 문턱에서 살아남은 상흔과 시련의 낙인입니다.',
    howToGain: '체력 20% 미만 사냥 승리 (+8), 플레이어/펫 사망 (+15, 5분 쿨)',
    baseGain: 8,
  },
  decay: {
    id: 'decay',
    affinity: 'death',
    name: '부패 기운',
    icon: '☣️',
    desc: '생명이 썩어 흙으로 돌아가는 순환과 독기의 기운입니다.',
    howToGain: '야생 몹 처치 (+2), 상한 음식/독성 역청 채취 (+3)',
    baseGain: 2,
  },
  soul: {
    id: 'soul',
    affinity: 'death',
    name: '영혼 기운',
    icon: '👻',
    desc: '고대 생물의 뼈와 밤의 안개 속에 서린 잔류 사념입니다.',
    howToGain: '뼈 무덤 채취 (+2), 야간 및 동굴 맹수 사냥 (+4)',
    baseGain: 2,
  },

  blessing: {
    id: 'blessing',
    affinity: 'divinity',
    name: '축복 기운',
    icon: '🕊️',
    desc: '상처 입은 자를 보살피고 성소에 정성을 바치는 치유력입니다.',
    howToGain: '고인돌 성소/제단 봉헌 (+5), 부상 시 연고/약초 치료 (+3)',
    baseGain: 3,
  },
  sun: {
    id: 'sun',
    affinity: 'divinity',
    name: '태양 기운',
    icon: '☀️',
    desc: '낮의 대지를 비추는 황금빛 태양과 변치 않는 귀금속의 권위입니다.',
    howToGain: '낮 100m 걷기 (+1), 금/은광석 성소 봉헌 (+10)',
    baseGain: 1,
  },
  bond: {
    id: 'bond',
    affinity: 'divinity',
    name: '결속 기운',
    icon: '🤝',
    desc: '부족원 및 펫과 함께 발을 맞추고 마을을 지켜내는 신뢰입니다.',
    howToGain: '부족원 동행 100m 걷기 (+2), 거점 방어전 승리 (+10)',
    baseGain: 2,
  },
};

export const AFFINITIES: Record<AffinityId, AffinityMeta> = {
  nature: {
    id: 'nature',
    name: '대자연 (Nature)',
    title: '원소와 생명의 숨결',
    icon: '🌿',
    themeColor: 'text-emerald-400',
    borderColor: 'border-emerald-500',
    bgGradient: 'from-emerald-950/90 to-teal-950/95',
    subEnergies: ['wind', 'water', 'fire'],
    shamanClassId: 'mage',
    desc: '바람, 물, 불의 원소 조화로 GPS 채집 사거리를 넓히고 대지의 수확량을 극대화합니다.',
    milestones: [
      { points: 30, title: '채집 감응 (+15m)', perk: 'GPS 채집 사거리가 15m 넓어지고 청록빛 자연 오라가 발현됩니다.' },
      { points: 100, title: '대자연 공명 (+30m)', perk: 'GPS 채집 사거리가 30m로 대폭 확장되고 수확 시 2배 보너스 확률이 부여됩니다.' },
      { points: 250, title: '자연과의 합일 (+50m)', perk: '화면 끝까지 닿는 초원거리 50m 채집 및 희귀 원소 식물 발견율이 급증합니다.' },
    ],
  },
  engineering: {
    id: 'engineering',
    name: '공학·문명 (Engineering)',
    title: '증기와 강철의 개척',
    icon: '🔧',
    themeColor: 'text-orange-400',
    borderColor: 'border-orange-500',
    bgGradient: 'from-orange-950/90 to-stone-900/95',
    subEnergies: ['tension', 'smelting', 'machinery'],
    shamanClassId: 'engineer',
    desc: '탄성과 제련, 기계 발명으로 GPS 인정 이동 속도를 해제하고 마을의 방어력을 극대화합니다.',
    milestones: [
      { points: 30, title: '기동성 해제 (22 km/h)', perk: 'GPS 탐험 인정 속도가 22km/h로 증가하며 톱니바퀴 황동 오라가 발현됩니다.' },
      { points: 100, title: '증기 추진 (35 km/h)', perk: 'GPS 탐험 인정 속도가 35km/h(자전거/경주)까지 확장됩니다.' },
      { points: 250, title: '폭주 기관 (60 km/h)', perk: '차량 및 대중교통 이동 시 최대 60km/h까지 거리와 탐험이 온전히 기록됩니다.' },
    ],
  },
  death: {
    id: 'death',
    name: '심연·죽음 (Death)',
    title: '영혼과 뼈의 지배자',
    icon: '💀',
    themeColor: 'text-purple-400',
    borderColor: 'border-purple-500',
    bgGradient: 'from-purple-950/90 to-zinc-950/95',
    subEnergies: ['pain', 'decay', 'soul'],
    shamanClassId: 'warlock',
    desc: '고통과 부패, 영혼 수확으로 야간/동굴의 전리품을 높이고 언데드 용 [스컬 드래곤]을 각성시킵니다.',
    milestones: [
      { points: 30, title: '어둠의 장막 (+15%)', perk: '밤이나 동굴 탐험 시 희귀 드랍률이 +15% 증가하고 보랏빛 심연 오라가 발현됩니다.' },
      { points: 100, title: '심연의 포식자 (+30%)', perk: '밤/동굴 희귀 드랍이 +30%로 급증하며 처치 시 영혼 흡혈 확률이 부여됩니다.' },
      { points: 250, title: '스컬 드래곤의 각성', perk: '암흑 강령 의식을 거행하여 Lv.4+ 공룡을 전설 [스컬 드래곤]으로 각성시킬 수 있습니다.' },
    ],
  },
  divinity: {
    id: 'divinity',
    name: '신성·조화 (Divinity)',
    title: '정통 문명과 풍요의 수호자',
    icon: '👑',
    themeColor: 'text-amber-300',
    borderColor: 'border-amber-400',
    bgGradient: 'from-amber-950/90 to-emerald-950/95',
    subEnergies: ['blessing', 'sun', 'bond'],
    shamanClassId: 'orthodox',
    desc: '치유와 태양, 부족 결속으로 알 부화 거리를 단축하고 마을 거점 반경을 최대 100m까지 확장합니다.',
    milestones: [
      { points: 30, title: '풍요의 은총 (-10%)', perk: '공룡 알 부화 필요 거리가 10% 감소하고 황금빛 문명 오라가 발현됩니다.' },
      { points: 100, title: '부족의 수호자 (-20% & 4마리)', perk: '알 부화 거리 20% 감소 및 거점 배치 수호 펫이 3마리에서 4마리로 확장됩니다.' },
      { points: 250, title: '태양 제국의 번영 (거점 100m)', perk: '거점 인정 반경이 50m에서 100m로 대폭 확장되고 알 부화 거리가 30% 감소합니다.' },
    ],
  },
};

export interface AffinityState {
  energies: Record<SubEnergyId, number>;
  totals: Record<AffinityId, number>;
  dominantAffinity: AffinityId | null;
  dominantValue: number;
  lastPainDeathAt?: number;
  walkAccumulatorM?: number;
  dayWalkAccumulatorM?: number;
  tribeWalkAccumulatorM?: number;
  rangedHitsCount?: number;
}

export function defaultAffinityState(): AffinityState {
  return {
    energies: {
      wind: 0,
      water: 0,
      fire: 0,
      tension: 0,
      smelting: 0,
      machinery: 0,
      pain: 0,
      decay: 0,
      soul: 0,
      blessing: 0,
      sun: 0,
      bond: 0,
    },
    totals: {
      nature: 0,
      engineering: 0,
      death: 0,
      divinity: 0,
    },
    dominantAffinity: null,
    dominantValue: 0,
    lastPainDeathAt: 0,
    walkAccumulatorM: 0,
    dayWalkAccumulatorM: 0,
    tribeWalkAccumulatorM: 0,
    rangedHitsCount: 0,
  };
}

export function computeAffinityTotals(energies: Record<SubEnergyId, number>): Record<AffinityId, number> {
  return {
    nature: (energies.wind || 0) + (energies.water || 0) + (energies.fire || 0),
    engineering: (energies.tension || 0) + (energies.smelting || 0) + (energies.machinery || 0),
    death: (energies.pain || 0) + (energies.decay || 0) + (energies.soul || 0),
    divinity: (energies.blessing || 0) + (energies.sun || 0) + (energies.bond || 0),
  };
}

export function computeDominantAffinity(totals: Record<AffinityId, number>): {
  dominantAffinity: AffinityId | null;
  dominantValue: number;
} {
  const entries: [AffinityId, number][] = Object.entries(totals) as [AffinityId, number][];
  let maxAffinity: AffinityId | null = null;
  let maxVal = 0;
  for (const [aff, val] of entries) {
    if (val > maxVal) {
      maxVal = val;
      maxAffinity = aff;
    }
  }
  // Dominant affinity & aesthetic auras activate only when reaching >= 30 points!
  if (maxVal >= 30) {
    return { dominantAffinity: maxAffinity, dominantValue: maxVal };
  }
  return { dominantAffinity: null, dominantValue: maxVal };
}

export function mapAffinityToShamanClass(
  affinity: AffinityId | null
): 'mage' | 'engineer' | 'warlock' | 'orthodox' | null {
  if (!affinity) return null;
  switch (affinity) {
    case 'nature':
      return 'mage';
    case 'engineering':
      return 'engineer';
    case 'death':
      return 'warlock';
    case 'divinity':
      return 'orthodox';
    default:
      return null;
  }
}

export interface EnergyGainEvent {
  energy: SubEnergyId;
  amount: number;
  reason?: string;
  silent?: boolean;
}

const DEATH_PAIN_COOLDOWN_MS = 5 * 60 * 1000; // 5-minute cooldown for pain death bonus

export function applyEnergyGain(
  prev: AffinityState | undefined,
  event: EnergyGainEvent,
  now: number = Date.now()
): { next: AffinityState; granted: boolean; reason?: string } {
  const state = prev ? { ...prev, energies: { ...prev.energies } } : defaultAffinityState();

  // Anti-Abuse: Pain energy from death enforces 5-minute cooldown
  if (event.energy === 'pain' && event.reason === 'death') {
    if (now - (state.lastPainDeathAt ?? 0) < DEATH_PAIN_COOLDOWN_MS) {
      return { next: state, granted: false, reason: '사망 고통 기운 5분 쿨타임 대기 중' };
    }
    state.lastPainDeathAt = now;
  }

  const curVal = state.energies[event.energy] || 0;
  state.energies[event.energy] = curVal + event.amount;

  const totals = computeAffinityTotals(state.energies);
  state.totals = totals;
  const { dominantAffinity, dominantValue } = computeDominantAffinity(totals);
  state.dominantAffinity = dominantAffinity;
  state.dominantValue = dominantValue;

  return { next: state, granted: true };
}

export function getShamanDialogueForAffinity(state?: AffinityState | null): string {
  if (!state) {
    return '자네 영혼 속 기운들이 아직 잠들어 있네. 걷고, 제련하고, 사냥하고, 축복을 베풀며 자네만의 길을 개척하게나.';
  }
  const { dominantAffinity, dominantValue } = state;
  if (!dominantAffinity || dominantValue < 30) {
    return '자네 영혼 속 기운들이 서서히 깨어나고 있네. 자연, 공학, 심연, 신성의 기운을 30 이상 축적하면 마을에 고유 오라가 피어날 걸세.';
  }
  if (dominantValue >= 250) {
    switch (dominantAffinity) {
      case 'nature':
        return '경이롭군! 대자연의 모든 숨결이 자네의 의지대로 춤을 추고 있네. 화면 끝까지 뻗는 채집력(+50m)이 온 대지를 감싸네.';
      case 'engineering':
        return '놀라워라... 톱니바퀴와 증기의 한계를 넘어섰군! 시속 60km의 고속 이동 속에서도 자네의 문명은 결코 멈추지 않을 걸세.';
      case 'death':
        return '죽음과 영혼의 심연을 정복한 자여! 이제 자네의 암흑 의식으로 전설의 [스컬 드래곤]을 각성시킬 준비가 되었네.';
      case 'divinity':
        return '태양과 풍요의 축복이 완성되었네! 자네의 거점은 100m로 넓어져 수많은 생명과 알을 품는 거대한 제국이 될 걸세.';
    }
  }
  if (dominantValue >= 100) {
    switch (dominantAffinity) {
      case 'nature':
        return '바람과 물, 불의 조화가 깊어졌네. 대자연의 공명으로 채집 사거리가 30m까지 확장되고 수확이 풍성해졌군.';
      case 'engineering':
        return '단단한 제련과 기계 지혜가 축적되었군! 시속 35km의 쾌속 주행 속에서도 GPS 개척이 완벽히 기록된다네.';
      case 'death':
        return '영혼의 속삭임이 짙어졌네. 밤과 동굴의 심연에서 희귀한 보물들이 30% 더 많이 자네의 손에 떨어질 걸세.';
      case 'divinity':
        return '신성한 연대와 결속이 빛을 발하네. 수호 펫이 4마리로 늘어나고 생명의 알이 20% 더 빠르게 부화하고 있네.';
    }
  }
  // Milestone 30+
  switch (dominantAffinity) {
    case 'nature':
      return '오호라... 자네에게서 대자연의 푸른 숨결이 뿜어져 나오는군! (채집 사거리 +15m 및 자연 오라 발현)';
    case 'engineering':
      return '강철을 두드리는 불꽃과 증기 기운이 깃들었네! (GPS 속도 22km/h 확장 및 공학 오라 발현)';
    case 'death':
      return '어둠과 시련 속에서 영혼을 담금질했군. (야간 드랍 +15% 및 심연 오라 발현)';
    case 'divinity':
      return '대지를 비추는 태양과 부족의 화합이 자네를 감싸네. (알 부화 -10% 및 황금 광채 발현)';
  }
}

export function getAffinityPerks(totals?: Record<AffinityId, number>) {
  const nature = totals?.nature ?? 0;
  const engineering = totals?.engineering ?? 0;
  const death = totals?.death ?? 0;
  const divinity = totals?.divinity ?? 0;

  return {
    speedLimitKmh: engineering >= 250 ? 60 : engineering >= 100 ? 35 : engineering >= 30 ? 22 : 16,
    extraReachM: nature >= 250 ? 50 : nature >= 100 ? 30 : nature >= 30 ? 15 : 0,
    nightDropBonusPct: death >= 100 ? 30 : death >= 30 ? 15 : 0,
    canSkullDragon: death >= 250,
    hatchDiscountPct: divinity >= 250 ? 30 : divinity >= 100 ? 20 : divinity >= 30 ? 10 : 0,
    maxGuardingPets: divinity >= 100 ? 4 : 3,
    baseRadiusM: divinity >= 250 ? 100 : 50,
  };
}
