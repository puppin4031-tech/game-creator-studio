// Tech level rules (pure): re-researching a known tech raises its level, and
// combat/vital techs scale real stats with that level. Shared by the hook,
// the research queue and tests.
import type { Stack } from './types';
import { techById } from './tech';

export const MAX_TECH_LEVEL = 5;

export function techLevel(levels: Record<string, number> | undefined, id: string): number {
  return Math.min(MAX_TECH_LEVEL, Math.max(1, Math.floor(levels?.[id] ?? 1)));
}

/** Book-only combat techs get a material cost for level-ups (first learn stays via skill book). */
const LEVEL_UP_COSTS: Record<string, Stack[]> = {
  primal_strike: [{ itemId: 'bone', count: 4 }, { itemId: 'ancient_fang', count: 1 }],
  iron_skin: [{ itemId: 'hide', count: 4 }, { itemId: 'resin', count: 2 }],
};

/** Materials to research from `level` to `level + 1`; null when maxed or not researchable. */
export function techUpgradeCost(techId: string, level: number): Stack[] | null {
  if (level >= MAX_TECH_LEVEL) return null;
  const base = techById(techId)?.research ?? LEVEL_UP_COSTS[techId];
  if (!base) return null;
  return base.map((s) => ({ itemId: s.itemId, count: s.count * level }));
}

// ---- Stat bonuses per tech level (level 1 = first learn) ----

/** 원시 일격: attack multiplier. Lv1 ×1.3 … Lv5 ×1.7. */
export const primalStrikeMult = (level: number) => 1.3 + 0.1 * (level - 1);
/** 바위 피부: flat damage reduction. Lv1 -2 … Lv5 -6. */
export const ironSkinDef = (level: number) => 2 + (level - 1);
/** 거대 심장: max HP bonus. Lv1 +10 … Lv5 +50. */
export const giantHeartHpBonus = (level: number) => 10 * level;
/** 야생 활력: extra HP per tick while resting at a base or sanctuary. Lv1 +1 … Lv5 +5. */
export const wildVitalityRegenBonus = (level: number) => level;
/** 습득 범위 향상 (long_reach): extra reach radius bonus in meters.
 * Lv1: +10m (25m → 35m, dino eggs 20m → 30m)
 * Lv2: +20m (25m → 45m, dino eggs 20m → 40m)
 * Lv3: +30m (25m → 55m, dino eggs 20m → 50m)
 * Lv4: +40m (25m → 65m, dino eggs 20m → 60m)
 * Lv5: +50m (25m → 75m, dino eggs 20m → 70m)
 */
export const longReachBonus = (level: number) => 10 * level;
