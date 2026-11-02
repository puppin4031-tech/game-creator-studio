import { expect, test } from 'bun:test';
import { CREATURE_ATTACK_INTERVAL_MS, resolveCreatureHit, rollLoot } from '../src/lib/survival/combat';
import { CREATURES } from '../src/lib/survival/entities';

test('a surviving beast retaliates after a player hit', () => {
  expect(resolveCreatureHit('boar', 0, 3, 0, false)).toEqual({ dealt: 3, remainingHp: 21, defeated: false, counterDamage: 4 });
});
test('even a surviving rabbit retaliates', () => {
  expect(resolveCreatureHit('rabbit', 0, 3, 0, false).counterDamage).toBe(1);
});
test('a defeated beast cannot retaliate', () => {
  expect(resolveCreatureHit('boar', 21, 3, 0, false).counterDamage).toBe(0);
});
test('armor reduces retaliation with a one-point minimum', () => {
  expect(resolveCreatureHit('wolf', 0, 3, 2, false).counterDamage).toBe(3);
  expect(resolveCreatureHit('wolf', 0, 3, 20, false).counterDamage).toBe(1);
});
test('the first ranged hit avoids retaliation', () => {
  expect(resolveCreatureHit('wolf', 0, 7, 0, true).counterDamage).toBe(0);
  expect(resolveCreatureHit('wolf', 7, 7, 0, false).counterDamage).toBe(5);
});
test('beast attacks have a 900ms interval', () => {
  expect(CREATURE_ATTACK_INTERVAL_MS).toBe(900);
});
test('ordinary and boss stats use the tuned difficulty curve', () => {
  expect(Object.values(CREATURES).map(c => [c.hp, c.atk])).toEqual([[6, 1], [24, 4], [24, 5], [36, 7], [90, 10], [72, 9], [160, 12]]);
});
test('rabbit hide probability is 60%, not a second zero-count roll', () => {
  const hide = CREATURES.rabbit.loot[1];
  expect(rollLoot([hide], () => 0.599)).toEqual([{ itemId: 'hide', count: 1 }]);
  expect(rollLoot([hide], () => 0.6)).toEqual([]);
});
test('boss books use their configured probability exactly', () => {
  for (const [type, item, chance] of [['boss_direwolf', 'tome_primal_strike', 0.2], ['boss_mammoth', 'tome_iron_skin', 0.25]] as const) {
    const entry = CREATURES[type].loot.find(l => l.itemId === item);
    if (!entry) throw new Error('Missing skill book');
    expect(entry.chance).toBe(chance);
    expect(rollLoot([entry], () => chance - 0.001)).toEqual([{ itemId: item, count: 1 }]);
    expect(rollLoot([entry], () => chance)).toEqual([]);
  }
});