// Equipment slots: one item per slot, unlocked by player level. Pure so tests and the hook share rules.
import { ITEMS, type ItemCategory } from './items';
import type { GearInstance } from './types';

export type GearSlot = 'weapon' | 'tool1' | 'tool2' | 'armor' | 'trinket';
export interface SlotDef { id: GearSlot; label: string; unlockLevel: number; category: ItemCategory }

export const GEAR_SLOTS: SlotDef[] = [
  { id: 'weapon', label: '무기', unlockLevel: 1, category: 'weapon' },
  { id: 'tool1', label: '채집 도구 1', unlockLevel: 1, category: 'tool' },
  { id: 'tool2', label: '채집 도구 2', unlockLevel: 2, category: 'tool' },
  { id: 'armor', label: '방어구', unlockLevel: 3, category: 'armor' },
  { id: 'trinket', label: '부적', unlockLevel: 5, category: 'trinket' },
];

/** Saved choice per slot: uid = worn, '' = deliberately empty, absent = auto-pick best. */
export type Equipped = Partial<Record<GearSlot, string>>;
export type Loadout = Record<GearSlot, GearInstance | null>;

const score = (g: GearInstance) => {
  const d = ITEMS[g.itemId];
  if (d.weapon) return d.weapon.atk;
  if (d.armor) return d.armor.def;
  if (d.tool) return d.tool.power + d.tool.chop + d.tool.mine;
  return d.trinket ? d.trinket.lootBonus + d.trinket.xpBonus : 0;
};

export const slotUnlocked = (slot: SlotDef, level: number) => level >= slot.unlockLevel;

export function resolveLoadout(gear: GearInstance[], equipped: Equipped | undefined, level: number): Loadout {
  const out = { weapon: null, tool1: null, tool2: null, armor: null, trinket: null } as Loadout;
  const used = new Set<string>();
  const fits = (g: GearInstance, s: SlotDef) => ITEMS[g.itemId]?.category === s.category;
  // Explicit choices first so auto-fill never steals a chosen item.
  for (const s of GEAR_SLOTS) {
    const uid = equipped?.[s.id];
    if (!slotUnlocked(s, level) || !uid) continue;
    const g = gear.find(x => x.uid === uid);
    if (g && fits(g, s) && !used.has(g.uid)) { out[s.id] = g; used.add(g.uid); }
  }
  for (const s of GEAR_SLOTS) {
    if (!slotUnlocked(s, level) || out[s.id] || equipped?.[s.id] === '') continue;
    const best = gear.filter(g => fits(g, s) && !used.has(g.uid)).sort((a, b) => score(b) - score(a))[0];
    if (best) { out[s.id] = best; used.add(best.uid); }
  }
  return out;
}

/** Wear uid in slot (moves it out of any other slot); null empties the slot. */
export function equipInSlot(equipped: Equipped | undefined, slot: GearSlot, uid: string | null): Equipped {
  const next: Equipped = { ...(equipped ?? {}) };
  if (uid) for (const k of Object.keys(next) as GearSlot[]) if (next[k] === uid) next[k] = '';
  next[slot] = uid ?? '';
  return next;
}
