import { describe, expect, test } from 'bun:test';
import { reforgePower, STAT_CAP, REFORGE_SLOTS } from '../src/lib/survival/invention';
import { gearBasePower, gearCategory, inventedItemDef } from '../src/lib/survival/inventedItems';
import { ITEMS } from '../src/lib/survival/items';

describe('altar reforging', () => {
  test('reforged gear is always at least 10% stronger than the base', () => {
    expect(reforgePower('weapon', 10, 0)).toBe(11);
    expect(reforgePower('weapon', 10, 8)).toBe(14);
  });
  test('reforge power is capped at 125% of the category cap', () => {
    expect(reforgePower('weapon', 100, 24)).toBe(STAT_CAP.weapon * 1.25);
  });
  test('at most three catalysts', () => { expect(REFORGE_SLOTS).toBe(3); });
  test('gear maps to its reforge category', () => {
    expect(gearCategory(ITEMS.hand_axe)).toBe('tool');
    expect(gearBasePower(ITEMS.hand_axe)).toBe(0);
  });
  test('reforged tools keep their gathering tier', () => {
    const def = inventedItemDef({ id: 'inv_x', hash: 'x', name: 't', desc: '', category: 'tool', materials: { flint: 1 }, power: 0.5, createdAt: 0, baseTier: 3 });
    expect(def.tool?.mine).toBe(3);
  });
});
