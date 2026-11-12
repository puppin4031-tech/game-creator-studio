import { expect, test } from 'bun:test';
import { bleedDamage, regenHp, walkLimitKmh } from '../src/lib/survival/petAbilities';
import { isWalkingPace } from '../src/lib/survival/walkPace';

test('terranox bleed adds 30% of power only when roll is under chance', () => {
  expect(bleedDamage(20, 5, 0.04)).toBe(6);
  expect(bleedDamage(20, 5, 0.05)).toBe(0);
});
test('archeron Lv.2 counts 30 km/h as walking, default does not', () => {
  const lim = walkLimitKmh({ walkKmh: 38 }, 13);
  expect(isWalkingPace(30 / 3.6, 1000, lim)).toBe(true);
  expect(isWalkingPace(30 / 3.6, 1000)).toBe(false);
});
test('stegoron heals 5% of max hp, capped', () => {
  expect(regenHp(50, 100, 5)).toBe(55);
  expect(regenHp(98, 100, 5)).toBe(100);
  expect(regenHp(0, 100, 5)).toBe(0);
});
