// Active skill upgrade rules (pure): each level boosts damage and shortens cooldown.
import { ACTIVE_SKILLS, type ActiveSkill } from './abilities';
import type { Stack } from './types';

export const MAX_SKILL_LEVEL = 5;
export const DAMAGE_PER_LEVEL = 0.2;
export const COOLDOWN_CUT_PER_LEVEL = 0.08;

export function skillLevel(levels: Record<string, number> | undefined, id: ActiveSkill): number {
  return Math.min(MAX_SKILL_LEVEL, Math.max(1, Math.floor(levels?.[id] ?? 1)));
}
export function skillDamage(id: ActiveSkill, level: number): number {
  return Math.round(ACTIVE_SKILLS[id].damage * (1 + DAMAGE_PER_LEVEL * (level - 1)));
}
export function skillCooldownMs(id: ActiveSkill, level: number): number {
  return Math.round(ACTIVE_SKILLS[id].cooldownMs * (1 - COOLDOWN_CUT_PER_LEVEL * (level - 1)));
}
/** Cost to go from `level` to `level + 1`; null at max. */
export function skillUpgradeCost(level: number): Stack[] | null {
  if (level >= MAX_SKILL_LEVEL) return null;
  return [{ itemId: 'flint', count: 2 * level }, { itemId: 'bone', count: level }];
}
