import { ITEMS, ITEM_IDS, type ItemId } from './items';
import type { GearInstance, Stack } from './types';

const ORDER = new Map(ITEM_IDS.map((id, i) => [id, i]));

const round1 = (n: number) => Math.round(n * 10) / 10;

export const stackWeight = (stacks: Stack[]) => round1(stacks.reduce((s, x) => s + ITEMS[x.itemId].weight * x.count, 0));
export const gearWeight = (gear: GearInstance[]) => round1(gear.reduce((s, g) => s + ITEMS[g.itemId].weight, 0));
export const countOf = (stacks: Stack[], id: ItemId) => stacks.find((s) => s.itemId === id)?.count ?? 0;

/** Merge stacks (pure), keeping catalogue order and dropping empties. */
export function addStacks(base: Stack[], add: Stack[]): Stack[] {
  const map = new Map<ItemId, number>();
  for (const s of base) map.set(s.itemId, (map.get(s.itemId) ?? 0) + s.count);
  for (const s of add) map.set(s.itemId, (map.get(s.itemId) ?? 0) + s.count);
  return [...map.entries()]
    .filter(([, c]) => c > 0)
    .sort((a, b) => (ORDER.get(a[0]) ?? 0) - (ORDER.get(b[0]) ?? 0))
    .map(([itemId, count]) => ({ itemId, count }));
}

export const hasAll = (stacks: Stack[], need: Stack[]) => need.every((n) => countOf(stacks, n.itemId) >= n.count);

/** Remove stacks; returns null when anything is missing. */
export function removeStacks(base: Stack[], remove: Stack[]): Stack[] | null {
  if (!hasAll(base, remove)) return null;
  return addStacks(base, remove.map((r) => ({ itemId: r.itemId, count: -r.count })));
}

/** Split incoming stacks into what fits into `freeKg` and what overflows (unit by unit, in order). */
export function splitByCapacity(add: Stack[], freeKg: number): { fit: Stack[]; overflow: Stack[] } {
  let free = freeKg + 1e-9;
  const fit: Stack[] = [];
  const overflow: Stack[] = [];
  for (const s of add) {
    const w = ITEMS[s.itemId].weight;
    const n = w <= 0 ? s.count : Math.max(0, Math.min(s.count, Math.floor(free / w)));
    if (n > 0) fit.push({ itemId: s.itemId, count: n });
    if (s.count - n > 0) overflow.push({ itemId: s.itemId, count: s.count - n });
    free -= n * w;
  }
  return { fit, overflow };
}

/** Portion of every stack lost on death. 10 → 3 lost, 1 → 0 lost. */
export function splitDeathDrop(stacks: Stack[], ratio: number): { kept: Stack[]; dropped: Stack[] } {
  const kept: Stack[] = [];
  const dropped: Stack[] = [];
  for (const s of stacks) {
    const lost = Math.min(s.count, Math.round(s.count * ratio));
    if (s.count - lost > 0) kept.push({ itemId: s.itemId, count: s.count - lost });
    if (lost > 0) dropped.push({ itemId: s.itemId, count: lost });
  }
  return { kept, dropped };
}

/** Apply a shipping fee: each stack keeps floor(count × (1 − fee)). */
export function applyFee(stacks: Stack[], fee: number): { delivered: Stack[]; lost: number } {
  let lost = 0;
  const delivered: Stack[] = [];
  for (const s of stacks) {
    const n = Math.floor(s.count * (1 - fee));
    lost += s.count - n;
    if (n > 0) delivered.push({ itemId: s.itemId, count: n });
  }
  return { delivered, lost };
}

export const totalUnits = (stacks: Stack[]) => stacks.reduce((s, x) => s + x.count, 0);
