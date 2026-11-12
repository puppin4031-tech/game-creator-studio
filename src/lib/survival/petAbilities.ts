import { fusionSpecies, type OwnedPet } from './pets';

/** Unique ability per species: value at Lv.1 plus `step` per extra level. Keys are fusion species ids. */
export interface PetAbility { key: string; label: string; unit: string; base: number; step: number; desc?: string }

export const PET_ABILITIES: Record<string, PetAbility[]> = {
  terranox01: [{ key: 'bleed', label: '출혈 확률', unit: '%', base: 5, step: 10 }],
  archeron02: [{ key: 'walkKmh', label: '이동 인정 시속', unit: 'km', base: 18, step: 20, desc: '한계 상향' }],
  pteronox75: [{ key: 'vision', label: '시야 확보', unit: '%', base: 15, step: 10, desc: '밤낮 불문' }],
  carnotera92: [{ key: 'hp', label: '체력', unit: '', base: 10, step: 15 }],
  dracotera93: [{ key: 'attack', label: '공격력', unit: '', base: 5, step: 5 }],
  megalodi_x: [{ key: 'tribeAttack', label: '부족민 공격력', unit: '%', base: 10, step: 10 }],
  astraterix_10: [{ key: 'nightVision', label: '밤 시야', unit: '%', base: 10, step: 10 }, { key: 'gatherRange', label: '자원 습득 거리', unit: '%', base: 10, step: 10 }],
  neotera_11: [{ key: 'tribeSpeed', label: '부족민 이동속도', unit: '%', base: 10, step: 10 }, { key: 'rareOre', label: '희귀 광석 발견', unit: '%', base: 10, step: 10 }],
  ortenonxxi: [{ key: 'stun', label: '첫 타격 기절', unit: '초', base: 1, step: 0.5 }],
  balodon77: [{ key: 'aura', label: '받는 피해 감소', unit: '', base: 2, step: 2, desc: '동행 유저·부족민' }],
  faronoxtlg: [{ key: 'doubleHit', label: '추가 공격 확률', unit: '%', base: 40, step: 20 }],
  keratupsgt: [{ key: 'crit', label: 'x4 치명타 확률', unit: '%', base: 5, step: 5, desc: '유저·부족민' }],
  stagogon85: [{ key: 'regen', label: '5초마다 체력 회복', unit: '%', base: 5, step: 2, desc: '유저·부족민' }],
  brakoin102: [{ key: 'carryKg', label: '배낭 적재량', unit: 'kg', base: 30, step: 20 }],
  argotx: [{ key: 'reflect', label: '피해 반사', unit: '%', base: 15, step: 15 }],
  tetab1t: [{ key: 'doubleGather', label: '2배 채집 확률', unit: '%', base: 20, step: 15 }],
  pteranox050: [{ key: 'dive', label: '선제 급강하 (맹수 최대체력)', unit: '%', base: 8, step: 6 }],
  oriontl62: [{ key: 'rareLoot', label: '희귀 전리품 확률', unit: '%', base: 15, step: 15 }],
  baby_ptera: [{ key: 'hatchCut', label: '알 부화 거리 단축', unit: '%', base: 15, step: 10 }],
};

export const abilitiesFor = (speciesId: string): PetAbility[] => PET_ABILITIES[fusionSpecies(speciesId)] ?? [];
export const abilityBonus = (a: PetAbility, level: number) => a.step * Math.max(0, Math.floor(level) - 1);
export const abilityValue = (a: PetAbility, level: number) => a.base + abilityBonus(a, level);

const fmt = (n: number, unit: string) => `${Math.round(n * 10) / 10}${unit}`;
/** "출혈 확률 5% (+10%)" — base value plus clearly separated level bonus. */
export function abilityText(a: PetAbility, level: number): string {
  const bonus = abilityBonus(a, level);
  const sign = a.key === 'aura' ? '-' : '+';
  const head = a.unit === '' ? `${a.label} ${sign}${a.base}` : `${a.label} ${fmt(a.base, a.unit)}`;
  return bonus > 0 ? `${head} (${sign}${fmt(bonus, a.unit)})` : head;
}

/** Same species never stacks: only the highest-level pet of each species counts. Returns total value per ability key. */
export function activePetAbilities(pets: OwnedPet[]): Record<string, number> {
  const best = new Map<string, number>();
  for (const p of pets) {
    const s = fusionSpecies(p.speciesId);
    if (PET_ABILITIES[s]) best.set(s, Math.max(best.get(s) ?? 0, p.level));
  }
  const out: Record<string, number> = {};
  for (const [s, lv] of best) for (const a of PET_ABILITIES[s]) out[a.key] = (out[a.key] ?? 0) + abilityValue(a, lv);
  return out;
}

/** Terranox bleed: with `chancePct` probability adds 30% of the hit power (min 1) as bleed damage. */
export const BLEED_RATIO = 0.3;
export function bleedDamage(power: number, chancePct: number, roll: number = Math.random()): number {
  return chancePct > 0 && roll < chancePct / 100 ? Math.max(1, Math.round(power * BLEED_RATIO)) : 0;
}

/** Archeron raises (never lowers) the walking-credit speed limit. */
export const walkLimitKmh = (abilities: Record<string, number>, base: number) => Math.max(base, abilities.walkKmh ?? 0);

/** Stegoron: every 5 s heal `pct`% of max HP (min 1), capped at max. */
export const REGEN_INTERVAL_MS = 5000;
export function regenHp(hp: number, maxHp: number, pct: number): number {
  if (pct <= 0 || hp <= 0 || hp >= maxHp) return hp;
  return Math.min(maxHp, hp + Math.max(1, Math.round(maxHp * pct / 100)));
}
