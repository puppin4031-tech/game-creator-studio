import { describe, expect, test } from 'bun:test';
import { beastAggro, AGGRO_RADIUS_M } from '../src/lib/survival/combat';
import { skillDamage, skillCooldownMs, skillUpgradeCost, MAX_SKILL_LEVEL } from '../src/lib/survival/skillLevels';
import { inventedItemDef, inventionId } from '../src/lib/survival/inventedItems';
import { SOUND_REDUCTION } from '../src/lib/survival/gameSettings';

describe('beast aggro', () => {
  test('aggressive raptor strikes first inside 10m, not at 11m', () => {
    expect(AGGRO_RADIUS_M).toBe(10);
    expect(beastAggro('raptor', 10, { isNight: false, engaged: false, calm: false })).toBe(true);
    expect(beastAggro('raptor', 11, { isNight: false, engaged: false, calm: false })).toBe(false);
  });
  test('passive rabbit never attacks', () => {
    expect(beastAggro('rabbit', 1, { isNight: true, engaged: true, calm: false })).toBe(false);
  });
  test('engaged beast gives up beyond 25m', () => {
    expect(beastAggro('boar', 20, { isNight: false, engaged: true, calm: false })).toBe(true);
    expect(beastAggro('boar', 26, { isNight: false, engaged: true, calm: false })).toBe(false);
  });
});

describe('skill levels', () => {
  test('stone barrage Lv3 deals 40% more and cools 16% faster', () => {
    expect(skillDamage('stone_barrage', 3)).toBe(25);
    expect(skillCooldownMs('stone_barrage', 3)).toBe(10080);
  });
  test('no upgrade past max level', () => {
    expect(skillUpgradeCost(MAX_SKILL_LEVEL)).toBeNull();
  });
});

describe('inventions', () => {
  test('invented weapon attack equals rounded physics power', () => {
    const def = inventedItemDef({ id: inventionId('x'), hash: 'x', name: '흑요석 창', desc: '', category: 'weapon', materials: { obsidian: 3, cordage: 1 }, power: 12.4, createdAt: 0 });
    expect(def.weapon?.atk).toBe(12);
  });
});

test('sound is 30% quieter', () => { expect(SOUND_REDUCTION).toBe(0.7); });
