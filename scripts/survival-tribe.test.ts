import { expect, test } from 'bun:test';
import { tribeHireCost, TRIBE_RATIO, settleUpkeep, upkeepDemand } from '../src/lib/survival/mercenaries';

test('first recruit costs raw meat 3, fur 1, apple 2', () => {
  expect(tribeHireCost(0)).toEqual([{ itemId: 'raw_meat', count: 3 }, { itemId: 'fur', count: 1 }, { itemId: 'apple', count: 2 }]);
});
test('second recruit costs cooked meat 2, flint 5, clay 5', () => {
  expect(tribeHireCost(1)).toEqual([{ itemId: 'cooked_meat', count: 2 }, { itemId: 'flint', count: 5 }, { itemId: 'clay', count: 5 }]);
});
test('tribe cap is 10', () => { expect(tribeHireCost(10)).toBeNull(); });
test('tribe stats are one sixth of the player', () => { expect(TRIBE_RATIO).toBeCloseTo(1 / 6); });
test('tribe eats fruit and cooked meat; missing food starves', () => {
  const r = settleUpkeep([{ itemId: 'apple', count: 1 }, { itemId: 'cooked_meat', count: 1 }], upkeepDemand(1, 0, 0), 1);
  expect(r.storage).toEqual([]); expect(r.starving).toBe(false);
  expect(settleUpkeep([], upkeepDemand(1, 0, 0), 1).starving).toBe(true);
});
import { escortAmbushDamage, escortReady } from '../src/lib/survival/mercenaries';
test('escort blocks ambush on low roll, halves otherwise', () => {
  expect(escortAmbushDamage(10, 0.1)).toBe(0);
  expect(escortAmbushDamage(10, 0.9)).toBe(5);
});
test('escort not ready while injured or on expedition', () => {
  const t = { count: 1, trainLevel: 0, escort: true };
  expect(escortReady(t, 0, false)).toBe(true);
  expect(escortReady(t, 0, true)).toBe(false);
  expect(escortReady({ ...t, injuredUntil: 100 }, 0, false)).toBe(false);
});
