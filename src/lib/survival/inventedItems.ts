// Turns altar inventions into real item definitions so gear lookups (weapon/tool/armor/trinket) apply them in the world.
import { ITEMS, type ItemDef } from './items';
import { checkFacility, reforgePower, type InventionCategory, type ReforgeGrade } from './invention';
import type { Stack } from './types';
import type { SpriteKey } from './spriteMeta';

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
  /** Reforged items: stat power of the gear that was melted down, and its item id. */
  basePower?: number;
  reforgedFrom?: string;
  analysis?: string;
  /** Highest chop/mine tier of the reforged tool, so reforging never loses gathering ability. */
  baseTier?: number;
  /** Reforge outcome grade; multiplies reforged power. */
  grade?: ReforgeGrade;
  /** Custom intent mechanics awarded during crafting. */
  customMechanics?: string[];
  physics?: {
    elasticity: number;
    durability: number;
    weatherResist: number;
    density: number;
  };
}

export const ALTAR_COST: Stack[] = [{ itemId: 'flint', count: 8 }, { itemId: 'obsidian', count: 3 }, { itemId: 'quartz', count: 4 }];
export const INVENTED_DURABILITY = 60;

export function inventionId(hash: string): string {
  let h = 2166136261;
  for (let i = 0; i < hash.length; i++) { h ^= hash.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `inv_${(h >>> 0).toString(36)}`;
}

const has = (m: Record<string, number>, ...ids: string[]) => ids.some(id => (m[id] ?? 0) > 0);
/** Icon always comes from the gear family of its category, picked by the defining material. */
export function inventedSprite(inv: Pick<InventedItem, 'category' | 'materials' | 'ranged'>): SpriteKey {
  const m = inv.materials;
  switch (inv.category) {
    case 'weapon':
      if (inv.ranged) {
        if (has(m, 'steel_ingot')) return 'item-steel-spear';
        if (has(m, 'iron_ingot')) return 'item-iron-spear';
        if (has(m, 'copper_ingot', 'bronze_ingot')) return 'item-bronze-spear';
        if (has(m, 'sinew', 'prime_pelt')) return 'item-composite-bow';
        if (has(m, 'bone', 'tusk')) return 'item-bone-harpoon';
        return has(m, 'bone', 'tusk') ? 'item-bone-bow' : 'item-sling';
      }
      if (has(m, 'steel_ingot')) return 'item-steel-sword';
      if (has(m, 'iron_ingot')) return 'item-iron-sword';
      if (has(m, 'copper_ingot', 'bronze_ingot')) return 'item-bronze-sword';
      if (has(m, 'obsidian')) return 'item-obsidian-dagger';
      if (has(m, 'frost_shard', 'ancient_fang')) return 'item-obsidian-spear';
      if (has(m, 'flint', 'quartz')) return 'item-flint-spear';
      if (has(m, 'log', 'tusk', 'clay_pot')) return 'item-heavy-club';
      if (has(m, 'bone')) return 'item-bone-dagger';
      return 'item-wooden-club';
    case 'tool':
      if (has(m, 'steel_ingot')) return has(m, 'log', 'branch') ? 'item-steel-axe' : 'item-steel-pickaxe';
      if (has(m, 'iron_ingot')) return has(m, 'log', 'branch') ? 'item-iron-axe' : 'item-iron-pickaxe';
      if (has(m, 'copper_ingot', 'bronze_ingot')) return has(m, 'log', 'branch') ? 'item-bronze-axe' : 'item-bronze-pickaxe';
      if (has(m, 'bone_needle', 'sinew')) return 'item-bone-needle';
      if (has(m, 'stone', 'flint', 'limestone')) return 'item-stone-chisel';
      if (has(m, 'obsidian', 'frost_shard')) return 'item-obsidian-pickaxe';
      if (has(m, 'bone', 'tusk')) return 'item-bone-pick';
      if (has(m, 'flint', 'quartz')) return 'item-flint-hatchet';
      if (has(m, 'clay', 'clay_pot', 'soil')) return 'item-digging-stick';
      return 'item-hand-axe';
    case 'building':
      if (has(m, 'steel_ingot', 'iron_ingot')) return 'item-iron-shield';
      if (has(m, 'copper_ingot', 'bronze_ingot')) return 'item-bronze-shield';
      if (has(m, 'stone', 'flint', 'obsidian')) return 'item-stone-shield';
      if (has(m, 'dragon_scale', 'alpha_heart')) return 'item-dragon-scale';
      if (has(m, 'frost_pelt', 'prime_pelt')) return 'item-fur-cloak';
      if (has(m, 'bone', 'tusk', 'jade')) return 'item-bone-plate';
      if (has(m, 'hide', 'leather')) return 'item-hide-armor';
      return 'item-bark-vest';
    case 'relic':
      if (has(m, 'ruby')) return 'item-ruby';
      if (has(m, 'sapphire')) return 'item-sapphire';
      if (has(m, 'emerald')) return 'item-emerald';
      if (has(m, 'amber')) return 'item-amber';
      if (has(m, 'fossil')) return 'item-fossil';
      if (has(m, 'dragon_scale')) return 'item-dragon-scale';
      if (has(m, 'jade')) return 'item-jade-amulet';
      if (has(m, 'quartz', 'frost_shard')) return 'item-quartz-charm';
      return 'item-bone-charm';
  }
}

/** Item stats derive only from the shared physics power, never from AI text. */
export function inventedItemDef(inv: InventedItem): ItemDef {
  const sprite = inventedSprite(inv);
  const weight = Math.min(5, Math.round(Object.entries(inv.materials).reduce((s, [id, q]) => s + (ITEMS[id as keyof typeof ITEMS]?.weight ?? 0.5) * q, 0) * 0.3 * 10) / 10);
  const prefix = inv.grade === 'legend' ? '[레전드] ' : inv.grade === 'masterwork' ? '[명품] ' : '';
  const base = {
    name: prefix + inv.name,
    desc: inv.desc,
    rarity: (inv.grade === 'legend' ? 'epic' : 'rare') as 'epic' | 'rare',
    weight,
    sprite,
    durability: INVENTED_DURABILITY,
    mechanics: inv.customMechanics,
    physics: inv.physics,
  };
  switch (inv.category) {
    case 'weapon': {
      const isRanged = inv.ranged || inv.customMechanics?.includes('RANGED_SNIPE');
      return { ...base, category: 'weapon', weapon: { atk: Math.max(1, Math.round(inv.power)), ...(isRanged ? { ranged: true } : {}) } };
    }
    case 'tool': { const tier = Math.max(inv.power >= 2 ? 2 : 1, inv.baseTier ?? 0); return { ...base, category: 'tool', tool: { chop: tier, mine: tier, power: 1 + inv.power } }; }
    case 'building': return { ...base, category: 'armor', armor: { def: Math.max(1, Math.round(inv.power / 3)) } };
    case 'relic': return { ...base, category: 'trinket', trinket: { lootBonus: inv.power, xpBonus: inv.power } };
  }
}

/** Register invented items into the runtime catalog (idempotent). */
export function registerInventions(list: InventedItem[] | undefined) {
  const table = ITEMS as Record<string, ItemDef>;
  for (const inv of list ?? []) {
    if (inv.customMechanics && inv.customMechanics.length > 0) {
      table[inv.id] = inventedItemDef(inv);
      continue;
    }
    const check = checkFacility(inv, true);
    if (!check.ok) continue;
    const power = inv.basePower != null ? reforgePower(inv.category, inv.basePower, check.power, inv.grade) : check.power;
    table[inv.id] = inventedItemDef({ ...inv, power });
  }
}

export function fallbackInventionName(category: InventionCategory, materials: Record<string, number>): string {
  const primary = Object.entries(materials).sort((a, b) => b[1] - a[1])[0]?.[0];
  const mat = (primary && ITEMS[primary as keyof typeof ITEMS]?.name) || '돌';
  const noun = { tool: '도구', weapon: '창', building: '옷', relic: '부적' }[category];
  return `${mat} ${noun}`;
}

/** Category an existing gear item reforges into, or null when it is not gear. */
export function gearCategory(def: ItemDef | undefined): InventionCategory | null {
  if (!def) return null;
  if (def.weapon) return 'weapon';
  if (def.armor) return 'building';
  if (def.tool) return 'tool';
  if (def.trinket) return 'relic';
  return null;
}
/** Converts an item's stats back to invention power units (inverse of inventedItemDef). */
export function gearBasePower(def: ItemDef | undefined): number {
  if (!def) return 0;
  if (def.weapon) return def.weapon.atk;
  if (def.armor) return def.armor.def * 3;
  if (def.tool) return Math.max(0, (def.tool.power ?? 1) - 1);
  if (def.trinket) return def.trinket.lootBonus ?? def.trinket.xpBonus ?? 0;
  return 0;
}
