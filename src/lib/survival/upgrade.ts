// Altar reinforcement (+1..+5) for any worn-type gear. Pure so UI, hook and tests share numbers.
import { ITEMS } from './items';
import type { GearInstance, Stack } from './types';

export const MAX_PLUS = 5;
export const PLUS_STEP = 0.15;

export const gearMult = (g: GearInstance | null | undefined) => 1 + PLUS_STEP * Math.min(MAX_PLUS, g?.plus ?? 0);

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
