import { BASE_LEVELS } from './bases';
import { classDef } from './classes';
import { SURVIVAL_CONFIG as C, QUALITY_MULT } from './config';
import { distanceM } from './geo';
import { gearWeight, stackWeight } from './inventory';
import { ITEMS } from './items';
import type { EquipSlot, GameEvent, GearInstance, SurvivalState } from './types';

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

export const DAY_PHASE_LABEL: Record<DayPhase, string> = { dawn: '새벽', day: '낮', dusk: '해질녘', night: '밤' };

/** Day/night follows the player's real local clock. */
export function dayPhase(d: Date): DayPhase {
  const h = d.getHours();
  if (h >= 5 && h < 7) return 'dawn';
  if (h >= 7 && h < 18) return 'day';
  if (h >= 18 && h < 20) return 'dusk';
  return 'night';
}

export const xpToNext = (level: number) => Math.round(40 * Math.pow(level, 1.6));

export function addExperience(progress: { level: number; xp: number }, amount: number) {
  let { level, xp } = progress;
  xp += Math.max(0, Math.round(amount));
  while (xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level += 1;
  }
  return { level, xp };
}

export const maxHp = (s: SurvivalState) => C.baseMaxHp + (s.player.level - 1) * C.hpPerLevel;

export const carryCapacity = (s: SurvivalState) =>
  C.baseCarryKg + (s.player.level - 1) * C.carryPerLevelKg + classDef(s.player.classId).carryBonusKg;

export const carriedWeight = (s: SurvivalState) => Math.round((stackWeight(s.backpack) + gearWeight(s.gear)) * 10) / 10;

export const freeCapacity = (s: SurvivalState) => Math.max(0, carryCapacity(s) - carriedWeight(s));

export const baseLevelDef = (s: SurvivalState) => (s.base ? BASE_LEVELS[s.base.level] : null);

export const baseRadius = (s: SurvivalState) => baseLevelDef(s)?.radiusM ?? 0;

export const distToBase = (s: SurvivalState) => (s.base ? distanceM(s.pos, s.base) : Infinity);

export const isInBase = (s: SurvivalState) => !!s.base && distToBase(s) <= baseRadius(s);

export const distToOutpost = (s: SurvivalState) => (s.outpost ? distanceM(s.pos, s.outpost) : Infinity);

export const isAtOutpost = (s: SurvivalState) => !!s.outpost && distToOutpost(s) <= C.outpostRadiusM;

export function equippedGear(s: SurvivalState, slot: EquipSlot): GearInstance | null {
  const uid = s.equipped[slot];
  return uid ? s.gear.find((g) => g.uid === uid) ?? null : null;
}

/** Best usable tool for a requirement (auto-selected from carried gear). */
export function bestTool(s: SurvivalState, kind: 'chop' | 'mine', tier: number): GearInstance | null {
  let best: GearInstance | null = null;
  let bestScore = -1;
  for (const g of s.gear) {
    const t = ITEMS[g.itemId].tool;
    if (!t || t[kind] < tier) continue;
    const score = t.power * QUALITY_MULT[g.quality];
    if (score > bestScore) { best = g; bestScore = score; }
  }
  return best;
}

export function toolPower(g: GearInstance | null) {
  if (!g) return 1;
  const t = ITEMS[g.itemId].tool;
  return t ? t.power * QUALITY_MULT[g.quality] : 1;
}

export function weaponAtk(s: SurvivalState) {
  const w = equippedGear(s, 'weapon');
  const base = w ? (ITEMS[w.itemId].weapon?.atk ?? C.fistAtk) * QUALITY_MULT[w.quality] : C.fistAtk;
  return Math.max(1, Math.round(base * classDef(s.player.classId).atkMult));
}

export function isRangedWeapon(s: SurvivalState) {
  const w = equippedGear(s, 'weapon');
  return !!(w && ITEMS[w.itemId].weapon?.ranged);
}

export function armorDef(s: SurvivalState) {
  const a = equippedGear(s, 'armor');
  return a ? Math.round((ITEMS[a.itemId].armor?.def ?? 0) * QUALITY_MULT[a.quality]) : 0;
}

export function trinketBonus(s: SurvivalState) {
  const t = equippedGear(s, 'trinket');
  const b = t ? ITEMS[t.itemId].trinket : undefined;
  return { lootBonus: b?.lootBonus ?? 0, xpBonus: b?.xpBonus ?? 0 };
}

export const critChance = (s: SurvivalState) => C.critChance + classDef(s.player.classId).critBonus;

export const visionRadius = (s: SurvivalState, isNight: boolean) =>
  Math.round((isNight ? C.visionNightM : C.visionDayM) * classDef(s.player.classId).visionMult);

export const scanCooldownMs = (s: SurvivalState) => Math.round(C.scanCooldownMs * classDef(s.player.classId).scanCooldownMult);

/** Mutates a draft: grants XP and handles level-ups. */
export function grantXp(draft: SurvivalState, amount: number, events: GameEvent[]) {
  const gained = Math.round(amount * (1 + trinketBonus(draft).xpBonus));
  draft.player.xp += gained;
  while (draft.player.xp >= xpToNext(draft.player.level)) {
    draft.player.xp -= xpToNext(draft.player.level);
    draft.player.level += 1;
    draft.player.hp = Math.min(maxHp(draft), draft.player.hp + 20);
    events.push({ tone: 'level', message: `레벨 ${draft.player.level} 달성! 최대 체력 +${C.hpPerLevel}, 배낭 +${C.carryPerLevelKg}kg` });
  }
  return gained;
}
