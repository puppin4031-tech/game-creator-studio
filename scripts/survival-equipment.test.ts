import { describe, expect, test } from 'bun:test';
import { equipInSlot, resolveLoadout } from '../src/lib/survival/equipment';
import type { GearInstance } from '../src/lib/survival/types';

const g = (uid: string, itemId: string): GearInstance => ({ uid, itemId: itemId as GearInstance['itemId'], quality: 'NORMAL', durability: 10, maxDurability: 10 });
const gear = [g('a', 'hand_axe'), g('c', 'wooden_club'), g('s', 'flint_spear'), g('p', 'stone_pickaxe'), g('h', 'hide_armor')];

describe('equipment slots', () => {
  test('only one weapon is worn, best by default', () => {
    expect(resolveLoadout(gear, {}, 1).weapon?.uid).toBe('s');
  });
  test('level 1 has one tool slot, level 2 opens a second', () => {
    const l1 = resolveLoadout(gear, {}, 1);
    expect(l1.tool2).toBeNull();
    const l2 = resolveLoadout(gear, {}, 2);
    expect([l2.tool1?.uid, l2.tool2?.uid].sort()).toEqual(['a', 'p']);
  });
  test('armor locked before level 3', () => {
    expect(resolveLoadout(gear, {}, 2).armor).toBeNull();
    expect(resolveLoadout(gear, {}, 3).armor?.uid).toBe('h');
  });
  test('explicit choice and empty slot are respected', () => {
    expect(resolveLoadout(gear, equipInSlot({}, 'weapon', 'c'), 1).weapon?.uid).toBe('c');
    expect(resolveLoadout(gear, equipInSlot({}, 'weapon', null), 1).weapon).toBeNull();
  });
  test('a weapon cannot go in a tool slot', () => {
    expect(resolveLoadout(gear, { tool1: 'c' }, 1).tool1?.uid).not.toBe('c');
  });
});
