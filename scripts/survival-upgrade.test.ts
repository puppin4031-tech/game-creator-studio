import { describe, expect, it } from 'bun:test';
import { gearMult, upgradeCost, MAX_PLUS } from '../src/lib/survival/upgrade';
import { matchBlueprint, BLUEPRINTS } from '../src/lib/survival/blueprints';
import { checkFacility } from '../src/lib/survival/invention';
import { inventedItemDef } from '../src/lib/survival/inventedItems';
import type { GearInstance } from '../src/lib/survival/types';

const g = (itemId: string, plus = 0) => ({ uid: 'u', itemId, quality: 'NORMAL', durability: 10, maxDurability: 10, plus }) as GearInstance;

describe('altar upgrade', () => {
  it('adds 15% per level', () => { expect(gearMult(g('flint', 2))).toBeCloseTo(1.3); });
  it('stops at +5', () => { expect(upgradeCost(g('jade_amulet', MAX_PLUS))).toBeNull(); });
  it('trinket upgrade costs quartz', () => { expect(upgradeCost(g('jade_amulet', 0))?.[0].itemId).toBe('quartz'); });
});
describe('blueprints', () => {
  it('every example is a valid altar combination', () => { for (const b of BLUEPRINTS) expect(checkFacility({ category: b.category, materials: b.materials }, true).ok).toBe(true); });
  it('fur coat combo is named as armor', () => { expect(matchBlueprint('building', { frost_pelt: 5, leather: 2, bone: 1 })?.name).toBe('겨울 방한 털옷'); });
  it('armor example gives defense 5', () => {
    const c = checkFacility({ category: 'building', materials: { leather: 4, hide: 2, bone: 2 } }, true);
    if (!c.ok) throw new Error();
    expect(inventedItemDef({ id: 'x', hash: c.hash, name: 'a', desc: '', category: 'building', materials: {}, power: c.power, createdAt: 0 }).armor?.def).toBe(5);
  });
});
