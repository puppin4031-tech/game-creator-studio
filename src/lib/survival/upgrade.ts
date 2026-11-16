// Altar reinforcement (+1..+5) and Primitive Armory weapon enhancement (+1..+10). Pure so UI, hook and tests share numbers.
import { ITEMS } from './items';
import type { GearInstance, Stack } from './types';

export const MAX_PLUS = 5;
export const MAX_ARMORY_PLUS = 10;
export const PLUS_STEP = 0.15;

export const gearMult = (g: GearInstance | null | undefined) => 1 + PLUS_STEP * Math.min(MAX_ARMORY_PLUS, g?.plus ?? 0);

export function upgradeCost(g: GearInstance): Stack[] | null {
  const plus = g.plus ?? 0;
  const d = ITEMS[g.itemId];
  if (!d || plus >= MAX_PLUS) return null;
  const n = plus + 1;
  if (d.weapon) return [{ itemId: 'flint', count: 2 * n }, { itemId: 'bone', count: n }];
  if (d.armor) return [{ itemId: 'hide', count: 2 * n }, { itemId: 'bone', count: n }];
  if (d.tool) return [{ itemId: 'flint', count: n + 1 }, { itemId: 'cordage', count: n }];
  if (d.trinket) return [{ itemId: 'quartz', count: n }, { itemId: 'ochre', count: n }];
  return null;
}

/** Primitive Armory weapon & tool enhancement cost for +1 through +10 using ore, bone, and hide/leather. */
export function armoryUpgradeCost(g: GearInstance): Stack[] | null {
  const plus = g.plus ?? 0;
  const d = ITEMS[g.itemId];
  if (!d || (!d.weapon && !d.tool) || plus >= MAX_ARMORY_PLUS) return null;
  const next = plus + 1;
  if (next <= 3) {
    return [
      { itemId: 'flint', count: next * 2 },
      { itemId: 'bone', count: next },
      { itemId: 'hide', count: 1 },
    ];
  }
  if (next <= 6) {
    return [
      { itemId: 'flint', count: next * 2 },
      { itemId: 'bone', count: next },
      { itemId: 'leather', count: Math.max(1, next - 3) },
    ];
  }
  return [
    { itemId: 'obsidian', count: Math.max(1, next - 6) },
    { itemId: 'bone', count: next },
    { itemId: 'leather', count: Math.max(2, next - 4) },
  ];
}

/** Success chance for +1..+10 enhancement (100% up to +3, tapering smoothly for high tiers). */
export function armorySuccessChance(currentPlus: number): number {
  if (currentPlus < 3) return 1.0;
  if (currentPlus < 5) return 0.85;
  if (currentPlus < 7) return 0.7;
  if (currentPlus < 9) return 0.55;
  return 0.4;
}

export function weaponAtkWithPlus(baseAtk: number, plus = 0): number {
  return Math.max(1, Math.round(baseAtk * (1 + PLUS_STEP * Math.min(MAX_ARMORY_PLUS, plus))));
}

export interface WeaponAuraStyle {
  tierName: string;
  ringClass: string;
  glowStyle: string;
  badgeClass: string;
}

export function weaponAuraForPlus(plus = 0): WeaponAuraStyle {
  if (plus >= 10) {
    return {
      tierName: '신화 태양광 오라',
      ringClass: 'ring-2 ring-amber-400 bg-amber-500/20 animate-pulse',
      glowStyle: '0 0 18px 4px rgba(251, 191, 36, 0.85), inset 0 0 8px rgba(245, 158, 11, 0.6)',
      badgeClass: 'bg-amber-500 text-black font-bold',
    };
  }
  if (plus >= 7) {
    return {
      tierName: '고대 자수정 오라',
      ringClass: 'ring-2 ring-purple-400 bg-purple-500/20',
      glowStyle: '0 0 14px 3px rgba(192, 132, 252, 0.75)',
      badgeClass: 'bg-purple-600 text-white font-bold',
    };
  }
  if (plus >= 4) {
    return {
      tierName: '서리 푸른 오라',
      ringClass: 'ring-2 ring-sky-400 bg-sky-500/15',
      glowStyle: '0 0 10px 2px rgba(56, 189, 248, 0.65)',
      badgeClass: 'bg-sky-600 text-white font-bold',
    };
  }
  if (plus >= 1) {
    return {
      tierName: '연마 녹빛 광택',
      ringClass: 'ring-1 ring-emerald-400 bg-emerald-500/10',
      glowStyle: '0 0 8px 1px rgba(52, 211, 153, 0.5)',
      badgeClass: 'bg-emerald-600 text-white',
    };
  }
  return {
    tierName: '일반',
    ringClass: 'border border-border bg-card',
    glowStyle: 'none',
    badgeClass: 'bg-muted text-muted-foreground',
  };
}
