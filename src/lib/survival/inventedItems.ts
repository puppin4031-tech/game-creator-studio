// Turns altar inventions into real item definitions so gear lookups (weapon/tool/armor/trinket) apply them in the world.
import { ITEMS, type ItemDef } from './items';
import { checkFacility, type InventionCategory } from './invention';
import type { Stack } from './types';

export interface InventedItem {
  id: string;           // inv_<hash digest>
  hash: string;
  name: string;
  desc: string;
  category: InventionCategory;
  materials: Record<string, number>;
  power: number;
  createdAt: number;
  heat?: boolean;
  sacred?: boolean;
  masterwork?: boolean;
  ranged?: boolean;
}

export const ALTAR_COST: Stack[] = [{ itemId: 'flint', count: 8 }, { itemId: 'obsidian', count: 3 }, { itemId: 'quartz', count: 4 }];
export const INVENTED_DURABILITY = 60;

export function inventionId(hash: string): string {
  let h = 2166136261;
  for (let i = 0; i < hash.length; i++) { h ^= hash.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `inv_${(h >>> 0).toString(36)}`;
}

/** Item stats derive only from the shared physics power, never from AI text. */
export function inventedItemDef(inv: InventedItem): ItemDef {
  const primary = Object.entries(inv.materials).sort((a, b) => b[1] - a[1])[0]?.[0];
  const sprite = (primary && ITEMS[primary as keyof typeof ITEMS]?.sprite) || ITEMS.flint.sprite;
  const weight = Math.min(5, Math.round(Object.entries(inv.materials).reduce((s, [id, q]) => s + (ITEMS[id as keyof typeof ITEMS]?.weight ?? 0.5) * q, 0) * 0.3 * 10) / 10);
  const base = { name: inv.name, desc: inv.desc, rarity: 'rare' as const, weight, sprite, durability: INVENTED_DURABILITY };
  switch (inv.category) {
    case 'weapon': return { ...base, category: 'weapon', weapon: { atk: Math.max(1, Math.round(inv.power)), ...(inv.ranged ? { ranged: true } : {}) } };
    case 'tool': { const tier = inv.power >= 2 ? 2 : 1; return { ...base, category: 'tool', tool: { chop: tier, mine: tier, power: 1 + inv.power } }; }
    case 'building': return { ...base, category: 'armor', armor: { def: Math.max(1, Math.round(inv.power / 3)) } };
    case 'relic': return { ...base, category: 'trinket', trinket: { lootBonus: inv.power, xpBonus: inv.power } };
  }
}

/** Register invented items into the runtime catalog (idempotent). */
export function registerInventions(list: InventedItem[] | undefined) {
  const table = ITEMS as Record<string, ItemDef>;
  for (const inv of list ?? []) {
    const check = checkFacility(inv, true);
    if (check.ok) table[inv.id] = inventedItemDef({ ...inv, power: check.power });
  }
}

export function fallbackInventionName(category: InventionCategory, materials: Record<string, number>): string {
  const primary = Object.entries(materials).sort((a, b) => b[1] - a[1])[0]?.[0];
  const mat = (primary && ITEMS[primary as keyof typeof ITEMS]?.name) || '돌';
  const noun = { tool: '도구', weapon: '창', building: '옷', relic: '부적' }[category];
  return `${mat} ${noun}`;
}
